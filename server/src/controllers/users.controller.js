import { User } from '../models/User.js';
import { ApiError, asyncHandler, escapeRegex } from '../utils/helpers.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ users });
});

export const createUser = asyncHandler(async (req, res) => {
  if (await User.exists({ email: req.body.email })) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  const user = await User.create(req.body);
  res.status(201).json({ user });
});

export const updateUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw new ApiError(400, 'You cannot change your own role or status');
  }
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user });
});
