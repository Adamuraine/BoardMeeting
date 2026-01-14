import { getStripeSync } from './stripeClient';
import { storage } from './storage';

let listenersRegistered = false;

async function registerEventListeners(sync: any) {
  if (listenersRegistered) return;
  listenersRegistered = true;
  
  sync.on('checkout.session.completed', async (event: any) => {
    const session = event.data.object;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    if (customerId && subscriptionId) {
      try {
        const profile = await storage.getProfileByStripeCustomerId(customerId);
        if (profile) {
          await storage.updateUserStripeInfo(profile.userId, {
            stripeSubscriptionId: subscriptionId,
          });
          await storage.updateUserPremiumStatus(profile.userId, true);
          console.log(`Activated premium for user ${profile.userId}`);
        }
      } catch (err) {
        console.error('Error processing checkout.session.completed:', err);
      }
    }
  });
  
  sync.on('customer.subscription.updated', async (event: any) => {
    const subscription = event.data.object;
    const customerId = subscription.customer as string;
    const status = subscription.status;
    
    try {
      const profile = await storage.getProfileByStripeCustomerId(customerId);
      if (profile) {
        const isPremium = status === 'active' || status === 'trialing';
        await storage.updateUserPremiumStatus(profile.userId, isPremium);
        console.log(`Updated premium status for user ${profile.userId}: ${isPremium}`);
      }
    } catch (err) {
      console.error('Error processing customer.subscription.updated:', err);
    }
  });
  
  sync.on('customer.subscription.deleted', async (event: any) => {
    const subscription = event.data.object;
    const customerId = subscription.customer as string;
    
    try {
      const profile = await storage.getProfileByStripeCustomerId(customerId);
      if (profile) {
        await storage.updateUserPremiumStatus(profile.userId, false);
        await storage.updateUserStripeInfo(profile.userId, {
          stripeSubscriptionId: undefined,
        });
        console.log(`Deactivated premium for user ${profile.userId}`);
      }
    } catch (err) {
      console.error('Error processing customer.subscription.deleted:', err);
    }
  });
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await registerEventListeners(sync);
    await sync.processWebhook(payload, signature);
  }
}
