const express = require('express');
const router = express.Router();
const { repository } = require('../db/database');
const { authenticate, requireParent, optionalAuth } = require('../middleware/auth');

// GET /api/community - List all community NGO programs
router.get('/', optionalAuth, (req, res) => {
  try {
    const { q, area, maxFee } = req.query;
    const programs = repository.listCommunityPrograms({ q, area, maxFee });
    res.json({ programs });
  } catch (err) {
    console.error('List community programs error:', err);
    res.status(500).json({ error: 'Failed to retrieve community programs.' });
  }
});

// GET /api/community/my-registrations - Parent registrations
router.get('/my-registrations', authenticate, requireParent, (req, res) => {
  try {
    const registrations = repository.listCommunityRegistrationsForParent(req.user.id);
    res.json({ registrations });
  } catch (err) {
    console.error('List registrations error:', err);
    res.status(500).json({ error: 'Failed to retrieve registrations.' });
  }
});

// GET /api/community/:id - Program details
router.get('/:id', (req, res) => {
  try {
    const program = repository.getCommunityProgramById(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Community program not found.' });
    }
    res.json({ program });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve program details.' });
  }
});

// POST /api/community/:id/register - Parent registration for community program
router.post('/:id/register', authenticate, requireParent, (req, res) => {
  try {
    const program = repository.getCommunityProgramById(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Community program not found.' });
    }

    const { parentName, email, childAge, note } = req.body;
    if (!parentName || !email || !childAge) {
      return res.status(400).json({ error: 'Parent name, contact email, and child’s age are required.' });
    }

    const regId = `ngo-reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const registration = repository.createCommunityRegistration({
      id: regId,
      program_id: program.id,
      parent_id: req.user.id,
      parent_name: parentName.trim(),
      email: email.trim(),
      child_age: Number(childAge),
      note: note ? note.trim() : ''
    });

    res.status(201).json({
      message: 'Registration request submitted.',
      registration
    });
  } catch (err) {
    console.error('Register program error:', err);
    res.status(500).json({ error: 'Failed to submit registration request.' });
  }
});

module.exports = router;
