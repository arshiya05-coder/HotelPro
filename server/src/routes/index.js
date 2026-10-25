import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as bookings from '../controllers/bookings.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';
import * as payments from '../controllers/payments.controller.js';
import * as rooms from '../controllers/rooms.controller.js';
import * as users from '../controllers/users.controller.js';
import { authorize, protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import * as s from '../validators/schemas.js';

const router = Router();
const staffOnly = authorize('admin', 'staff');
const adminOnly = authorize('admin');

// ---- Auth ----
router.post('/auth/register', authLimiter, validate(s.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(s.loginSchema), auth.login);
router.get('/auth/me', protect, auth.me);
router.patch('/auth/me', protect, validate(s.updateProfileSchema), auth.updateProfile);
router.post('/auth/change-password', protect, authLimiter, validate(s.changePasswordSchema), auth.changePassword);

// ---- Rooms (browsing is public) ----
router.get('/rooms', validate(s.roomQuerySchema, 'query'), rooms.listRooms);
router.get('/rooms/availability', validate(s.availabilitySchema, 'query'), rooms.checkAvailability);
router.get('/rooms/:id', rooms.getRoom);
router.post('/rooms', protect, adminOnly, validate(s.roomSchema), rooms.createRoom);
router.put('/rooms/:id', protect, adminOnly, validate(s.roomUpdateSchema), rooms.updateRoom);
router.patch('/rooms/:id/status', protect, staffOnly, validate(s.roomStatusSchema), rooms.updateRoomStatus);
router.delete('/rooms/:id', protect, adminOnly, rooms.deleteRoom);

// ---- Bookings ----
router.post('/bookings', protect, validate(s.createBookingSchema), bookings.createBooking);
router.get('/bookings', protect, validate(s.bookingQuerySchema, 'query'), bookings.listBookings);
router.get('/bookings/:id', protect, bookings.getBooking);
router.post('/bookings/:id/cancel', protect, validate(s.cancelBookingSchema), bookings.cancelBooking);
router.post('/bookings/:id/confirm', protect, staffOnly, bookings.confirmBooking);
router.post('/bookings/:id/check-in', protect, staffOnly, bookings.checkIn);
router.post('/bookings/:id/check-out', protect, staffOnly, bookings.checkOut);

// ---- Payments ----
router.post('/bookings/:id/payments', protect, validate(s.paymentSchema), payments.payForBooking);
router.get('/payments', protect, staffOnly, payments.listPayments);
router.post('/payments/:id/refund', protect, adminOnly, payments.refundPayment);

// ---- Dashboard ----
router.get('/dashboard/stats', protect, staffOnly, dashboard.getStats);
router.get('/dashboard/room-board', protect, staffOnly, dashboard.getRoomBoard);

// ---- Users (admin) ----
router.get('/users', protect, adminOnly, validate(s.userQuerySchema, 'query'), users.listUsers);
router.post('/users', protect, adminOnly, validate(s.createUserSchema), users.createUser);
router.patch('/users/:id', protect, adminOnly, validate(s.updateUserSchema), users.updateUser);

export default router;
