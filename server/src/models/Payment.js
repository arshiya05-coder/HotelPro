import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const PAYMENT_METHODS = ['card', 'cash', 'upi', 'bank_transfer'];
export const TRANSACTION_STATUSES = ['succeeded', 'failed', 'refunded'];

// Full card numbers and CVCs are never stored - only brand and last 4 digits.
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: ObjectId, ref: 'Booking', required: true, index: true },
    user: { type: ObjectId, ref: 'User' },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'USD' },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, required: true },
    transactionId: String,
    cardBrand: String,
    cardLast4: String,
    failureReason: String,
    processedBy: { type: ObjectId, ref: 'User' },
    refundedAt: Date,
    refundedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', paymentSchema);
