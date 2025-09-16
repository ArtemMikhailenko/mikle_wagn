# Environment Setup

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Supabase Configuration
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Monday.com Integration
```
MONDAY_API_TOKEN=your_monday_api_token
MONDAY_BOARD_ID=your_monday_board_id
```

### Stripe Payment Processing
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_[your_test_key]
STRIPE_SECRET_KEY=sk_test_[your_test_key]
```

## Security Notes

- Never commit `.env.local` to version control
- Use test keys for development
- Switch to live keys only in production
- Keep all secret keys secure

## Setup Instructions

1. Copy the variables above to your `.env.local` file
2. Replace placeholder values with your actual keys
3. Restart your development server
4. Test the integration
