const express = require('express');
const router = express.Router();
const { repository } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/messages/threads - List active conversation threads
router.get('/threads', authenticate, (req, res) => {
  try {
    const threads = repository.listConversationThreadsForUser(req.user.id, req.user.role);
    res.json({ threads });
  } catch (err) {
    console.error('List threads error:', err);
    res.status(500).json({ error: 'Failed to retrieve message threads.' });
  }
});

// GET /api/messages/:partnerId - Chat messages between logged in user and partner
router.get('/:partnerId', authenticate, (req, res) => {
  try {
    const partnerId = req.params.partnerId;
    let therapistId, parentId;

    if (req.user.role === 'parent') {
      parentId = req.user.id;
      therapistId = partnerId;
      const therapist = repository.getTherapistById(therapistId);
      if (!therapist) {
        return res.status(404).json({ error: 'Provider not found.' });
      }
    } else {
      // Therapist role
      const therapist = repository.getTherapistByUserId(req.user.id);
      if (!therapist) {
        return res.status(404).json({ error: 'Therapist profile not found.' });
      }
      therapistId = therapist.id;
      parentId = partnerId;
      const parent = repository.getUserById(parentId);
      if (!parent || parent.role !== 'parent') {
        return res.status(404).json({ error: 'Family not found.' });
      }
    }

    const messages = repository.getMessagesBetween(therapistId, parentId);

    res.json({
      therapistId,
      parentId,
      messages: messages.map(m => ({
        id: m.id,
        fromRole: m.from_role,
        isMine: req.user.role === m.from_role,
        text: m.text,
        createdAt: m.created_at,
        time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }))
    });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to retrieve conversation.' });
  }
});

// POST /api/messages/:partnerId - Send message
router.post('/:partnerId', authenticate, (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const partnerId = req.params.partnerId;
    let therapistId, parentId;

    if (req.user.role === 'parent') {
      parentId = req.user.id;
      therapistId = partnerId;
      const therapist = repository.getTherapistById(therapistId);
      if (!therapist) {
        return res.status(404).json({ error: 'Provider not found.' });
      }
    } else {
      const therapist = repository.getTherapistByUserId(req.user.id);
      if (!therapist) {
        return res.status(404).json({ error: 'Therapist profile not found.' });
      }
      therapistId = therapist.id;
      parentId = partnerId;
      const parent = repository.getUserById(parentId);
      if (!parent || parent.role !== 'parent') {
        return res.status(404).json({ error: 'Family account not found.' });
      }
    }

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const message = repository.createMessage({
      id: msgId,
      therapist_id: therapistId,
      parent_id: parentId,
      from_role: req.user.role,
      sender_id: req.user.id,
      text: text.trim()
    });

    res.status(201).json({
      message: 'Message sent.',
      data: {
        id: message.id,
        fromRole: message.from_role,
        isMine: true,
        text: message.text,
        createdAt: message.created_at,
        time: new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

module.exports = router;
