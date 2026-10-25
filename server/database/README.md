# HotelPro Database

HotelPro uses **MongoDB** (via the Mongoose ODM). The schema is defined in code in
[`../src/models`](../src/models) — this document describes it.

## Connection

Set `MONGO_URI` in `server/.env`. Any of these work:

| Option | `MONGO_URI` example |
| --- | --- |
| Local MongoDB install | `mongodb://127.0.0.1:27017/hotelpro` |
| Docker (`docker compose up -d mongo` from the repo root) | `mongodb://127.0.0.1:27017/hotelpro` |
| MongoDB Atlas (cloud) | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hotelpro` |

Collections and indexes are created automatically on first run. Load demo data with
`npm run seed` (this **wipes** the four collections below first).

## Entity relationships

```
 users 1 ────< bookings >──── 1 rooms
   │              │
   │              └────< payments
   └── (processedBy / createdBy on bookings & payments)
```

- A **user** (guest) has many **bookings**. A booking's `guest` is optional so staff can
  book walk-in guests who have no account; contact info always lives in `guestDetails`.
- A **room** has many **bookings**; overlapping active bookings for the same room are rejected.
- A **booking** has many **payments** (partial payments, failed attempts, refunds).

## Collections

### `users`
| Field | Type | Notes |
| --- | --- | --- |
| `name` | String | required, ≤ 80 chars |
| `email` | String | required, **unique**, lower-cased |
| `phone` | String | optional |
| `password` | String | **bcrypt hash** (cost 12), never returned by the API (`select: false`) |
| `role` | `admin` \| `staff` \| `guest` | default `guest` |
| `isActive` | Boolean | disabled users cannot sign in, existing tokens stop working |
| `lastLoginAt` | Date | |
| `createdAt` / `updatedAt` | Date | automatic |

### `rooms`
| Field | Type | Notes |
| --- | --- | --- |
| `number` | String | required, **unique** (e.g. `"203"`) |
| `type` | `single` \| `double` \| `deluxe` \| `suite` | indexed with price |
| `pricePerNight` | Number | |
| `capacity` | Number | max guests (adults + children) |
| `floor` | Number | |
| `amenities` | [String] | |
| `description`, `imageUrl` | String | |
| `status` | `operational` \| `maintenance` \| `out_of_service` | only operational rooms are bookable |
| `housekeeping` | `clean` \| `dirty` \| `inspecting` | set to `dirty` automatically on check-out |
| `isActive` | Boolean | soft delete flag |

Occupancy is **not** stored on the room — it is derived from bookings with status `checked_in`.

### `bookings`
| Field | Type | Notes |
| --- | --- | --- |
| `bookingRef` | String | **unique**, e.g. `HP3F9A12BC`, shown to guests |
| `guest` | ObjectId → users | optional (walk-ins) |
| `guestDetails` | `{ name, email, phone }` | snapshot of contact info |
| `room` | ObjectId → rooms | required |
| `checkIn`, `checkOut` | Date | stored as UTC midnight |
| `nights`, `adults`, `children` | Number | |
| `pricePerNight`, `subtotal`, `tax`, `totalAmount` | Number | price is locked at booking time |
| `amountPaid` | Number | `balance` = `totalAmount − amountPaid` (virtual) |
| `status` | `pending` → `confirmed` → `checked_in` → `checked_out`, or `cancelled` | |
| `paymentStatus` | `unpaid` \| `partial` \| `paid` \| `refunded` | |
| `specialRequests`, `cancellationReason` | String | |
| `createdBy` | ObjectId → users | guest or staff member who made it |
| `confirmedAt`, `checkedInAt`, `checkedOutAt`, `cancelledAt` | Date | audit trail |

Indexes: `{ room, checkIn, checkOut }` (availability / conflict queries), `guest`, `status`.

**Availability rule:** a room is unavailable for `[in, out)` if a booking with status
`pending`, `confirmed` or `checked_in` exists where `checkIn < out AND checkOut > in`.

### `payments`
| Field | Type | Notes |
| --- | --- | --- |
| `booking` | ObjectId → bookings | indexed |
| `user` | ObjectId → users | the guest, if any |
| `amount`, `currency` | Number, String | |
| `method` | `card` \| `cash` \| `upi` \| `bank_transfer` | guests can pay by card; staff record all methods |
| `status` | `succeeded` \| `failed` \| `refunded` | failed attempts are kept for auditing |
| `transactionId` | String | from the payment gateway |
| `cardBrand`, `cardLast4` | String | **full card numbers and CVCs are never stored** |
| `failureReason` | String | |
| `processedBy`, `refundedBy` | ObjectId → users | |
| `refundedAt` | Date | |

## Booking lifecycle

```
           pay / staff confirm          staff check-in          staff check-out (balance = 0)
 pending ─────────────────────> confirmed ───────────> checked_in ───────────────────────> checked_out
    │                               │
    └──────────── cancel ───────────┴──> cancelled   (admin can then refund payments)
```
