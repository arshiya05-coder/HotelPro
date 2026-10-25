import { config } from '../config/env.js';
import { Booking, ACTIVE_BOOKING_STATUSES } from '../models/Booking.js';
import { Room } from '../models/Room.js';
import { ApiError, addDays, asyncHandler, nightsBetween, toUtcDate, todayUtc } from '../utils/helpers.js';

export const listRooms = asyncHandler(async (req, res) => {
  const { type, minPrice, maxPrice, capacity } = req.query;
  const filter = { isActive: true };
  if (type) filter.type = type;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.pricePerNight = {};
    if (minPrice !== undefined) filter.pricePerNight.$gte = minPrice;
    if (maxPrice !== undefined) filter.pricePerNight.$lte = maxPrice;
  }
  if (capacity) filter.capacity = { $gte: capacity };

  const rooms = await Room.find(filter).sort({ number: 1 });
  res.json({ rooms });
});

// Real-time availability: operational rooms with no active booking overlapping the dates.
export const checkAvailability = asyncHandler(async (req, res) => {
  const checkIn = toUtcDate(req.query.checkIn);
  const checkOut = toUtcDate(req.query.checkOut);
  // One day of slack for guests in timezones behind UTC.
  if (checkIn < addDays(todayUtc(), -1)) throw new ApiError(400, 'Check-in date cannot be in the past');

  const busyRoomIds = await Booking.distinct('room', {
    status: { $in: ACTIVE_BOOKING_STATUSES },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });

  const filter = {
    _id: { $nin: busyRoomIds },
    isActive: true,
    status: 'operational',
    capacity: { $gte: req.query.guests },
  };
  if (req.query.type) filter.type = req.query.type;

  const rooms = await Room.find(filter).sort({ pricePerNight: 1, number: 1 });
  res.json({ checkIn, checkOut, nights: nightsBetween(checkIn, checkOut), rooms });
});

export const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, isActive: true });
  if (!room) throw new ApiError(404, 'Room not found');
  res.json({ room, taxRate: config.taxRate, currency: config.currency });
});

export const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create(req.body);
  res.status(201).json({ room });
});

export const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOneAndUpdate({ _id: req.params.id, isActive: true }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!room) throw new ApiError(404, 'Room not found');
  res.json({ room });
});

// Staff workflow: housekeeping and maintenance updates.
export const updateRoomStatus = asyncHandler(async (req, res) => {
  const room = await Room.findOneAndUpdate({ _id: req.params.id, isActive: true }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!room) throw new ApiError(404, 'Room not found');
  res.json({ room });
});

// Soft delete so historical bookings keep a valid room reference.
export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, isActive: true });
  if (!room) throw new ApiError(404, 'Room not found');

  const hasUpcoming = await Booking.exists({
    room: room._id,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    checkOut: { $gte: todayUtc() },
  });
  if (hasUpcoming) throw new ApiError(409, 'Room has active or upcoming bookings and cannot be removed');

  room.isActive = false;
  room.number = `${room.number}-archived-${Date.now()}`;
  await room.save();
  res.json({ message: 'Room removed' });
});
