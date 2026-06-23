const Stripe = require('stripe');

let stripe;

const getStripe = () => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required to initialize Stripe');
    }
    stripe = Stripe(secretKey);
  }
  return stripe;
};

module.exports = {
  getStripe,
};
