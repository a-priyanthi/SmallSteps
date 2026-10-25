const express = require('express');
const router = express.Router();
const { repository } = require('../db/database');
const { authenticate, requireTherapist, optionalAuth } = require('../middleware/auth');

// GET /api/providers - List providers with optional search & filters
router.get('/', optionalAuth, (req, res) => {
  try {
    const { q, area, mode, category, maxFee } = req.query;
    const providers = repository.listTherapists({
      q,
      area,
      mode,
      category,
      maxFee,
      listedOnly: true
    });
    res.json({ providers });
  } catch (err) {
    console.error('List providers error:', err);
    res.status(500).json({ error: 'Failed to retrieve providers directory.' });
  }
});

// GET /api/providers/activities - List all distinct activities across providers
router.get('/activities/list', (req, res) => {
  try {
    const base = ['Swimming', 'Music', 'Art', 'Sports', 'Cooking', 'Outdoor play', 'Community activities'];
    const providers = repository.listTherapists({ listedOnly: true });
    const allActivities = new Set(base);
    for (const p of providers) {
      if (Array.isArray(p.specialties)) {
        p.specialties.forEach(s => allActivities.add(s.trim()));
      }
    }
    res.json({ activities: Array.from(allActivities).sort((a, b) => a.localeCompare(b)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve activities list.' });
  }
});

// GET /api/providers/:id - Get detailed profile of a provider
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const provider = repository.getTherapistById(req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const slots = repository.listAvailabilitySlots(provider.id, true);
    const reviews = repository.getReviewsForTherapist(provider.id);
    const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    res.json({
      provider: {
        ...provider,
        slots,
        reviews,
        reviewsCount: reviews.length,
        averageRating: avg ? avg.toFixed(1) : '—'
      }
    });
  } catch (err) {
    console.error('Get provider error:', err);
    res.status(500).json({ error: 'Failed to retrieve provider details.' });
  }
});

// PUT /api/providers/profile - Therapist updates own profile
router.put('/profile', authenticate, requireTherapist, (req, res) => {
  try {
    const therapist = repository.getTherapistByUserId(req.user.id);
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist profile not found for this account.' });
    }

    const {
      name,
      profession,
      specialties,
      bio,
      qualifications,
      approach,
      experienceYears,
      area,
      formats,
      languages,
      phone,
      email,
      isDoctor,
      registrationNumber,
      registrationCouncil,
      photo,
      listed
    } = req.body;

    if (isDoctor && (!registrationNumber || !registrationCouncil)) {
      return res.status(400).json({ error: 'Medical registration number and council are required for doctor profiles.' });
    }

    const specs = Array.isArray(specialties)
      ? specialties
      : (specialties || '').split(',').map(s => s.trim()).filter(Boolean);

    const quals = Array.isArray(qualifications)
      ? qualifications
      : (qualifications || '').split('\n').map(q => q.trim()).filter(Boolean);

    const fmts = Array.isArray(formats)
      ? formats
      : (formats || '').split(',').map(f => f.trim()).filter(Boolean);

    const langs = Array.isArray(languages)
      ? languages
      : (languages || '').split(',').map(l => l.trim()).filter(Boolean);

    const updated = repository.updateTherapist(therapist.id, {
      name: name ? name.trim() : therapist.name,
      profession: profession ? profession.trim() : therapist.profession,
      specialties: specs.length ? specs : therapist.specialties,
      bio: bio !== undefined ? bio.trim() : therapist.bio,
      qualifications: quals.length ? quals : therapist.qualifications,
      approach: approach !== undefined ? approach.trim() : therapist.approach,
      experience_years: experienceYears !== undefined ? Number(experienceYears) : therapist.experience_years,
      area: area !== undefined ? area.trim() : therapist.area,
      formats: fmts.length ? fmts : therapist.formats,
      languages: langs.length ? langs : therapist.languages,
      phone: phone !== undefined ? phone.trim() : therapist.phone,
      email: email !== undefined ? email.trim().toLowerCase() : therapist.email,
      is_doctor: isDoctor !== undefined ? Boolean(isDoctor) : therapist.is_doctor,
      registration_number: isDoctor ? (registrationNumber || '').trim() : '',
      registration_council: isDoctor ? (registrationCouncil || '').trim() : '',
      photo: photo !== undefined ? photo : therapist.photo,
      listed: listed !== undefined ? Boolean(listed) : therapist.listed,
      initials: name ? name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase() : therapist.initials
    });

    res.json({
      message: 'Provider profile updated successfully.',
      provider: updated
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/providers/pricing - Therapist updates fees and limited-time offer
router.put('/pricing', authenticate, requireTherapist, (req, res) => {
  try {
    const therapist = repository.getTherapistByUserId(req.user.id);
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist profile not found.' });
    }

    const { sessionFee, offer } = req.body;
    if (sessionFee === undefined || isNaN(Number(sessionFee)) || Number(sessionFee) < 0) {
      return res.status(400).json({ error: 'Please enter a valid session fee.' });
    }

    let parsedOffer = null;
    if (offer && Number(offer.percent) > 0) {
      if (!offer.startDate || !offer.endDate) {
        return res.status(400).json({ error: 'Please specify both start and end dates for the promotional offer.' });
      }
      if (offer.endDate < offer.startDate) {
        return res.status(400).json({ error: 'Offer end date must be on or after the start date.' });
      }
      parsedOffer = {
        percent: Number(offer.percent),
        startDate: offer.startDate,
        endDate: offer.endDate
      };
    }

    const updated = repository.updateTherapist(therapist.id, {
      session_fee: Number(sessionFee),
      offer: parsedOffer
    });

    res.json({
      message: 'Fees and limited-time offer saved.',
      provider: updated
    });
  } catch (err) {
    console.error('Update pricing error:', err);
    res.status(500).json({ error: 'Failed to update pricing.' });
  }
});

// POST /api/providers/availability - Therapist adds open appointment slot
router.post('/availability', authenticate, requireTherapist, (req, res) => {
  try {
    const therapist = repository.getTherapistByUserId(req.user.id);
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist profile not found.' });
    }

    const { date, time, activity, mode } = req.body;
    if (!date || !time || !activity) {
      return res.status(400).json({ error: 'Date, time, and activity are required.' });
    }

    const slotId = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const slot = repository.createAvailabilitySlot({
      id: slotId,
      therapist_id: therapist.id,
      date,
      time,
      activity: activity.trim(),
      mode: mode || 'In person'
    });

    res.status(201).json({
      message: 'Availability opening added.',
      slot
    });
  } catch (err) {
    console.error('Add slot error:', err);
    res.status(500).json({ error: 'Failed to add availability slot.' });
  }
});

// DELETE /api/providers/availability/:slotId - Therapist removes an opening
router.delete('/availability/:slotId', authenticate, requireTherapist, (req, res) => {
  try {
    const therapist = repository.getTherapistByUserId(req.user.id);
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist profile not found.' });
    }

    const success = repository.deleteAvailabilitySlot(req.params.slotId, therapist.id);
    if (!success) {
      return res.status(404).json({ error: 'Slot not found or not owned by you.' });
    }

    res.json({ message: 'Opening removed successfully.' });
  } catch (err) {
    console.error('Delete slot error:', err);
    res.status(500).json({ error: 'Failed to remove availability opening.' });
  }
});

module.exports = router;
