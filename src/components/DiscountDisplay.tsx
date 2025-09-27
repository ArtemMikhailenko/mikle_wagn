import React, { useState, useEffect } from 'react';
import { Percent, Tag, Clock, Gift, Timer } from 'lucide-react';
import { discountService, Discount, FakeDiscountConfiguration } from '../services/discountService';

interface DiscountDisplayProps {
  orderTotal?: number;
  onDiscountSelect?: (discount: Discount) => void;
  className?: string;
}

const DiscountDisplay: React.FC<DiscountDisplayProps> = ({
  orderTotal,
  onDiscountSelect,
  className = ''
}) => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [fakeDiscount, setFakeDiscount] = useState<FakeDiscountConfiguration | null>(null);

  useEffect(() => {
    loadDiscounts();
    loadFakeDiscount();

    // Подписываемся на обновления таймера/скидки, чтобы мгновенно обновлять отображение
    const unsubscribe = discountService.onTimerChange(() => {
      loadFakeDiscount();
    });
    return unsubscribe;
  }, [orderTotal]);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const availableDiscounts = await discountService.getAvailableDiscounts(orderTotal);
      // Only show discounts without codes (auto-apply) or major promotional discounts
      const publicDiscounts = availableDiscounts.filter(discount => 
        !discount.code || discount.name.toLowerCase().includes('распродажа') || 
        discount.name.toLowerCase().includes('акция')
      );
      setDiscounts(publicDiscounts);
    } catch (error) {
      console.error('Error loading discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFakeDiscount = () => {
    const currentFakeDiscount = discountService.getCurrentFakeDiscount();
    if (currentFakeDiscount && discountService.isFakeDiscountActive()) {
      setFakeDiscount(currentFakeDiscount);
    } else {
      setFakeDiscount(null);
    }
  };

  const formatDiscountValue = (discount: Discount) => {
    if (discount.discount_type === 'percentage') {
      return `${discount.discount_value}%`;
    } else {
      return `€${discount.discount_value}`;
    }
  };

  const calculatePotentialSavings = (discount: Discount) => {
    if (!orderTotal) return null;
    
    let savings = 0;
    if (discount.discount_type === 'percentage') {
      savings = (orderTotal * discount.discount_value) / 100;
      if (discount.max_discount_amount) {
        savings = Math.min(savings, discount.max_discount_amount);
      }
    } else {
      savings = Math.min(discount.discount_value, orderTotal);
    }
    
    return savings;
  };

  const isDiscountApplicable = (discount: Discount) => {
    if (!orderTotal) return true;
    return !discount.min_order_value || orderTotal >= discount.min_order_value;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 h-20 rounded-lg"></div>
      </div>
    );
  }

  if (discounts.length === 0 && !fakeDiscount) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Gift className="h-5 w-5 mr-2 text-green-600" />
        Доступные скидки
      </h3>
      
      {/* Фиктивная скидка с таймером */}
      {fakeDiscount && (
        <div className="p-4 rounded-lg border bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <Timer className="h-3 w-3" />
                  <span>{fakeDiscount.percentage}%</span>
                </div>
                
                <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                  <Clock className="h-3 w-3" />
                  <span>Ограниченное время!</span>
                </div>
              </div>
              
              <h4 className="font-medium text-gray-900">{fakeDiscount.name}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Специальное предложение действует только сегодня!
              </p>
            </div>
            
            {orderTotal && (
              <div className="text-right">
                <div className="text-lg font-bold text-red-600">
                  -€{((orderTotal * fakeDiscount.percentage) / 100).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  экономия
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {/* Обычные скидки по промокодам */}
        {discounts.map((discount) => {
          const isApplicable = isDiscountApplicable(discount);
          const potentialSavings = calculatePotentialSavings(discount);
          
          return (
            <div
              key={discount.id}
              className={`p-4 rounded-lg border transition-all ${
                isApplicable
                  ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                  : 'bg-gray-50 border-gray-200 opacity-75'
              }`}
              onClick={() => isApplicable && onDiscountSelect && onDiscountSelect(discount)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium ${
                      isApplicable 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Percent className="h-3 w-3" />
                      <span>{formatDiscountValue(discount)}</span>
                    </div>
                    
                    {discount.code && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-mono">
                        <Tag className="h-3 w-3" />
                        <span>{discount.code}</span>
                      </div>
                    )}
                    
                    {discount.end_date && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                        <Clock className="h-3 w-3" />
                        <span>до {formatDate(discount.end_date)}</span>
                      </div>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-gray-900">{discount.name}</h4>
                  {discount.description && (
                    <p className="text-sm text-gray-600 mt-1">{discount.description}</p>
                  )}
                  
                  {!isApplicable && discount.min_order_value && (
                    <p className="text-sm text-orange-600 mt-1">
                      Минимальная сумма заказа: €{discount.min_order_value}
                    </p>
                  )}
                </div>
                
                {potentialSavings && isApplicable && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      -€{potentialSavings.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      экономия
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {orderTotal && (
        <div className="text-xs text-gray-500 mt-2">
          * Скидки применяются автоматически при оформлении заказа
        </div>
      )}
    </div>
  );
};

export default DiscountDisplay;
