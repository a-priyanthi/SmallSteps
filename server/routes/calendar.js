const express = require('express');
const router = express.Router();
const { repository } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/calendar - Monthly events aggregated by user role
router.get('/', authenticate, (req, res) => {
  try {
    const today = new Date();
    const year = parseInt(req.query.year, 10) || today.getFullYear();
    const month = parseInt(req.query.month, 10) || (today.getMonth() + 1);

    const events = repository.getCalendarEvents(req.user.id, req.user.role, year, month);

    res.json({
      year,
      month,
      events
    });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Failed to retrieve calendar schedule.' });
  }
});

module.exports = router;
