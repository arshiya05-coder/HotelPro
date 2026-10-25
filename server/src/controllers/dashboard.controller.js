import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Room } from '../models/Room.js';
import { addDays, asyncHandler, todayUtc } from '../utils/helpers.js';
import { bookingPopulate } from './bookings.controller.js';

export const getStats = asyncHandler(async (_req, res) => {
  const today = todayUtc();
  const tomorrow = addDays(today, 1);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [totalRooms, outOfOrder, inHouse, arrivals, departures, pending, revenue, byStatus, recent] =
    await Promise.all([
      Room.countDocuments({ isActive: true }),
      Room.countDocuments({ isActive: true, status: { $ne: 'operational' } }),
      Booking.countDocuments({ status: 'checked_in' }),
      Booking.countDocuments({ status: { $in: ['pending', 'confirmed'] }, checkIn: { $gte: today, $lt: tomorrow } }),
      Booking.countDocuments({ status: 'checked_in', checkOut: { $lt: tomorrow } }),
      Booking.countDocuments({ status: 'pending' }),
      Payment.aggregate([
        { $match: { status: 'succeeded', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.find().sort({ createdAt: -1 }).limit(8).populate(bookingPopulate),
    ]);

  const sellable = totalRooms - outOfOrder;
  res.json({
    totalRooms,
    outOfOrder,
    inHouse,
    occupancyRate: sellable > 0 ? Math.round((inHouse / sellable) * 100) : 0,
    arrivalsToday: arrivals,
    departuresToday: departures,
    pendingBookings: pending,
    revenueThisMonth: revenue[0]?.total ?? 0,
    bookingsByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    recentBookings: recent,
  });
});

// Front-desk room board: every room with its current in-house guest, if any.
export const getRoomBoard = asyncHandler(async (_req, res) => {
  const [rooms, inHouse] = await Promise.all([
    Room.find({ isActive: true }).sort({ floor: 1, number: 1 }).lean(),
    Booking.find({ status: 'checked_in' }).select('room guestDetails checkOut bookingRef').lean(),
  ]);
  const byRoom = new Map(inHouse.map((b) => [String(b.room), b]));
  res.json({ rooms: rooms.map((r) => ({ ...r, currentBooking: byRoom.get(String(r._id)) || null })) });
});
