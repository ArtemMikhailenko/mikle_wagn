import React from 'react';
import StripeProvider from './StripeProvider';
import StripeCheckoutForm from './StripeCheckoutForm';

const StripeTestPage: React.FC = () => {
  const handlePaymentSuccess = (paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent);
    alert(`Zahlung erfolgreich! PaymentIntent ID: ${paymentIntent.id}`);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert(`Zahlungsfehler: ${error}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Stripe Test
        </h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Test-Kreditkarten:</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <p><strong>Visa:</strong> 4242 4242 4242 4242</p>
            <p><strong>Visa (Debit):</strong> 4000 0566 5566 5556</p>
            <p><strong>Mastercard:</strong> 5555 5555 5555 4444</p>
            <p><strong>Ablaufdatum:</strong> Beliebige Zukunft (z.B. 12/25)</p>
            <p><strong>CVC:</strong> Beliebige 3 Ziffern (z.B. 123)</p>
          </div>
        </div>

        <StripeProvider>
          <StripeCheckoutForm
            amount={2500} // €25.00 in cents
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            customerEmail="test@example.com"
          />
        </StripeProvider>
      </div>
    </div>
  );
};

export default StripeTestPage;
