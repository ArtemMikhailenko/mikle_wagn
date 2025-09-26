import React, { useState, useEffect } from 'react';
import { discountService, DiscountTimer, formatTimeLeft } from '../services/discountService';
import { Clock, Zap } from 'lucide-react';

interface CompactDiscountTimerProps {
  className?: string;
  onTimerEnd?: () => void;
}

const CompactDiscountTimer: React.FC<CompactDiscountTimerProps> = ({
  className = '',
  onTimerEnd
}) => {
  const [timer, setTimer] = useState<DiscountTimer>({ 
    isActive: false, 
    timeLeft: { days: 0, hours: 0, minutes: 0, seconds: 0 }, 
    totalSeconds: 0 
  });
  const [discount] = useState(discountService.getCurrentFakeDiscount());
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    // Подписываемся на обновления таймера
    const unsubscribe = discountService.onTimerChange((updatedTimer) => {
      setTimer(updatedTimer);
      
      // Если время истекло
      if (!updatedTimer.isActive && timer.isActive) {
        if (onTimerEnd) {
          onTimerEnd();
        }
      }
      
      // Включаем мигание если осталось меньше 2 минут
      setIsBlinking(updatedTimer.totalSeconds > 0 && updatedTimer.totalSeconds <= 120);
    });

    // Получаем начальное состояние
    setTimer(discountService.getDiscountTimer());

    return unsubscribe;
  }, [onTimerEnd, timer.isActive]);

  if (!timer.isActive || !discount) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`
        relative bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg px-3 py-2 
        shadow-lg border-2 border-red-400 transform transition-all duration-300
        ${isBlinking ? 'animate-pulse scale-105' : 'hover:scale-105'}
      `}>
        {/* Анимированный фон при наведении */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        
        {/* Контент */}
        <div className="relative z-10 flex items-center space-x-2">
          {/* Иконка */}
          <div className="flex-shrink-0">
            <Zap className="w-4 h-4 text-yellow-300" />
          </div>
          
          {/* Скидка */}
          <div className="text-sm font-bold">
            <span className="text-yellow-300">-{discount.percentage}%</span>
          </div>
          
          {/* Разделитель */}
          <div className="h-4 w-px bg-white opacity-50"></div>
          
          {/* Таймер */}
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-bold font-mono">
              {formatTimeLeft(timer.timeLeft)}
            </span>
          </div>
        </div>

        {/* Декоративный элемент */}
        <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75"></div>
      </div>
    </div>
  );
};

export default CompactDiscountTimer;