const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { repository } = require('../db/database');
const { authenticate } = require('../middleware/auth');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      role,
      name,
      email,
      password,
      childName,
      phone,
      profession,
      specialties,
      qualifications,
      isDoctor,
      registrationNumber,
      registrationCouncil,
      area,
      experienceYears
    } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must have at least 6 characters.' });
    }

    if (!['parent', 'therapist'].includes(role)) {
      return res.status(400).json({ error: 'Invalid account role.' });
    }

    const existingUser = repository.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with that email already exists. Please sign in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (role === 'parent') {
      if (!childName || !childName.trim()) {
        return res.status(400).json({ error: 'Please provide your child’s name for the family workspace.' });
      }

      const user = repository.createUser({
        id: userId,
        email,
        password_hash: passwordHash,
        role: 'parent',
        name: name.trim(),
        child_name: childName.trim(),
        child_age: req.body.childAge ? String(req.body.childAge).trim() : null,
        phone: req.body.phone ? String(req.body.phone).trim() : null,
        location: area ? area.trim() : null
      });

      const token = generateToken(user);
      return res.status(201).json({
        message: 'Family account created successfully.',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          childName: user.child_name,
          childAge: user.child_age,
          phone: user.phone,
          location: user.location
        }
      });
    } else {
      // Therapist registration
      if (!profession || !phone) {
        return res.status(400).json({ error: 'Please provide your professional title and contact phone number.' });
      }

      if (isDoctor && (!registrationNumber || !registrationCouncil)) {
        return res.status(400).json({ error: 'Doctor registration number and issuing medical council are required.' });
      }

      const specs = Array.isArray(specialties)
        ? specialties
        : (specialties || '').split(',').map(s => s.trim()).filter(Boolean);

      if (!specs.length) {
        return res.status(400).json({ error: 'Please add at least one activity you offer.' });
      }

      const quals = Array.isArray(qualifications)
        ? qualifications
        : (qualifications || '').split('\n').map(q => q.trim()).filter(Boolean);

      const fee = req.body.sessionFee ? Number(req.body.sessionFee) : 700;

      const user = repository.createUser({
        id: userId,
        email,
        password_hash: passwordHash,
        role: 'therapist',
        name: name.trim(),
        child_name: null,
        child_age: null,
        phone: phone.trim(),
        location: area ? area.trim() : null
      });

      const therapist = repository.createTherapist({
        id: userId,
        user_id: user.id,
        name: user.name,
        profession: profession.trim(),
        specialties: specs,
        bio: req.body.bio && req.body.bio.trim()
          ? req.body.bio.trim()
          : `I support neurodivergent children to explore ${specs.join(', ')} at their own pace. Families can message me to discuss accommodations and session details.`,
        qualifications: quals.length ? quals : ['Inclusive activity training'],
        experience_years: Number(experienceYears) || 0,
        area: area ? area.trim() : '',
        formats: ['In person'],
        languages: ['English'],
        approach: req.body.approach && req.body.approach.trim()
          ? req.body.approach.trim()
          : 'A predictable plan, meaningful choices, flexible pacing, and sensory breaks whenever needed.',
        session_fee: fee,
        offer: null,
        phone: phone.trim(),
        email: user.email,
        is_doctor: Boolean(isDoctor),
        registration_number: isDoctor ? (registrationNumber || '').trim() : '',
        registration_council: isDoctor ? (registrationCouncil || '').trim() : '',
        initials: user.name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(),
        tone: 'green',
        photo: null,
        listed: 1
      });

      const token = generateToken(user);
      return res.status(201).json({
        message: 'Therapist provider account created successfully.',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          phone: user.phone,
          location: user.location,
          therapistId: therapist.id
        },
        therapistProfile: therapist
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error creating account. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both your email address and password.' });
    }

    const user = repository.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    let therapistId = null;
    let therapistProfile = null;
    if (user.role === 'therapist') {
      therapistProfile = repository.getTherapistByUserId(user.id);
      therapistId = therapistProfile ? therapistProfile.id : user.id;
    }

    const token = generateToken(user);

    res.json({
      message: 'Sign-in successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        childName: user.child_name,
        childAge: user.child_age,
        phone: user.phone,
        location: user.location,
        therapistId
      },
      therapistProfile
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during sign-in.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = repository.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  let therapistProfile = null;
  if (user.role === 'therapist') {
    therapistProfile = repository.getTherapistByUserId(user.id);
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      childName: user.child_name,
      childAge: user.child_age,
      phone: user.phone,
      location: user.location,
      therapistId: therapistProfile ? therapistProfile.id : null
    },
    therapistProfile
  });
});

// PUT /api/auth/profile - Parent or User profile update
router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, childName, childAge, phone, location } = req.body;
    const updated = repository.updateUserProfile(req.user.id, {
      name,
      child_name: childName,
      child_age: childAge,
      phone,
      location
    });

    if (!updated) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        name: updated.name,
        childName: updated.child_name,
        childAge: updated.child_age,
        phone: updated.phone,
        location: updated.location
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Signed out successfully.' });
});

module.exports = router;
