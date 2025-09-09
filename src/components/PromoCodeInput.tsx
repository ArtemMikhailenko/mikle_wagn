import React, { useState } from 'react';
import { Tag, Check, X, Loader } from 'lucide-react';
import { discountService, DiscountApplication } from '../services/discountService';

interface PromoCodeInputProps {
  orderTotal: number;
  onDiscountApplied: (application: DiscountApplication | null) => void;
  className?: string;
}

const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  orderTotal,
  onDiscountApplied,
  className = ''
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountApplication | null>(null);

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      setMessage({ text: 'Bitte geben Sie einen Promocode ein', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const application = await discountService.applyDiscount(orderTotal, promoCode.trim());
      
      if (application && application.isValid) {
        setAppliedDiscount(application);
        onDiscountApplied(application);
        setMessage({ 
          text: `Promocode angewendet! Rabatt: €${application.discountAmount.toFixed(2)}`, 
          type: 'success' 
        });
      } else {
        setAppliedDiscount(null);
        onDiscountApplied(null);
        setMessage({ 
          text: application?.reason || 'Promocode ungültig', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      setMessage({ text: 'Fehler beim Anwenden des Promocodes', type: 'error' });
      setAppliedDiscount(null);
      onDiscountApplied(null);
    } finally {
      setLoading(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setAppliedDiscount(null);
    setMessage(null);
    onDiscountApplied(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyPromoCode();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Tag className="h-5 w-5 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-900">Promocode</h3>
      </div>

      {appliedDiscount && appliedDiscount.isValid ? (
        // Applied discount display
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {appliedDiscount.discount.name}
                </span>
                {appliedDiscount.discount.code && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono rounded">
                    {appliedDiscount.discount.code}
                  </span>
                )}
              </div>
              <p className="text-xs text-green-600 mt-1">
                Rabatt: €{appliedDiscount.discountAmount.toFixed(2)}
              </p>
            </div>
            <button
              onClick={removePromoCode}
              className="p-1 text-green-600 hover:text-green-800 transition-colors"
              title="Promocode entfernen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        // Promo code input
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Promocode eingeben"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={applyPromoCode}
              disabled={loading || !promoCode.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                'Anwenden'
              )}
            </button>
          </div>

          {message && (
            <div className={`p-2 rounded-md text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;
