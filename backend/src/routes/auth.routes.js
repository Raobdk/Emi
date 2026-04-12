const express = require('express');
const router = express.Router();
const {
  register, login, refreshToken, getMe,
  logout, updateProfile, changePassword,
  getAllUsers, toggleUserStatus
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.post('/logout', logout);
router.put('/profile', upload.single('avatar'), updateProfile);
router.put('/change-password', changePassword);

// Admin only
router.get('/users', authorize('admin'), getAllUsers);
router.patch('/users/:id/toggle', authorize('admin'), toggleUserStatus);

module.exports = router;
