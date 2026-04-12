const Notification = require('../models/Notification');
const { getPagination, paginatedResponse } = require('../utils/helpers');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
const getNotifications = async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const { skip } = getPagination(page, limit);

  const query = {};
  if (unreadOnly === 'true') query.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate('customerId', 'name customerId')
      .populate('installmentPlanId', 'planId productName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments(query),
    Notification.countDocuments({ isRead: false })
  ]);

  res.json({
    success: true,
    unreadCount,
    ...paginatedResponse(notifications, total, page, limit)
  });
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  res.json({ success: true, notification });
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  await Notification.updateMany({ isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read' });
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Notification deleted' });
};

// @desc    Get unread count
// @route   GET /api/notifications/count
const getUnreadCount = async (req, res) => {
  const count = await Notification.countDocuments({ isRead: false });
  res.json({ success: true, count });
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
};
