const User = require('../models/Users');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Admin only
const register = async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({ name, email, password, role, phone });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    user,
    accessToken,
    refreshToken
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.lastLogin = new Date();
  user.refreshToken = refreshToken;
  await user.save();

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    message: 'Login successful',
    user,
    accessToken,
    refreshToken
  });
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    res.json({ success: true, accessToken: newAccessToken });
  } catch {
    res.status(401).json({ success: false, message: 'Token expired or invalid' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Protected
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Protected
const logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Protected
const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const updates = { name, phone };

  if (req.file) {
    updates.avatar = `/uploads/avatars/${req.file.filename}`;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true, runValidators: true
  });

  res.json({ success: true, message: 'Profile updated', user });
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Protected
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Admin
const getAllUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
};

// @desc    Toggle user active status (admin only)
// @route   PATCH /api/auth/users/:id/toggle
// @access  Admin
const toggleUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.isActive = !user.isActive;
  await user.save();

  res.json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    user
  });
};

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  updateProfile,
  changePassword,
  getAllUsers,
  toggleUserStatus
};
