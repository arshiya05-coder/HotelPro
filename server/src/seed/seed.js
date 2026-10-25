/**
 * Seeds the database with demo users, rooms and bookings.
 * WARNING: clears the users, rooms, bookings and payments collections first.
 *
 *   npm run seed
 */
import { config } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { addDays, round2, todayUtc } from '../utils/helpers.js';

const users = [
  { name: 'Ava Admin', email: 'admin@hotelpro.com', password: 'Admin@123', role: 'admin', phone: '+1 555 0100' },
  { name: 'Sam Staff', email: 'staff@hotelpro.com', password: 'Staff@123', role: 'staff', phone: '+1 555 0101' },
  { name: 'Grace Guest', email: 'guest@hotelpro.com', password: 'Guest@123', role: 'guest', phone: '+1 555 0102' },
  { name: 'Liam Traveler', email: 'liam@example.com', password: 'Guest@123', role: 'guest', phone: '+1 555 0103' },
];

const roomTemplates = {
  single: {
    pricePerNight: 89,
    capacity: 1,
    amenities: ['Wi-Fi', 'Smart TV', 'Work desk'],
    description: 'A bright, efficient room for solo travelers with a comfortable single bed.',
  },
  double: {
    pricePerNight: 129,
    capacity: 2,
    amenities: ['Wi-Fi', 'Smart TV', 'Mini fridge', 'Coffee maker'],
    description: 'Spacious double room with a queen bed and city views.',
  },
  deluxe: {
    pricePerNight: 189,
    capacity: 3,
    amenities: ['Wi-Fi', 'Smart TV', 'Mini bar', 'Rain shower', 'Lounge chair'],
    description: 'Upgraded room with a king bed, sitting area and premium bath amenities.',
  },
  suite: {
    pricePerNight: 329,
    capacity: 4,
    amenities: ['Wi-Fi', 'Smart TV', 'Mini bar', 'Jacuzzi', 'Living room', 'Butler service'],
    description: 'Our signature suite with a separate living room, panoramic windows and a jacuzzi.',
  },
};

const roomPlan = [
  ['101', 'single', 1], ['102', 'single', 1], ['103', 'double', 1], ['104', 'double', 1],
  ['201', 'double', 2], ['202', 'double', 2], ['203', 'deluxe', 2], ['204', 'deluxe', 2],
  ['301', 'deluxe', 3], ['302', 'suite', 3], ['303', 'suite', 3], ['304', 'single', 3],
];

function priceBooking(room, checkIn, nights) {
  const subtotal = round2(room.pricePerNight * nights);
  const tax = round2(subtotal * config.taxRate);
  return { checkIn, checkOut: addDays(checkIn, nights), nights, pricePerNight: room.pricePerNight, subtotal, tax, totalAmount: round2(subtotal + tax) };
}

async function seed() {
  await connectDB();
  await Promise.all([User.deleteMany({}), Room.deleteMany({}), Booking.deleteMany({}), Payment.deleteMany({})]);

  // create() (not insertMany) so the password-hashing hook runs.
  const [, staff, grace, liam] = await User.create(users);

  const rooms = await Room.create(
    roomPlan.map(([number, type, floor]) => ({ number, type, floor, ...roomTemplates[type] }))
  );
  const room = Object.fromEntries(rooms.map((r) => [r.number, r]));
  await Room.updateOne({ _id: room['304']._id }, { status: 'maintenance' });

  const today = todayUtc();
  const guestInfo = (u) => ({ name: u.name, email: u.email, phone: u.phone });

  const bookings = await Booking.create([
    // Currently in house, fully paid
    { guest: grace._id, guestDetails: guestInfo(grace), room: room['203']._id, adults: 2, status: 'checked_in',
      ...priceBooking(room['203'], addDays(today, -1), 3), checkedInAt: new Date(), createdBy: grace._id },
    // Arriving today, confirmed
    { guest: liam._id, guestDetails: guestInfo(liam), room: room['302']._id, adults: 2, children: 1, status: 'confirmed',
      ...priceBooking(room['302'], today, 2), confirmedAt: new Date(), createdBy: liam._id },
    // Upcoming, awaiting payment
    { guest: grace._id, guestDetails: guestInfo(grace), room: room['103']._id, adults: 1, status: 'pending',
      ...priceBooking(room['103'], addDays(today, 10), 4), specialRequests: 'High floor if possible', createdBy: grace._id },
    // Past stay
    { guest: liam._id, guestDetails: guestInfo(liam), room: room['101']._id, adults: 1, status: 'checked_out',
      ...priceBooking(room['101'], addDays(today, -12), 2), checkedOutAt: addDays(today, -10), createdBy: staff._id },
    // Walk-in guest booked by staff without an account
    { guestDetails: { name: 'Noah Walker', email: 'noah.walker@example.com', phone: '+1 555 0199' }, room: room['201']._id,
      adults: 2, status: 'checked_in', ...priceBooking(room['201'], today, 1), checkedInAt: new Date(), createdBy: staff._id },
  ]);

  const paid = [bookings[0], bookings[3], bookings[1]];
  const payments = [
    { booking: paid[0], amount: paid[0].totalAmount, method: 'card', cardBrand: 'visa', cardLast4: '4242', processedBy: grace._id },
    { booking: paid[1], amount: paid[1].totalAmount, method: 'cash', processedBy: staff._id },
    { booking: paid[2], amount: round2(paid[2].totalAmount / 2), method: 'upi', processedBy: staff._id },
  ];
  for (const p of payments) {
    await Payment.create({
      ...p, booking: p.booking._id, user: p.booking.guest, status: 'succeeded', currency: config.currency,
      transactionId: `seed_${p.booking.bookingRef.toLowerCase()}`,
    });
    p.booking.amountPaid = p.amount;
    p.booking.paymentStatus = p.amount >= p.booking.totalAmount ? 'paid' : 'partial';
    await p.booking.save();
  }

  console.log(`Seeded ${users.length} users, ${rooms.length} rooms, ${bookings.length} bookings, ${payments.length} payments.`);
  console.log('\nDemo logins:');
  for (const u of users.slice(0, 3)) console.log(`  ${u.role.padEnd(6)} ${u.email} / ${u.password}`);
  await disconnectDB();
}

seed().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
