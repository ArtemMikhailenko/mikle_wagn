// Mock API endpoint для создания PaymentIntent
// В реальном приложении это должно быть на сервере

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  payment_method_id: string;
  customer_email: string;
  billing_details: any;
}

export interface CreatePaymentIntentResponse {
  client_secret: string;
  status: string;
}

export const createPaymentIntent = async (
  request: CreatePaymentIntentRequest
): Promise<CreatePaymentIntentResponse> => {
  // Симуляция API call к серверу
  await new Promise(resolve => setTimeout(resolve, 1000));

  // В демо режиме возвращаем фиктивный client_secret
  // В реальном приложении здесь будет вызов к Supabase Edge Function
  return {
    client_secret: 'pi_demo_' + Math.random().toString(36).substr(2, 9) + '_secret_' + Math.random().toString(36).substr(2, 9),
    status: 'requires_payment_method'
  };
};

// Функция для проверки, доступен ли Stripe
export const isStripeAvailable = (): boolean => {
  return !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && 
         import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY !== 'pk_test_your_stripe_key';
};
