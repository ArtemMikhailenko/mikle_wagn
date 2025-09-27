import React, { useState, useEffect } from 'react';
import { discountService, DiscountTimer, formatTimeLeft, formatDiscount } from '../services/discountService';

interface DiscountTimerProps {
  className?: string;
  onTimerEnd?: () => void;
  showProgress?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const DiscountTimerComponent: React.FC<DiscountTimerProps> = ({
  className = '',
  onTimerEnd,
  showProgress = true,
  size = 'medium'
}) => {
  const [timer, setTimer] = useState<DiscountTimer>({ isActive: false, timeLeft: { days: 0, hours: 0, minutes: 0, seconds: 0 }, totalSeconds: 0 });
  const [discount, setDiscount] = useState(discountService.getCurrentFakeDiscount());
  const [isBlinking, setIsBlinking] = useState(false);

  // Нельзя делать ранний return до хуков — сначала объявим мемо/эффекты ниже

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'text-sm px-3 py-2',
          title: 'text-xs font-medium',
          timer: 'text-base font-bold',
          discount: 'text-lg font-black'
        };
      case 'large':
        return {
          container: 'text-xl px-6 py-4',
          title: 'text-lg font-medium',
          timer: 'text-2xl font-bold',
          discount: 'text-4xl font-black'
        };
      default:
        return {
          container: 'text-base px-4 py-3',
          title: 'text-sm font-medium',
          timer: 'text-xl font-bold',
          discount: 'text-2xl font-black'
        };
    }
  };

  const sizes = getSizeClasses();

  // Общая длительность акции по данным БД (startDate/endDate)
  const totalDurationSeconds = React.useMemo(() => {
    if (!discount?.startDate || !discount?.endDate) return 0;
    const start = new Date(discount.startDate as any).getTime();
    const end = new Date(discount.endDate as any).getTime();
    const total = Math.max(0, Math.floor((end - start) / 1000));
    return total;
  }, [discount?.startDate, discount?.endDate]);

  // Порог мигания: максимум(60с, 3% от общей длительности), но не больше всей длительности
  const blinkThreshold = React.useMemo(() => {
    if (totalDurationSeconds <= 0) return 0;
    const threePercent = Math.floor(totalDurationSeconds * 0.03);
    return Math.min(totalDurationSeconds, Math.max(60, threePercent));
  }, [totalDurationSeconds]);

  // Рассчитываем прогресс для анимации (от 0% в начале до 100% к окончанию)
  const progressPercentage =
    showProgress && discount && totalDurationSeconds > 0
      ? Math.min(100, Math.max(0, (1 - (timer.totalSeconds / totalDurationSeconds)) * 100))
      : 0;

  // Подписка на таймер после инициализации вычислений
  useEffect(() => {
    const unsubscribe = discountService.onTimerChange((updatedTimer) => {
      setTimer(updatedTimer);
      // Подхватываем актуальную скидку на каждом тике
      setDiscount(discountService.getCurrentFakeDiscount());

      if (!updatedTimer.isActive && timer.isActive) {
        onTimerEnd?.();
      }

      setIsBlinking(
        updatedTimer.totalSeconds > 0 && blinkThreshold > 0 && updatedTimer.totalSeconds <= blinkThreshold
      );
    });

  // Начальное состояние
    setTimer(discountService.getDiscountTimer());
  setDiscount(discountService.getCurrentFakeDiscount());
  // Принудительно подтянем скидку из БД на монтировании (обходит кеш при необходимости)
  discountService.refreshFakeDiscount(false).catch(() => {/* no-op */});

    return unsubscribe;
  }, [blinkThreshold, onTimerEnd, timer.isActive]);

  if (!timer.isActive || !discount) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Основной контейнер скидки */}
      <div className={`
        relative bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg
        shadow-lg border-2 border-red-400 transform transition-all duration-300
        ${isBlinking ? 'animate-pulse scale-105' : 'hover:scale-105'}
        ${sizes.container}
      `}>
        {/* Анимированный фон */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-700 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Прогресс-бар */}
        {showProgress && (
          <div className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-20 w-full">
            <div 
              className="h-full bg-white transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        )}

        {/* Контент */}
        <div className="relative z-10">
          {/* Заголовок */}
          <div className="text-center mb-2">
            <div className={`${sizes.title} opacity-90 uppercase tracking-wide`}>
              🔥 {discount.name}
            </div>
          </div>

          {/* Скидка */}
          <div className="text-center mb-3">
            <span className={`${sizes.discount} text-yellow-300 drop-shadow-lg`}>
              {formatDiscount(discount.percentage)}
            </span>
          </div>

          {/* Таймер */}
          <div className="text-center">
            <div className={`${sizes.title} opacity-90 mb-1`}>
              Nur noch:
            </div>
            <div className={`${sizes.timer} font-mono tracking-wide`}>
              {formatTimeLeft(timer.timeLeft)}
            </div>
          </div>

          {/* Мигающий текст для срочности */}
          {isBlinking && (
            <div className="text-center mt-2">
              <span className={`${sizes.title} text-yellow-300 animate-bounce`}>
                ⚡ BEEILEN SIE SICH! ⚡
              </span>
            </div>
          )}
        </div>

        {/* Декоративные элементы */}
        <div className="absolute top-2 left-2 w-3 h-3 bg-yellow-300 rounded-full animate-ping opacity-75"></div>
        <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse opacity-75"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 bg-yellow-300 rounded-full animate-pulse opacity-50"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 bg-white rounded-full animate-ping opacity-50 animation-delay-1000"></div>
      </div>

      {/* Дополнительная информация */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-600 font-medium">
          💎 Exklusives Angebot - Nur für kurze Zeit!
        </p>
      </div>
    </div>
  );
};

// Простой компонент для отображения цены со скидкой inline
export const InlineDiscountPrice: React.FC<{
  originalPrice: number;
  displayPrice: number;
  finalPrice: number;
  discountPercentage: number;
  className?: string;
}> = ({ originalPrice, displayPrice, finalPrice, discountPercentage, className = '' }) => {
  if (discountPercentage === 0) {
    return <span className={className}>€{originalPrice.toFixed(2)}</span>;
  }

  return (
    <span className={`${className} flex items-center space-x-1`}>
      <span className="text-red-500 line-through text-sm">€{displayPrice.toFixed(2)}</span>
      <span className="font-bold text-white">€{finalPrice.toFixed(2)}</span>
    </span>
  );
};

// Компактный компонент таймера скидки для встраивания
export const CompactDiscountTimer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [timer, setTimer] = useState<DiscountTimer>({ isActive: false, timeLeft: { days: 0, hours: 0, minutes: 0, seconds: 0 }, totalSeconds: 0 });
  const [discount] = useState(discountService.getCurrentFakeDiscount());

  useEffect(() => {
    const unsubscribe = discountService.onTimerChange((updatedTimer) => {
      setTimer(updatedTimer);
    });

    setTimer(discountService.getDiscountTimer());
    return unsubscribe;
  }, []);

  if (!timer.isActive || !discount) {
    return null;
  }

  return (
    <div className={`inline-flex items-center bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-lg px-3 py-1.5 shadow-md ${className}`}>
      <span className="mr-2">🔥</span>
      <span className="font-bold">{formatDiscount(discount.percentage)}</span>
      <span className="mx-2">•</span>
      <span className="font-mono font-semibold">{formatTimeLeft(timer.timeLeft)}</span>
    </div>
  );
};

// Компонент для отображения только процента скидки (компактная версия)
export const CompactDiscountBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [discount] = useState(discountService.getCurrentFakeDiscount());
  
  if (!discount || !discountService.isFakeDiscountActive()) {
    return null;
  }

  return (
    <div className={`
      inline-flex items-center px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full
      shadow-md transform hover:scale-105 transition-transform duration-200
      ${className}
    `}>
      <span className="mr-1">🔥</span>
      {formatDiscount(discount.percentage)}
    </div>
  );
};

// Компонент для отображения зачеркнутой цены и цены со скидкой
interface DiscountPriceDisplayProps {
  originalPrice: number;
  displayPrice: number;
  finalPrice: number;
  discountPercentage: number;
  className?: string;
  showOriginal?: boolean;
}

export const DiscountPriceDisplay: React.FC<DiscountPriceDisplayProps> = ({
  originalPrice,
  displayPrice,
  finalPrice,
  discountPercentage,
  className = '',
  showOriginal = true
}) => {
  if (discountPercentage === 0) {
    return (
      <div className={`${className}`}>
        <span className="text-2xl font-bold text-gray-900">€{originalPrice.toFixed(2)}</span>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Фиктивная завышенная цена (зачеркнутая) */}
      {showOriginal && (
        <div className="flex items-center justify-center mb-1">
          <span className="text-lg text-gray-500 line-through font-medium">
            €{displayPrice.toFixed(2)}
          </span>
          <CompactDiscountBadge className="ml-2" />
        </div>
      )}
      
      {/* Финальная цена (со скидкой) */}
      <div className="text-center">
        <span className="text-3xl font-bold text-green-600">
          €{finalPrice.toFixed(2)}
        </span>
      </div>
      
      {/* Экономия */}
      <div className="text-center text-sm text-green-600 font-medium mt-1">
        Sie sparen €{(displayPrice - finalPrice).toFixed(2)}!
      </div>
    </div>
  );
};

export default DiscountTimerComponent;
