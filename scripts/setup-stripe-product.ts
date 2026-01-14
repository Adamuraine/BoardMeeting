import { getUncachableStripeClient } from '../server/stripeClient';

async function setupStripeProduct() {
  try {
    console.log('Setting up SurfTribe Premium subscription...');
    
    const stripe = await getUncachableStripeClient();
    
    const existingProducts = await stripe.products.list({ limit: 10 });
    let product = existingProducts.data.find(p => p.name === 'SurfTribe Premium');
    
    if (!product) {
      console.log('Creating SurfTribe Premium product...');
      product = await stripe.products.create({
        name: 'SurfTribe Premium',
        description: 'Unlock unlimited swipes, 14-day surf forecasts, and trip broadcasting',
      });
      console.log('Product created:', product.id);
    } else {
      console.log('Product already exists:', product.id);
    }
    
    const existingPrices = await stripe.prices.list({ product: product.id, limit: 10 });
    let price = existingPrices.data.find(p => 
      p.unit_amount === 500 && 
      p.recurring?.interval === 'month' &&
      p.active
    );
    
    if (!price) {
      console.log('Creating $5/month price...');
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 500,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      console.log('Price created:', price.id);
    } else {
      console.log('Price already exists:', price.id);
    }
    
    console.log('\n✓ Setup complete!');
    console.log('\nAdd this to your Replit Secrets:');
    console.log(`STRIPE_PREMIUM_PRICE_ID = ${price.id}`);
    
    return price.id;
  } catch (error: any) {
    console.error('Error setting up Stripe:', error.message);
    throw error;
  }
}

setupStripeProduct()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
