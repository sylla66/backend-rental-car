const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['booking', 'sale'],
      required: true,
    },
    // Référence dynamique : pointe soit vers Booking, soit vers SaleOrder
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'referenceModel',
    },
    referenceModel: {
      type: String,
      required: true,
      enum: ['Booking', 'SaleOrder'],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    provider: {
      type: String,
      enum: ['stripe', 'paydunya', 'manual'],
      default: 'stripe',
    },
    // ID Stripe nécessaire pour retrouver le Payment local depuis un
    // événement webhook (Stripe ne connaît pas notre _id MongoDB)
    stripePaymentIntentId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);