import { storage } from './storage';
import { getUncachableStripeClient } from './stripeClient';

export class StripeService {
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async getOrCreateCustomer(existingCustomerId: string | null, email: string, userId: string): Promise<string> {
    const stripe = await getUncachableStripeClient();
    
    if (existingCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(existingCustomerId);
        if (!customer.deleted) {
          return existingCustomerId;
        }
      } catch (error: any) {
        console.log(`Customer ${existingCustomerId} not found in Stripe, creating new one`);
      }
    }
    
    const newCustomer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    
    await storage.updateUserStripeInfo(userId, { stripeCustomerId: newCustomer.id });
    return newCustomer.id;
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    return await storage.getProduct(productId);
  }

  async getSubscription(subscriptionId: string) {
    return await storage.getSubscription(subscriptionId);
  }
}

export const stripeService = new StripeService();
