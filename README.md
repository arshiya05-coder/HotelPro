# 🏨 HotelPro — Hotel Management System

**Your ultimate hotel management solution.** HotelPro streamlines hotel operations with a secure,
scalable backend for efficient booking, guest management and payment processing, behind an intuitive
interface with robust authentication.

It serves both independent properties and large hospitality chains: guests book and pay online,
front-desk staff handle check-ins, check-outs and walk-ins, housekeeping tracks room status, and
administrators manage rooms, rates, payments and team access.

---

## ✨ Features

| Area | What you get |
| --- | --- |
| **Booking management** | Search, reserve, confirm, cancel; automatic nights / tax / total calculation; price locked at booking time |
| **Real-time availability** | Live inventory per date range; overlapping reservations are rejected (no double bookings) |
| **Guest management** | Guest accounts and profiles, booking history, walk-in / phone reservations by staff |
| **Check-in / check-out** | Front-desk workflow; check-out requires a settled balance and flags the room for housekeeping |
| **Payment processing** | Card (online), cash, UPI, bank transfer; partial payments; failed attempts logged; admin refunds |
| **Room inventory & staff workflows** | Room CRUD, rates and amenities, maintenance status, housekeeping (clean / dirty / inspecting), live room board |
| **Dashboard** | Occupancy rate, arrivals, departures, pending bookings, monthly revenue, recent bookings |
| **Security** | bcrypt password hashing, JWT auth, role-based access (admin / staff / guest), rate limiting, Helmet headers, CORS allow-list, input validation (zod), NoSQL-injection sanitizing, no card data stored |

## 🧱 Tech stack

- **Client:** React 18, React Router 6, Axios, Vite, plain CSS (responsive)
- **Server:** Node.js 18+, Express 4, Mongoose 8, JWT, bcryptjs, zod, Helmet, express-rate-limit
- **Database:** MongoDB 6+ (local, Docker, or MongoDB Atlas)

## 📁 Project structure

```
hotelpro/
├── README.md
├── package.json              # root helper scripts (run client + server together)
├── docker-compose.yml        # optional local MongoDB
├── client/                   # React front end
│   ├── index.html
│   ├── vite.config.js        # dev proxy /api -> http://localhost:5000
│   ├── .env.example
│   └── src/
│       ├── main.jsx, App.jsx # entry + routes
│       ├── api/client.js     # Axios instance, auth header, error helper
│       ├── context/AuthContext.jsx
│       ├── components/       # Navbar, Footer, ProtectedRoute, AdminLayout, RoomCard, DateSearch, ui
│       ├── pages/            # Home, Rooms, BookRoom, BookingDetail, MyBookings, Profile, Login, Register
│       │   └── admin/        # Dashboard, ManageBookings, ManageRooms, Payments, ManageUsers
│       ├── utils/format.js
│       └── styles/index.css
└── server/                   # Express REST API
    ├── .env.example
    ├── database/README.md    # schema, relationships, booking lifecycle
    └── src/
        ├── server.js, app.js # bootstrap + middleware stack
        ├── config/           # env loading, MongoDB connection
        ├── models/           # User, Room, Booking, Payment (Mongoose schemas)
        ├── controllers/      # auth, rooms, bookings, payments, dashboard, users
        ├── routes/index.js   # all API routes + role guards
        ├── middleware/       # auth (JWT/roles), validate (zod), security, error handling
        ├── validators/       # request schemas
        ├── services/paymentGateway.js   # mock gateway (swap for Stripe/Razorpay)
        ├── utils/helpers.js
        └── seed/seed.js      # demo data
```

## 🚀 Getting started

### 1. Prerequisites

- Node.js **18.18+**
- MongoDB — pick one:
  - Install MongoDB Community locally, **or**
  - `docker compose up -d mongo` (uses `docker-compose.yml`), **or**
  - Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and copy its connection string

### 2. Install

```bash
npm run install:all
```

(or run `npm install` separately inside `server/` and `client/`)

### 3. Configure

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` — at minimum set `MONGO_URI` and a long random `JWT_SECRET`
(`openssl rand -hex 64`).

### 4. Seed demo data (optional but recommended)

```bash
npm run seed
```

This **clears** the users, rooms, bookings and payments collections and creates 12 rooms, sample
bookings and these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@hotelpro.com | Admin@123 |
| Staff | staff@hotelpro.com | Staff@123 |
| Guest | guest@hotelpro.com | Guest@123 |

> Change or remove these accounts before deploying anywhere public.

### 5. Run

```bash
npm run dev
```

- Front end: http://localhost:5173
- API: http://localhost:5000/api (health check: `/api/health`)

### Test payments

The bundled gateway is a realistic **mock** (validation, declines, transaction ids):

| Card number | Result |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |

Use any future expiry (e.g. `12/30`) and any 3-digit CVC.

## 🔌 API reference

All endpoints are prefixed with `/api`. Authenticated requests send `Authorization: Bearer <token>`.
Errors are returned as `{ "message": "...", "details": { field: [messages] } }`.

### Auth
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a guest account → `{ token, user }` |
| POST | `/auth/login` | Public | Sign in → `{ token, user }` |
| GET | `/auth/me` | Signed in | Current user |
| PATCH | `/auth/me` | Signed in | Update name / phone |
| POST | `/auth/change-password` | Signed in | Change password |

### Rooms
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/rooms?type&minPrice&maxPrice&capacity` | Public | List rooms |
| GET | `/rooms/availability?checkIn&checkOut&guests&type` | Public | Rooms free for a date range |
| GET | `/rooms/:id` | Public | Room details + tax rate |
| POST | `/rooms` | Admin | Create room |
| PUT | `/rooms/:id` | Admin | Update room |
| PATCH | `/rooms/:id/status` | Staff, Admin | Set `status` / `housekeeping` |
| DELETE | `/rooms/:id` | Admin | Remove room (blocked if it has upcoming bookings) |

### Bookings
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/bookings` | Signed in | Create booking (staff may pass `guestDetails` for walk-ins) |
| GET | `/bookings?status&q&date&page&limit` | Signed in | Guests: own bookings; staff: all |
| GET | `/bookings/:id` | Owner, Staff | Booking + payment history |
| POST | `/bookings/:id/cancel` | Owner, Staff | Cancel a pending/confirmed booking |
| POST | `/bookings/:id/confirm` | Staff, Admin | Confirm a pending booking |
| POST | `/bookings/:id/check-in` | Staff, Admin | Check guest in |
| POST | `/bookings/:id/check-out` | Staff, Admin | Check guest out (balance must be 0) |

### Payments
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/bookings/:id/payments` | Owner, Staff | Pay: `{ method, amount?, card? }` |
| GET | `/payments?status` | Staff, Admin | All transactions |
| POST | `/payments/:id/refund` | Admin | Refund a payment |

### Dashboard & users
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/dashboard/stats` | Staff, Admin | KPIs and recent bookings |
| GET | `/dashboard/room-board` | Staff, Admin | Every room with its in-house guest |
| GET | `/users?role&q` | Admin | List users |
| POST | `/users` | Admin | Create staff/admin account |
| PATCH | `/users/:id` | Admin | Change role or enable/disable |

## 🗄️ Database

MongoDB with four collections — `users`, `rooms`, `bookings`, `payments`. Full field-by-field schema,
indexes, relationships and the booking lifecycle are documented in
[`server/database/README.md`](server/database/README.md).

## 🔐 Security notes

- Passwords are hashed with **bcrypt** (cost 12) and never returned by the API.
- **JWTs** are short-lived (`JWT_EXPIRES_IN`, default 1 day); the user is re-loaded on every request, so
  disabling an account or changing a role takes effect immediately.
- **Role-based access control** on every protected route; guests can only see their own bookings.
- Login/registration are **rate limited** (20 attempts / 15 min); the whole API has a global limit.
- **Helmet** security headers, a CORS allow-list (`CLIENT_URL`), 20 KB JSON body limit.
- Every request body and query is validated with **zod**; `$` / `.` keys are stripped to prevent NoSQL injection.
- Only the card **brand and last 4 digits** are stored. For production, replace
  `server/src/services/paymentGateway.js` with your provider (Stripe, Razorpay…) and collect card data
  with the provider's hosted fields so it never touches your server (PCI DSS).
- Always serve over **HTTPS** in production.

## 🏗️ Production build

```bash
npm run build                          # builds client/dist
NODE_ENV=production npm start          # Express serves the API and the built client on PORT
```

Or host `client/dist` on any static host (Netlify, Vercel, S3) and set `VITE_API_URL` to your API URL
before building, and add that origin to `CLIENT_URL` on the server.

## 🗺️ Possible next steps

- Real payment provider integration and webhooks
- Email / SMS booking confirmations
- Multi-property support (a `hotels` collection referenced by rooms)
- Seasonal / dynamic pricing and promo codes
- MongoDB transactions (replica set) for strict booking concurrency under very high load
- Automated tests (Jest + Supertest, React Testing Library)
