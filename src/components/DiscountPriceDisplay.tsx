import React from 'react';

interface DiscountPriceDisplayProps {
  originalPrice: number;
  inflatedPrice: number;
  discountPercentage: number;
  hasDiscount: boolean;
  currency?: string;
  className?: string;
  showSavings?: boolean;
}

export const DiscountPriceDisplay: React.FC<DiscountPriceDisplayProps> = ({
  originalPrice,
  inflatedPrice,
  discountPercentage,
  hasDiscount,
  currency = '€',
  className = '',
  showSavings = true
}) => {
  if (!hasDiscount) {
    return (
      <div className={`text-right ${className}`}>
        <div className="text-2xl font-bold text-gray-900">
          {currency}{originalPrice.toFixed(2)}
        </div>
      </div>
    );
  }

  const savings = inflatedPrice - originalPrice;

  return (
    <div className={`text-right ${className}`}>
      {/* Durchgestrichene ursprüngliche Preisanzeige */}
      <div className="relative">
        <div className="text-lg text-gray-500 line-through">
          {currency}{inflatedPrice.toFixed(2)}
        </div>
        
        {/* Rabatt-Badge */}
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full transform rotate-12 shadow-lg">
          -{discountPercentage}%
        </div>
      </div>

      {/* Aktueller Preis mit Hervorhebung */}
      <div className="text-3xl font-bold text-green-600 mt-1">
        {currency}{originalPrice.toFixed(2)}
      </div>

      {/* Ersparnis anzeigen */}
      {showSavings && (
        <div className="text-sm text-green-600 font-medium mt-1">
          Du sparst {currency}{savings.toFixed(2)}!
        </div>
      )}
    </div>
  );
};

interface DiscountBannerProps {
  discountName: string;
  discountPercentage: number;
  className?: string;
}

export const DiscountBanner: React.FC<DiscountBannerProps> = ({
  discountName,
  discountPercentage,
  className = ''
}) => {
  return (
    <div className={`bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white text-center py-3 px-6 rounded-lg shadow-lg animate-pulse ${className}`}>
      <div className="flex items-center justify-center gap-3">
        <span className="text-2xl">🎉</span>
        <div className="font-bold text-lg">
          {discountName} - {discountPercentage}% RABATT
        </div>
        <span className="text-2xl">🎉</span>
      </div>
      <div className="text-sm mt-1 text-yellow-200">
        Automatisch angewendet - Keine Codes erforderlich!
      </div>
    </div>
  );
};

export default DiscountPriceDisplay;