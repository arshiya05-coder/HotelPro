import mongoose from 'mongoose';

export const ROOM_TYPES = ['single', 'double', 'deluxe', 'suite'];
export const ROOM_STATUSES = ['operational', 'maintenance', 'out_of_service'];
export const HOUSEKEEPING_STATUSES = ['clean', 'dirty', 'inspecting'];

const roomSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ROOM_TYPES, required: true },
    pricePerNight: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1 },
    floor: { type: Number, default: 1 },
    amenities: [{ type: String, trim: true }],
    description: { type: String, maxlength: 1000 },
    imageUrl: String,
    // Operational status is set by staff; occupancy is derived from bookings.
    status: { type: String, enum: ROOM_STATUSES, default: 'operational' },
    housekeeping: { type: String, enum: HOUSEKEEPING_STATUSES, default: 'clean' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ type: 1, pricePerNight: 1 });

export const Room = mongoose.model('Room', roomSchema);
