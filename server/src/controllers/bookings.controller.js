import { config } from '../config/env.js';
import { isStaff } from '../middleware/auth.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import {
  ApiError,
  addDays,
  asyncHandler,
  escapeRegex,
  nightsBetween,
  round2,
  toUtcDate,
  todayUtc,
} from '../utils/helpers.js';

const MAX_NIGHTS = 30;

export const bookingPopulate = [
  { path: 'room', select: 'number type pricePerNight capacity floor imageUrl amenities' },
  { path: 'guest', select: 'name email phone' },
];

// Guests may only see their own bookings; respond 404 (not 403) to avoid leaking ids.
export async function findAccessibleBooking(id, user) {
  const booking = await Booking.findById(id).populate(bookingPopulate);
  const ownerId = booking?.guest?._id ?? booking?.guest;
  if (!booking || (!isStaff(user) && String(ownerId) !== String(user._id))) {
    throw new ApiError(404, 'Booking not found');
  }
  return booking;
}

export const createBooking = asyncHandler(async (req, res) => {
  const { roomId, adults, children, specialRequests, guestDetails } = req.body;
  const checkIn = toUtcDate(req.body.checkIn);
  const checkOut = toUtcDate(req.body.checkOut);
  const nights = nightsBetween(checkIn, checkOut);

  if (checkIn < addDays(todayUtc(), -1)) throw new ApiError(400, 'Check-in date cannot be in the past');
  if (nights > MAX_NIGHTS) throw new ApiError(400, `Maximum stay is ${MAX_NIGHTS} nights`);

  const room = await Room.findOne({ _id: roomId, isActive: true });
  if (!room) throw new ApiError(404, 'Room not found');
  if (room.status !== 'operational') throw new ApiError(409, 'This room is currently not available for booking');
  if (adults + children > room.capacity) {
    throw new ApiError(400, `This room accommodates up to ${room.capacity} guests`);
  }
  if (await Booking.hasConflict(room._id, checkIn, checkOut)) {
    throw new ApiError(409, 'This room is already booked for the selected dates');
  }

  let guestId = req.user._id;
  let details = { name: req.user.name, email: req.user.email, phone: req.user.phone };
  if (isStaff(req.user) && guestDetails) {
    // Phone / walk-in reservation: link to the guest's account if they have one.
    const existing = await User.findOne({ email: guestDetails.email, role: 'guest' });
    guestId = existing?._id;
    details = guestDetails;
  }

  const subtotal = round2(room.pricePerNight * nights);
  const tax = round2(subtotal * config.taxRate);

  const booking = await Booking.create({
    guest: guestId,
    guestDetails: details,
    room: room._id,
    checkIn,
    checkOut,
    nights,
    adults,
    children,
    pricePerNight: room.pricePerNight,
    subtotal,
    tax,
    totalAmount: round2(subtotal + tax),
    specialRequests,
    createdBy: req.user._id,
  });
  await booking.populate(bookingPopulate);
  res.status(201).json({ booking });
});

export const listBookings = asyncHandler(async (req, res) => {
  const { status, q, date, page, limit } = req.query;
  const filter = {};

  if (!isStaff(req.user)) filter.guest = req.user._id;
  if (status) filter.status = status;
  if (date) {
    // Bookings in-house on the given date.
    const day = toUtcDate(date);
    filter.checkIn = { $lte: day };
    filter.checkOut = { $gt: day };
  }
  if (q && isStaff(req.user)) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ bookingRef: rx }, { 'guestDetails.name': rx }, { 'guestDetails.email': rx }];
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate(bookingPopulate)
      .sort({ checkIn: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);
  res.json({ bookings, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await findAccessibleBooking(req.params.id, req.user);
  const payments = await Payment.find({ booking: booking._id }).sort({ createdAt: -1 });
  res.json({ booking, payments });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await findAccessibleBooking(req.params.id, req.user);
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new ApiError(409, `A ${booking.status.replace('_', ' ')} booking cannot be cancelled`);
  }
  if (!isStaff(req.user) && booking.checkIn < todayUtc()) {
    throw new ApiError(409, 'Please contact the front desk to cancel a stay that has already started');
  }
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = req.body.reason;
  await booking.save();
  res.json({ booking });
});

export const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await findAccessibleBooking(req.params.id, req.user);
  if (booking.status !== 'pending') throw new ApiError(409, 'Only pending bookings can be confirmed');
  booking.status = 'confirmed';
  booking.confirmedAt = new Date();
  await booking.save();
  res.json({ booking });
});

export const checkIn = asyncHandler(async (req, res) => {
  const booking = await findAccessibleBooking(req.params.id, req.user);
  if (booking.status !== 'confirmed') throw new ApiError(409, 'Only confirmed bookings can be checked in');

  const today = todayUtc();
  // Allow early check-in from the evening before (timezone slack), never after check-out.
  if (today < addDays(booking.checkIn, -1)) throw new ApiError(409, 'Check-in is not open yet for this booking');
  if (today >= booking.checkOut) throw new ApiError(409, 'This booking has already passed its check-out date');

  const room = await Room.findById(booking.room._id);
  if (room.status !== 'operational') throw new ApiError(409, `Room ${room.number} is under ${room.status.replace(/_/g, ' ')}`);

  booking.status = 'checked_in';
  booking.checkedInAt = new Date();
  await booking.save();
  res.json({ booking });
});

export const checkOut = asyncHandler(async (req, res) => {
  const booking = await findAccessibleBooking(req.params.id, req.user);
  if (booking.status !== 'checked_in') throw new ApiError(409, 'Only checked-in guests can be checked out');
  if (booking.balance > 0) {
    throw new ApiError(409, `Outstanding balance of ${booking.balance.toFixed(2)} must be settled before check-out`);
  }

  booking.status = 'checked_out';
  booking.checkedOutAt = new Date();
  await booking.save();
  await Room.updateOne({ _id: booking.room._id }, { housekeeping: 'dirty' });
  res.json({ booking });
});
