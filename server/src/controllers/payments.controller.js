import { config } from '../config/env.js';
import { isStaff } from '../middleware/auth.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { chargeCard, recordOfflinePayment, refund } from '../services/paymentGateway.js';
import { ApiError, asyncHandler, round2 } from '../utils/helpers.js';
import { findAccessibleBooking } from './bookings.controller.js';

export const payForBooking = asyncHandler(async (req, res) => {
  const booking = await findAccessibleBooking(req.params.id, req.user);
  if (['cancelled', 'checked_out'].includes(booking.status)) {
    throw new ApiError(409, `Payments cannot be taken for a ${booking.status.replace('_', ' ')} booking`);
  }

  const balance = booking.balance;
  if (balance <= 0) throw new ApiError(409, 'This booking is already fully paid');

  const staff = isStaff(req.user);
  const { method, card } = req.body;
  // Guests always settle the full balance online; staff may take partial payments.
  const amount = staff && req.body.amount ? round2(req.body.amount) : balance;
  if (amount > balance) throw new ApiError(400, `Amount exceeds the outstanding balance of ${balance.toFixed(2)}`);
  if (method !== 'card' && !staff) {
    throw new ApiError(403, 'Cash, UPI and bank transfer payments are recorded by front-desk staff');
  }
  if (method === 'card' && !card) throw new ApiError(400, 'Card details are required');

  const result = method === 'card' ? await chargeCard({ amount, card }) : await recordOfflinePayment();

  const payment = await Payment.create({
    booking: booking._id,
    user: booking.guest?._id,
    amount,
    currency: config.currency,
    method,
    status: result.success ? 'succeeded' : 'failed',
    transactionId: result.transactionId,
    cardBrand: result.brand,
    cardLast4: result.last4,
    failureReason: result.success ? undefined : result.message,
    processedBy: req.user._id,
  });
  if (!result.success) throw new ApiError(402, result.message);

  booking.amountPaid = round2(booking.amountPaid + amount);
  booking.paymentStatus = booking.amountPaid >= booking.totalAmount ? 'paid' : 'partial';
  if (booking.status === 'pending') {
    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
  }
  await booking.save();
  res.status(201).json({ payment, booking });
});

export const listPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  const payments = await Payment.find(filter)
    .populate({ path: 'booking', select: 'bookingRef guestDetails' })
    .populate({ path: 'processedBy', select: 'name role' })
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ payments });
});

export const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status !== 'succeeded') throw new ApiError(409, 'Only successful payments can be refunded');

  const booking = await Booking.findById(payment.booking);
  if (booking?.status === 'checked_out') throw new ApiError(409, 'Cannot refund a payment for a completed stay');

  await refund(payment);
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  payment.refundedBy = req.user._id;
  await payment.save();

  if (booking) {
    booking.amountPaid = Math.max(0, round2(booking.amountPaid - payment.amount));
    if (booking.amountPaid > 0) booking.paymentStatus = 'partial';
    else booking.paymentStatus = booking.status === 'cancelled' ? 'refunded' : 'unpaid';
    await booking.save();
  }
  res.json({ payment, booking });
});
