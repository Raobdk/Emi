const express = require('express');
const router = express.Router();
const { chat, getPredictions, getInsights } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/chat', chat);
router.get('/predictions', getPredictions);
router.get('/insights', getInsights);

module.exports = router;
