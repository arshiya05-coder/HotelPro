import { z } from 'zod';
import { ROOM_TYPES, ROOM_STATUSES, HOUSEKEEPING_STATUSES } from '../models/Room.js';
import { BOOKING_STATUSES } from '../models/Booking.js';
import { PAYMENT_METHODS } from '../models/Payment.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email');
const phone = z.string().trim().max(20).optional().or(z.literal(''));
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// ---- Auth ----
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  phone,
  password,
});

export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

// ---- Rooms ----
export const roomSchema = z.object({
  number: z.string().trim().min(1).max(10),
  type: z.enum(ROOM_TYPES),
  pricePerNight: z.coerce.number().positive(),
  capacity: z.coerce.number().int().min(1).max(10),
  floor: z.coerce.number().int().min(0).max(200).optional(),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  status: z.enum(ROOM_STATUSES).optional(),
  housekeeping: z.enum(HOUSEKEEPING_STATUSES).optional(),
});

export const roomUpdateSchema = roomSchema.partial();

export const roomStatusSchema = z
  .object({
    status: z.enum(ROOM_STATUSES).optional(),
    housekeeping: z.enum(HOUSEKEEPING_STATUSES).optional(),
  })
  .refine((d) => d.status || d.housekeeping, 'Provide status or housekeeping');

export const roomQuerySchema = z.object({
  type: z.enum(ROOM_TYPES).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
});

export const availabilitySchema = z
  .object({
    checkIn: dateStr,
    checkOut: dateStr,
    guests: z.coerce.number().int().min(1).max(10).default(1),
    type: z.enum(ROOM_TYPES).optional(),
  })
  .refine((d) => d.checkOut > d.checkIn, { message: 'Check-out must be after check-in', path: ['checkOut'] });

// ---- Bookings ----
export const createBookingSchema = z
  .object({
    roomId: objectId,
    checkIn: dateStr,
    checkOut: dateStr,
    adults: z.coerce.number().int().min(1).max(10).default(1),
    children: z.coerce.number().int().min(0).max(10).default(0),
    specialRequests: z.string().trim().max(500).optional(),
    // Only honoured for staff creating a booking on behalf of a guest.
    guestDetails: z
      .object({ name: z.string().trim().min(2).max(80), email, phone })
      .optional(),
  })
  .refine((d) => d.checkOut > d.checkIn, { message: 'Check-out must be after check-in', path: ['checkOut'] });

export const bookingQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
  date: dateStr.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cancelBookingSchema = z.object({ reason: z.string().trim().max(300).optional() });

// ---- Payments ----
export const paymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: z.coerce.number().positive().optional(),
  card: z
    .object({
      name: z.string().trim().max(80).optional(),
      number: z.string().trim().min(12).max(23),
      expiry: z.string().trim().max(7),
      cvc: z.string().trim().max(4),
    })
    .optional(),
});

// ---- Users (admin) ----
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  phone,
  password,
  role: z.enum(['admin', 'staff', 'guest']).default('staff'),
});

export const updateUserSchema = z
  .object({
    role: z.enum(['admin', 'staff', 'guest']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.role !== undefined || d.isActive !== undefined, 'Nothing to update');

export const userQuerySchema = z.object({
  role: z.enum(['admin', 'staff', 'guest']).optional(),
  q: z.string().trim().max(80).optional(),
});
