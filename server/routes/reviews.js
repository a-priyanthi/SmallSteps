const express = require('express');
const router = express.Router();
const { repository } = require('../db/database');
const { authenticate, requireParent, optionalAuth } = require('../middleware/auth');

// GET /api/reviews/:therapistId - Get reviews for a therapist
router.get('/:therapistId', optionalAuth, (req, res) => {
  try {
    const therapist = repository.getTherapistById(req.params.therapistId);
    if (!therapist) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const reviews = repository.getReviewsForTherapist(therapist.id);
    const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    res.json({
      therapist: {
        id: therapist.id,
        name: therapist.name,
        profession: therapist.profession,
        area: therapist.area
      },
      average: avg ? avg.toFixed(1) : '—',
      count: reviews.length,
      reviews
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Failed to retrieve reviews.' });
  }
});

// POST /api/reviews/:therapistId - Parent submits a review
router.post('/:therapistId', authenticate, requireParent, (req, res) => {
  try {
    const therapist = repository.getTherapistById(req.params.therapistId);
    if (!therapist) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const { rating, text, author } = req.body;
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Please enter review feedback.' });
    }

    const parent = repository.getUserById(req.user.id);
    const authorName = author && author.trim()
      ? author.trim()
      : (parent && parent.child_name ? `${parent.name} (Parent of ${parent.child_name})` : 'Family review');

    const revId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const review = repository.createReview({
      id: revId,
      therapist_id: therapist.id,
      parent_id: req.user.id,
      author: authorName,
      rating: numRating,
      text: text.trim()
    });

    res.status(201).json({
      message: 'Review posted successfully.',
      review
    });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
});

module.exports = router;
