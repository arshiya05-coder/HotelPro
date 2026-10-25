import { signToken } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';

export const register = asyncHandler(async (req, res) => {
  if (await User.exists({ email: req.body.email })) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  // Public sign-up always creates a guest; staff accounts are created by admins.
  const user = await User.create({ ...req.body, role: 'guest' });
  res.status(201).json({ token: signToken(user), user });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled. Contact the front desk.');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  res.json({ token: signToken(user), user });
});

export const me = (req, res) => res.json({ user: req.user });

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ user: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  user.password = req.body.newPassword;
  await user.save();
  res.json({ message: 'Password updated', token: signToken(user) });
});
