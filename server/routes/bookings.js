const express = require('express');
const router = express.Router();
const { repository } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/bookings - Role-scoped bookings list
router.get('/', authenticate, (req, res) => {
  try {
    const bookings = repository.listBookingsForUser(req.user.id, req.user.role);
    res.json({ bookings });
  } catch (err) {
    console.error('List bookings error:', err);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

// POST /api/bookings - Parent requests a session
router.post('/', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Only parent accounts can request sessions.' });
    }

    const { providerId, slotId, note } = req.body;
    if (!providerId) {
      return res.status(400).json({ error: 'Provider ID is required.' });
    }

    const therapist = repository.getTherapistById(providerId);
    if (!therapist) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    let date, time, activity, mode, chosenSlotId = slotId;
    if (slotId) {
      const slot = repository.getSlotById(slotId);
      if (!slot || slot.therapist_id !== providerId || slot.is_booked) {
        return res.status(400).json({ error: 'That appointment opening is no longer available.' });
      }
      date = slot.date;
      time = slot.time;
      activity = slot.activity;
      mode = slot.mode;
    } else if (req.body.date && req.body.time) {
      date = req.body.date;
      time = req.body.time;
      activity = req.body.activity || therapist.specialties[0] || 'Activity';
      mode = req.body.mode || 'In person';
    } else {
      // Pick first upcoming unbooked slot
      const availableSlots = repository.listAvailabilitySlots(providerId, true);
      if (availableSlots.length > 0) {
        const slot = availableSlots[0];
        chosenSlotId = slot.id;
        date = slot.date;
        time = slot.time;
        activity = slot.activity;
        mode = slot.mode;
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        date = todayStr;
        time = '10:00';
        activity = therapist.specialties[0] || 'Support Session';
        mode = 'In person';
      }
    }

    const bookingId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const booking = repository.createBooking({
      id: bookingId,
      parent_id: req.user.id,
      therapist_id: providerId,
      slot_id: chosenSlotId || null,
      date,
      time,
      activity,
      mode,
      note: note ? note.trim() : ''
    });

    res.status(201).json({
      message: 'Session request submitted successfully.',
      booking
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to submit session request.' });
  }
});

// PUT /api/bookings/:id/status - Update booking status
router.put('/:id/status', authenticate, (req, res) => {
  try {
    const booking = repository.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const { status } = req.body;
    const validStatuses = ['confirmed', 'declined', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }

    // Role-based permission validation
    if (req.user.role === 'parent') {
      // Parents can only cancel their own pending/confirmed appointments
      if (booking.parent_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied: not your booking.' });
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'Parents can only cancel appointment requests.' });
      }
    } else {
      // Therapists can only update bookings assigned to their therapist profile
      const therapist = repository.getTherapistByUserId(req.user.id);
      if (!therapist || booking.therapist_id !== therapist.id) {
        return res.status(403).json({ error: 'Access denied: you can only manage your own requests.' });
      }
      if (status === 'cancelled') {
        return res.status(400).json({ error: 'Providers cannot cancel for parents. Choose decline instead.' });
      }
    }

    const updated = repository.updateBookingStatus(booking.id, status);

    res.json({
      message: `Appointment ${status} successfully.`,
      booking: updated
    });
  } catch (err) {
    console.error('Update booking status error:', err);
    res.status(500).json({ error: 'Failed to update appointment status.' });
  }
});

module.exports = router;
