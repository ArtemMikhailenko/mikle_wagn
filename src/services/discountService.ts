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

class DiscountService {
  private cache: Discount[] = [];
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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
}

// Singleton instance
export const discountService = new DiscountService();
export default discountService;
export type { Discount, DiscountApplication };
