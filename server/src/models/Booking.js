import crypto from 'node:crypto';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
// Bookings in these states hold the room and block overlapping reservations.
export const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in'];
export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded'];

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: { type: String, unique: true },
    // Optional: walk-in guests booked by staff may not have an account.
    guest: { type: ObjectId, ref: 'User', index: true },
    guestDetails: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, trim: true },
    },
    room: { type: ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    adults: { type: Number, default: 1, min: 1 },
    children: { type: Number, default: 0, min: 0 },
    pricePerNight: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    specialRequests: { type: String, maxlength: 500 },
    createdBy: { type: ObjectId, ref: 'User' },
    confirmedAt: Date,
    checkedInAt: Date,
    checkedOutAt: Date,
    cancelledAt: Date,
    cancellationReason: { type: String, maxlength: 300 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });

bookingSchema.virtual('balance').get(function () {
  return Math.max(0, Math.round((this.totalAmount - this.amountPaid) * 100) / 100);
});

bookingSchema.pre('validate', function () {
  if (!this.bookingRef) this.bookingRef = `HP${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
});

// Two stays overlap when each one starts before the other ends.
bookingSchema.statics.hasConflict = function (roomId, checkIn, checkOut, excludeId) {
  const query = {
    room: roomId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return this.exists(query);
};

export const Booking = mongoose.model('Booking', bookingSchema);
