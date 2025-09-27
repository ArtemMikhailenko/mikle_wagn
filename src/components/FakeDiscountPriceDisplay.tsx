import React from 'react';
import { discountService } from '../services/discountService';

interface FakeDiscountPriceDisplayProps {
  realPrice: number;
  className?: string;
  showTimer?: boolean;
  compact?: boolean; // Для компактного отображения в кнопках
  textColor?: string; // Для кастомизации цвета текста
}

const FakeDiscountPriceDisplay: React.FC<FakeDiscountPriceDisplayProps> = ({
  realPrice,
  className = '',
  showTimer = false,
  compact = false,
  textColor = ''
}) => {
  const [, forceRender] = React.useReducer((x) => x + 1, 0);
  const priceData = discountService.calculateFakeDiscountPrice(realPrice);
  const fakeDiscount = discountService.getCurrentFakeDiscount();
  const isActive = discountService.isFakeDiscountActive();

  React.useEffect(() => {
    // Подписка на тик таймера, чтобы обновлять отображение при изменении скидки/таймера
    const unsubscribe = discountService.onTimerChange(() => {
      forceRender();
    });
    // Начальный тик
    forceRender();
    return unsubscribe;
  }, []);

  if (!fakeDiscount || !isActive) {
    // Показываем только обычную цену
    return (
      <div className={className}>
        <div className={`font-bold ${compact ? 'text-sm text-white' : 'text-2xl text-white'} `}>
          €{realPrice.toFixed(2)}
        </div>
      </div>
    );
  }

  if (compact) {
    // Компактное отображение для кнопок и корзины
    const finalTextColor = textColor || 'text-gray-800';
    const strikeTextColor = 'text-gray-500';
    
    return (
      <div className={className}>
        <div className="flex items-center space-x-1.5">
          <div className={`text-xs line-through ${strikeTextColor}`}>
            €{priceData.displayPrice.toFixed(2)}
          </div>
          <div className={`font-bold text-sm ${finalTextColor}`}>
            €{priceData.finalPrice.toFixed(2)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-1">
        {/* Зачеркнутая завышенная цена */}
        <div className="text-lg text-gray-500 line-through">
          €{priceData.displayPrice.toFixed(2)}
        </div>
        
        {/* Итоговая цена с красивой скидкой */}
        <div className="flex items-center space-x-2">
          <div className={`font-bold text-2xl text-white`}>
            €{priceData.finalPrice.toFixed(2)}
          </div>
          <div className="bg-red-100 text-red px-2 py-1 rounded-full text-sm font-medium">
            -{priceData.discountPercentage}%
          </div>
        </div>
        
        {/* Показать экономию */}
        <div className="text-sm text-gray-600">
          Экономия: €{priceData.discountAmount.toFixed(2)}
        </div>
        
        {/* Таймер если нужен */}
        {showTimer && (
          <div className="text-xs text-orange-600 font-medium">
            ⏰ Ограниченное время!
          </div>
        )}
      </div>
    </div>
  );
};

export default FakeDiscountPriceDisplay;