import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle2 } from 'lucide-react';
import { createPaymentIntent, isStripeAvailable } from '../services/stripeService';

interface StripeCheckoutFormProps {
  amount: number; // в центах
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  customerEmail?: string;
}

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      padding: '10px 12px',
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: false,
};

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
  amount,
  onSuccess,
  onError,
  customerEmail = ''
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [email, setEmail] = useState(customerEmail);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    address: {
      line1: '',
      city: '',
      postal_code: '',
      country: 'DE',
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      onError('Karteninformationen sind erforderlich');
      setProcessing(false);
      return;
    }

    try {
      // Создаем PaymentMethod
      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: billingDetails.name,
          email: email,
          address: billingDetails.address,
        },
      });

      if (methodError) {
        throw new Error(methodError.message);
      }

      // Создаем PaymentIntent на сервере (или mock в demo режиме)
      const isProduction = isStripeAvailable();
      
      if (isProduction) {
        // Используем Supabase Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            amount,
            currency: 'eur',
            payment_method_id: paymentMethod.id,
            customer_email: email,
            billing_details: billingDetails,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const { client_secret } = await response.json();
        
        // Подтверждаем платеж
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(client_secret);

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        setSucceeded(true);
        onSuccess(paymentIntent);
      } else {
        // Demo режим - используем тестовый PaymentIntent
        await createPaymentIntent({
          amount,
          currency: 'eur',
          payment_method_id: paymentMethod.id,
          customer_email: email,
          billing_details: billingDetails,
        });

        // Симулируем успешный платеж в demo режиме
        const mockPaymentIntent = {
          id: 'pi_demo_' + Math.random().toString(36).substr(2, 9),
          status: 'succeeded',
          amount,
          currency: 'eur',
        };

        setSucceeded(true);
        onSuccess(mockPaymentIntent);
      }
    } catch (error: any) {
      onError(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Zahlung erfolgreich!</h3>
        <p className="text-gray-600">Ihre Bestellung wird bearbeitet.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          E-Mail-Adresse
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ihre-email@beispiel.de"
        />
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Vollständiger Name
        </label>
        <input
          type="text"
          id="name"
          value={billingDetails.name}
          onChange={(e) => setBillingDetails(prev => ({ ...prev, name: e.target.value }))}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Max Mustermann"
        />
      </div>

      {/* Adresse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Straße und Hausnummer
          </label>
          <input
            type="text"
            id="address"
            value={billingDetails.address.line1}
            onChange={(e) => setBillingDetails(prev => ({
              ...prev,
              address: { ...prev.address, line1: e.target.value }
            }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Musterstraße 123"
          />
        </div>
        
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            Stadt
          </label>
          <input
            type="text"
            id="city"
            value={billingDetails.address.city}
            onChange={(e) => setBillingDetails(prev => ({
              ...prev,
              address: { ...prev.address, city: e.target.value }
            }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Berlin"
          />
        </div>
        
        <div>
          <label htmlFor="postal" className="block text-sm font-medium text-gray-700 mb-2">
            Postleitzahl
          </label>
          <input
            type="text"
            id="postal"
            value={billingDetails.address.postal_code}
            onChange={(e) => setBillingDetails(prev => ({
              ...prev,
              address: { ...prev.address, postal_code: e.target.value }
            }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10115"
          />
        </div>
      </div>

      {/* Kartendaten */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CreditCard className="inline h-4 w-4 mr-1" />
          Kartendaten
        </label>
        <div className="border border-gray-300 rounded-md p-3 bg-white">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {/* Sicherheitshinweis */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
        <Lock className="h-4 w-4 text-gray-500" />
        <span>Ihre Zahlungsinformationen werden sicher verschlüsselt übertragen.</span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || processing}
        className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
          processing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {processing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Verarbeitung...</span>
          </div>
        ) : (
          `€${(amount / 100).toFixed(2)} bezahlen`
        )}
      </button>
    </form>
  );
};

export default StripeCheckoutForm;
