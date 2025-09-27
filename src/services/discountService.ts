interface Discount {
  id?: number;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_order_value?: number;
  max_discount_amount?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  usage_limit?: number;
  usage_count: number;
  code?: string;
  created_at?: string;
  updated_at?: string;
}

interface DiscountApplication {
  discount: Discount;
  discountAmount: number;
  finalPrice: number;
  isValid: boolean;
  reason?: string;
}

// Новые интерфейсы для системы фиктивных цен и таймеров
export interface FakeDiscountConfiguration {
  id: string;
  name: string;
  percentage: number; // Процент скидки (0-100)
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface PriceWithFakeDiscount {
  originalPrice: number; // Реальная цена (то что мы хотим получить)
  displayPrice: number;  // Фиктивная завышенная цена (показываем пользователю)
  discountAmount: number; // Сумма скидки
  finalPrice: number;     // Итоговая цена после скидки (= originalPrice)
  discountPercentage: number;
}

export interface DiscountTimer {
  isActive: boolean;
  timeLeft: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  totalSeconds: number;
}

class DiscountService {
  private cache: Discount[] = [];
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Новые свойства для системы фиктивных скидок и таймеров
  private currentFakeDiscount: FakeDiscountConfiguration | null = null;
  private timerInterval: NodeJS.Timeout | null = null;
  private onTimerUpdate: ((timer: DiscountTimer) => void) | null = null;
  private lastFakeDiscountCheck: Date | null = null;
  private readonly FAKE_DISCOUNT_CACHE_DURATION = 5 * 1000; // 5 секунд, чтобы быстрее подхватывать изменения

  constructor() {
    // Загружаем текущую фиктивную скидку из базы данных
    this.loadCurrentFakeDiscount();
    this.startTimer();
  }

  /**
   * Load active discounts from Supabase
   */
  async loadActiveDiscounts(): Promise<Discount[]> {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        return this.cache.filter(d => d.is_active);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts?select=*&is_active=eq.true&order=created_at.desc`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.cache = data;
      this.lastCacheUpdate = new Date();
      
      return data.filter((discount: Discount) => this.isDiscountCurrentlyValid(discount));
    } catch (error) {
      console.error('Error loading discounts:', error);
      return [];
    }
  }

  /**
   * Find discount by code
   */
  async findDiscountByCode(code: string): Promise<Discount | null> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts?select=*&code=eq.${encodeURIComponent(code)}&is_active=eq.true`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const discount = data[0];
      
      if (!discount) {
        return null;
      }

      return this.isDiscountCurrentlyValid(discount) ? discount : null;
    } catch (error) {
      console.error('Error finding discount by code:', error);
      return null;
    }
  }

  /**
   * Apply discount to order
   */
  async applyDiscount(orderTotal: number, discountCode?: string): Promise<DiscountApplication | null> {
    let discount: Discount | null = null;

    if (discountCode) {
      // Find specific discount by code
      discount = await this.findDiscountByCode(discountCode);
      if (!discount) {
        return {
          discount: {} as Discount,
          discountAmount: 0,
          finalPrice: orderTotal,
          isValid: false,
          reason: 'Промокод не найден или недействителен'
        };
      }
    } else {
      // Find best automatic discount
      const activeDiscounts = await this.loadActiveDiscounts();
      discount = this.findBestDiscount(activeDiscounts, orderTotal);
      
      if (!discount) {
        return null; // No automatic discounts available
      }
    }

    // Validate discount
    const validation = this.validateDiscount(discount, orderTotal);
    if (!validation.isValid) {
      return {
        discount,
        discountAmount: 0,
        finalPrice: orderTotal,
        isValid: false,
        reason: validation.reason
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.discount_type === 'percentage') {
      discountAmount = (orderTotal * discount.discount_value) / 100;
      
      // Apply max discount limit for percentage discounts
      if (discount.max_discount_amount && discountAmount > discount.max_discount_amount) {
        discountAmount = discount.max_discount_amount;
      }
    } else {
      discountAmount = discount.discount_value;
    }

    // Ensure discount doesn't exceed order total
    discountAmount = Math.min(discountAmount, orderTotal);

    const finalPrice = Math.max(0, orderTotal - discountAmount);

    return {
      discount,
      discountAmount,
      finalPrice,
      isValid: true
    };
  }

  /**
   * Mark discount as used (increment usage_count)
   */
  async markDiscountAsUsed(discountId: number): Promise<void> {
    try {
      // First get current usage count
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts?select=usage_count&id=eq.${discountId}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const currentUsageCount = data[0]?.usage_count || 0;

      // Update usage count
      const updateResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/discounts?id=eq.${discountId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            usage_count: currentUsageCount + 1,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`HTTP error! status: ${updateResponse.status}`);
      }

      // Clear cache to force reload
      this.lastCacheUpdate = null;
    } catch (error) {
      console.error('Error marking discount as used:', error);
    }
  }

  /**
   * Get available discounts for display on frontend
   */
  async getAvailableDiscounts(orderTotal?: number): Promise<Discount[]> {
    const activeDiscounts = await this.loadActiveDiscounts();
    
    if (orderTotal === undefined) {
      return activeDiscounts;
    }

    return activeDiscounts.filter(discount => {
      const validation = this.validateDiscount(discount, orderTotal);
      return validation.isValid;
    });
  }

  // Private helper methods

  private isCacheValid(): boolean {
    if (!this.lastCacheUpdate) {
      return false;
    }
    return (Date.now() - this.lastCacheUpdate.getTime()) < this.CACHE_DURATION;
  }

  private isDiscountCurrentlyValid(discount: Discount): boolean {
    const now = new Date();
    
    // Check if discount is active
    if (!discount.is_active) {
      return false;
    }

    // Check date range
    if (discount.start_date && new Date(discount.start_date) > now) {
      return false;
    }
    
    if (discount.end_date && new Date(discount.end_date) < now) {
      return false;
    }

    // Check usage limit
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return false;
    }

    return true;
  }

  private validateDiscount(discount: Discount, orderTotal: number): { isValid: boolean; reason?: string } {
    // Check if discount is currently valid
    if (!this.isDiscountCurrentlyValid(discount)) {
      return { isValid: false, reason: 'Скидка недействительна или истек срок действия' };
    }

    // Check minimum order value
    if (discount.min_order_value && orderTotal < discount.min_order_value) {
      return { 
        isValid: false, 
        reason: `Минимальная сумма заказа для этой скидки: €${discount.min_order_value}` 
      };
    }

    return { isValid: true };
  }

  private findBestDiscount(discounts: Discount[], orderTotal: number): Discount | null {
    // Filter applicable discounts
    const applicableDiscounts = discounts.filter(discount => {
      const validation = this.validateDiscount(discount, orderTotal);
      return validation.isValid && !discount.code; // Only auto-apply discounts without codes
    });

    if (applicableDiscounts.length === 0) {
      return null;
    }

    // Sort by discount amount (highest first)
    applicableDiscounts.sort((a, b) => {
      const amountA = this.calculateDiscountAmount(a, orderTotal);
      const amountB = this.calculateDiscountAmount(b, orderTotal);
      return amountB - amountA;
    });

    return applicableDiscounts[0];
  }

  private calculateDiscountAmount(discount: Discount, orderTotal: number): number {
    if (discount.discount_type === 'percentage') {
      let amount = (orderTotal * discount.discount_value) / 100;
      if (discount.max_discount_amount) {
        amount = Math.min(amount, discount.max_discount_amount);
      }
      return amount;
    } else {
      return Math.min(discount.discount_value, orderTotal);
    }
  }

  /**
   * Загружает текущую фиктивную скидку из базы данных
   */
  private async loadCurrentFakeDiscount(force: boolean = false): Promise<void> {
    try {
      // Проверяем кеш
      if (!force && this.lastFakeDiscountCheck && 
          (Date.now() - this.lastFakeDiscountCheck.getTime()) < this.FAKE_DISCOUNT_CACHE_DURATION) {
        return;
      }
      const nowIso = new Date().toISOString();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts?select=*&is_active=eq.true&start_date=lte.${nowIso}&end_date=gte.${nowIso}&order=start_date.desc&order=created_at.desc&limit=1`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.length > 0) {
          const discount = data[0];
          this.currentFakeDiscount = {
            id: discount.id.toString(),
            name: discount.name,
            percentage: discount.percentage,
            startDate: new Date(discount.start_date),
            endDate: new Date(discount.end_date),
            isActive: discount.is_active,
          };
          
          this.lastFakeDiscountCheck = new Date();
          console.log('💰 Loaded fake discount from database:', this.currentFakeDiscount);
          return;
        }
      } else if (response.status === 404) {
        // Таблица не существует, игнорируем и не показываем скидку по умолчанию
        console.warn('⚠️ Таблица fake_discounts не найдена. Скидка не будет показана.');
        this.currentFakeDiscount = null;
        this.lastFakeDiscountCheck = new Date();
        return;
      }

      // Если ничего не найдено — активной скидки нет
      this.currentFakeDiscount = null;
      this.lastFakeDiscountCheck = new Date();
      
    } catch (error) {
      console.warn('⚠️ Ошибка загрузки фиктивной скидки из БД. Не показываем дефолтную скидку.', error);
      this.currentFakeDiscount = null;
      this.lastFakeDiscountCheck = new Date();
    }
  }

  /**
   * Загружает фиктивную скидку из localStorage (fallback)
   */
  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('nontel_current_fake_discount');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentFakeDiscount = {
          ...parsed,
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate),
        };
        console.log('💰 Loaded fake discount from localStorage:', this.currentFakeDiscount);
      } // если нет сохранённой — оставляем currentFakeDiscount как null
    } catch (error) {
      console.error('❌ Error loading fake discount from localStorage:', error);
      this.currentFakeDiscount = null;
    }
  }

  /**
   * Создает новую фиктивную скидку в базе данных
   */
  private async createDefaultFakeDiscount(): Promise<void> {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 часа

      const newDiscount = {
        name: 'Flash Sale - Nur heute!',
        percentage: 25,
        start_date: now.toISOString(),
        end_date: endTime.toISOString(),
        is_active: true
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(newDiscount)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const createdDiscount = data[0];

      this.currentFakeDiscount = {
        id: createdDiscount.id.toString(),
        name: createdDiscount.name,
        percentage: createdDiscount.percentage,
        startDate: new Date(createdDiscount.start_date),
        endDate: new Date(createdDiscount.end_date),
        isActive: createdDiscount.is_active,
      };

      console.log('💰 New fake discount created in database:', this.currentFakeDiscount);
    } catch (error) {
      console.error('❌ Error creating fake discount in database:', error);
      this.setDefaultFakeDiscount();
    }
  }

  /**
   * Устанавливает дефолтную фиктивную скидку (fallback)
   */
  private setDefaultFakeDiscount(): void {
    const now = new Date();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 часа

    this.currentFakeDiscount = {
      id: 'default-fake-discount',
      name: 'Limitiertes Angebot',
      percentage: 25, // 25% скидка
      startDate: now,
      endDate: endTime,
      isActive: true,
    };
  }

  /**
   * Устанавливает новую фиктивную скидку в базе данных
   */
  async setFakeDiscount(discount: Omit<FakeDiscountConfiguration, 'id'>): Promise<void> {
    try {
      // Сначала деактивируем все текущие скидки
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts`,
        {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_active: false })
        }
      );

      // Создаем новую скидку
      const newDiscount = {
        name: discount.name,
        percentage: discount.percentage,
        start_date: discount.startDate.toISOString(),
        end_date: discount.endDate.toISOString(),
        is_active: discount.isActive
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/fake_discounts`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(newDiscount)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const createdDiscount = data[0];

      this.currentFakeDiscount = {
        id: createdDiscount.id.toString(),
        name: createdDiscount.name,
        percentage: createdDiscount.percentage,
        startDate: new Date(createdDiscount.start_date),
        endDate: new Date(createdDiscount.end_date),
        isActive: createdDiscount.is_active,
      };

      console.log('💰 New fake discount set in database:', this.currentFakeDiscount);
    } catch (error) {
      console.error('❌ Error setting fake discount in database:', error);
      // Fallback к локальной версии
      this.currentFakeDiscount = {
        ...discount,
        id: `fake-discount-${Date.now()}`,
      };
    }
  }

  /**
   * Получает текущую фиктивную скидку
   */
  getCurrentFakeDiscount(): FakeDiscountConfiguration | null {
    return this.currentFakeDiscount;
  }

  /**
   * Проверяет, активна ли фиктивная скидка в данный момент
   */
  isFakeDiscountActive(): boolean {
    if (!this.currentFakeDiscount || !this.currentFakeDiscount.isActive) {
      return false;
    }

    const now = new Date();
    return now >= this.currentFakeDiscount.startDate && now <= this.currentFakeDiscount.endDate;
  }

  /**
   * Рассчитывает цену с учетом фиктивной скидки
   */
  calculateFakeDiscountPrice(realPrice: number): PriceWithFakeDiscount {
    if (!this.isFakeDiscountActive() || !this.currentFakeDiscount) {
      return {
        originalPrice: realPrice,
        displayPrice: realPrice,
        discountAmount: 0,
        finalPrice: realPrice,
        discountPercentage: 0,
      };
    }

    const percentage = this.currentFakeDiscount.percentage;
    const discountAmount = (realPrice * percentage) / 100;
    const displayPrice = realPrice + discountAmount;

    return {
      originalPrice: realPrice,
      displayPrice: displayPrice,
      discountAmount: discountAmount,
      finalPrice: realPrice,
      discountPercentage: percentage,
    };
  }

  /**
   * Получает таймер скидки
   */
  getDiscountTimer(): DiscountTimer {
    if (!this.currentFakeDiscount || !this.isFakeDiscountActive()) {
      return {
        isActive: false,
        timeLeft: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        totalSeconds: 0,
      };
    }

    const now = new Date().getTime();
    const endTime = this.currentFakeDiscount.endDate.getTime();
    const totalSeconds = Math.max(0, Math.floor((endTime - now) / 1000));

    if (totalSeconds <= 0) {
      return {
        isActive: false,
        timeLeft: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        totalSeconds: 0,
      };
    }

    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return {
      isActive: true,
      timeLeft: { days, hours, minutes, seconds },
      totalSeconds,
    };
  }

  /**
   * Запускает таймер обновления скидки
   */
  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      // Периодически обновляем фиктивную скидку с учетом кеша
      this.loadCurrentFakeDiscount(false).catch(() => {/* swallow */});

      const timer = this.getDiscountTimer();
      
      // Если время истекло, перезагружаем скидки из базы
      if (!timer.isActive && this.currentFakeDiscount) {
        this.loadCurrentFakeDiscount(true).catch(() => {/* swallow */});
      }

      // Уведомляем подписчиков об обновлении таймера
      if (this.onTimerUpdate) {
        this.onTimerUpdate(timer);
      }
    }, 1000);
  }

  /**
   * Публичный метод для принудительного обновления фиктивной скидки
   */
  async refreshFakeDiscount(force: boolean = false): Promise<void> {
    await this.loadCurrentFakeDiscount(force);
    // Нотифицируем подписчиков актуальным значением таймера
    const timer = this.getDiscountTimer();
    if (this.onTimerUpdate) {
      this.onTimerUpdate(timer);
    }
  }

  /**
   * Подписка на обновления таймера
   */
  onTimerChange(callback: (timer: DiscountTimer) => void): () => void {
    this.onTimerUpdate = callback;
    
    // Возвращаем функцию отписки
    return () => {
      this.onTimerUpdate = null;
    };
  }
}

// Utility functions
export function formatTimeLeft(timeLeft: { days: number; hours: number; minutes: number; seconds: number }): string {
  const { days, hours, minutes, seconds } = timeLeft;
  
  if (days > 0) {
    return `${days}д ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

export function formatDiscount(percentage: number): string {
  return `${percentage}% Rabatt`;
}

// Singleton instance
export const discountService = new DiscountService();
export default discountService;
export type { Discount, DiscountApplication };
