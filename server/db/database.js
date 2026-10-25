const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');
const { generateSeedData } = require('./seed-data');

// Ensure data directory exists
const dataDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// If running in Vercel serverless environment, copy pre-seeded DB to writable /tmp
if (config.IS_VERCEL) {
  const seededDbPath = path.join(__dirname, '..', '..', 'data', 'small_steps.db');
  if (!fs.existsSync(config.DB_PATH) && fs.existsSync(seededDbPath)) {
    try {
      fs.copyFileSync(seededDbPath, config.DB_PATH);
      console.log('Copied pre-seeded SQLite DB to /tmp for Vercel serverless environment.');
    } catch (e) {
      console.warn('Could not copy pre-seeded database, will initialize fresh:', e.message);
    }
  }
}

const db = new DatabaseSync(config.DB_PATH);

// Enable foreign keys and WAL mode for reliability
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('parent', 'therapist')),
      name TEXT NOT NULL,
      child_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS therapist_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      profession TEXT NOT NULL,
      specialties TEXT NOT NULL, -- JSON array
      bio TEXT NOT NULL,
      qualifications TEXT NOT NULL, -- JSON array
      experience_years INTEGER NOT NULL DEFAULT 0,
      area TEXT NOT NULL DEFAULT '',
      formats TEXT NOT NULL, -- JSON array
      languages TEXT NOT NULL, -- JSON array
      approach TEXT NOT NULL DEFAULT '',
      session_fee NUMERIC NOT NULL DEFAULT 700,
      offer TEXT, -- JSON object: { percent, startDate, endDate } or NULL
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      is_doctor INTEGER NOT NULL DEFAULT 0,
      registration_number TEXT NOT NULL DEFAULT '',
      registration_council TEXT NOT NULL DEFAULT '',
      initials TEXT NOT NULL DEFAULT '',
      tone TEXT NOT NULL DEFAULT 'green',
      photo TEXT,
      listed INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      activity TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'In person',
      is_booked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      therapist_id TEXT NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
      slot_id TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      activity TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'In person',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'declined', 'completed', 'cancelled')),
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_programs (
      id TEXT PRIMARY KEY,
      org TEXT NOT NULL,
      title TEXT NOT NULL,
      activity TEXT NOT NULL,
      area TEXT NOT NULL,
      date TEXT NOT NULL,
      deadline TEXT NOT NULL,
      sessions INTEGER NOT NULL DEFAULT 1,
      duration TEXT NOT NULL,
      age TEXT NOT NULL,
      fee NUMERIC NOT NULL DEFAULT 0,
      details TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_registrations (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES community_programs(id) ON DELETE CASCADE,
      parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_name TEXT NOT NULL,
      email TEXT NOT NULL,
      child_age INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
      parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_role TEXT NOT NULL CHECK(from_role IN ('parent', 'therapist')),
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
      parent_id TEXT,
      author TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Check if seeding is needed
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  console.log('🌱 Seeding Small Steps database with rich sample data...');
  const seed = generateSeedData();

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, name, child_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTherapist = db.prepare(`
    INSERT INTO therapist_profiles (
      id, user_id, name, profession, specialties, bio, qualifications,
      experience_years, area, formats, languages, approach, session_fee,
      offer, phone, email, is_doctor, registration_number, registration_council,
      initials, tone, photo, listed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSlot = db.prepare(`
    INSERT INTO availability_slots (id, therapist_id, date, time, activity, mode, is_booked)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProgram = db.prepare(`
    INSERT INTO community_programs (id, org, title, activity, area, date, deadline, sessions, duration, age, fee, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, parent_id, therapist_id, slot_id, date, time, activity, mode, status, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT INTO messages (id, therapist_id, parent_id, from_role, sender_id, text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (id, therapist_id, parent_id, author, rating, text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Insert Users
  for (const u of seed.users) {
    insertUser.run(u.id, u.email.toLowerCase(), u.password_hash, u.role, u.name, u.child_name, u.created_at);
  }

  // Insert Therapists
  for (const t of seed.therapists) {
    insertTherapist.run(
      t.id,
      t.user_id,
      t.name,
      t.profession,
      JSON.stringify(t.specialties),
      t.bio,
      JSON.stringify(t.qualifications),
      t.experience_years,
      t.area,
      JSON.stringify(t.formats),
      JSON.stringify(t.languages),
      t.approach,
      t.session_fee,
      t.offer ? JSON.stringify(t.offer) : null,
      t.phone,
      t.email.toLowerCase(),
      t.is_doctor,
      t.registration_number,
      t.registration_council,
      t.initials,
      t.tone,
      t.photo,
      t.listed
    );
  }

  // Insert Slots
  for (const s of seed.slots) {
    insertSlot.run(s.id, s.therapist_id, s.date, s.time, s.activity, s.mode || 'In person', 0);
  }

  // Insert Community Programs
  for (const p of seed.communityPrograms) {
    insertProgram.run(p.id, p.org, p.title, p.activity, p.area, p.date, p.deadline, p.sessions, p.duration, p.age, p.fee, p.details);
  }

  // Insert Bookings
  for (const b of seed.bookings) {
    insertBooking.run(b.id, b.parent_id, b.therapist_id, b.slot_id, b.date, b.time, b.activity, b.mode, b.status, b.note, b.created_at, b.updated_at);
  }

  // Insert Messages
  for (const m of seed.messages) {
    insertMessage.run(m.id, m.therapist_id, m.parent_id, m.from_role, m.sender_id, m.text, m.created_at);
  }

  // Insert Reviews
  for (const r of seed.reviews) {
    insertReview.run(r.id, r.therapist_id, r.parent_id, r.author, r.rating, r.text, r.created_at);
  }

  console.log('✅ Small Steps database initialized and seeded successfully.');
}

// Model Repository Helpers
const repository = {
  // Users
  getUserByEmail(email) {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    return row || null;
  },

  getUserById(id) {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row || null;
  },

  createUser({ id, email, password_hash, role, name, child_name }) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, name, child_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase().trim(), password_hash, role, name, child_name || null, new Date().toISOString());
    return this.getUserById(id);
  },

  updateParentChildName(userId, childName) {
    db.prepare('UPDATE users SET child_name = ? WHERE id = ?').run(childName, userId);
    return this.getUserById(userId);
  },

  // Therapists
  getTherapistById(id) {
    const row = db.prepare('SELECT * FROM therapist_profiles WHERE id = ?').get(id);
    if (!row) return null;
    return this._formatTherapist(row);
  },

  getTherapistByUserId(userId) {
    const row = db.prepare('SELECT * FROM therapist_profiles WHERE user_id = ?').get(userId);
    if (!row) return null;
    return this._formatTherapist(row);
  },

  listTherapists({ q = '', area = '', mode = 'all', category = 'All activities', maxFee = null, listedOnly = true } = {}) {
    let sql = 'SELECT * FROM therapist_profiles WHERE 1=1';
    const params = [];

    if (listedOnly) {
      sql += ' AND listed = 1';
    }

    const rows = db.prepare(sql).all(...params);
    let list = rows.map(r => this._formatTherapist(r));

    // Client/Filter logic
    if (category && category !== 'All activities') {
      const catLower = category.toLowerCase();
      list = list.filter(t => t.specialties.some(s => s.toLowerCase().includes(catLower)));
    }

    if (mode && mode !== 'all') {
      list = list.filter(t => t.formats.includes(mode));
    }

    if (area) {
      const areaLower = area.toLowerCase().trim();
      list = list.filter(t => (t.area || '').toLowerCase().includes(areaLower));
    }

    if (maxFee !== null && maxFee !== '' && !isNaN(Number(maxFee))) {
      const feeLimit = Number(maxFee);
      list = list.filter(t => {
        let effFee = Number(t.session_fee);
        if (t.offer && Number(t.offer.percent)) {
          effFee = Math.round(effFee * (100 - Number(t.offer.percent)) / 100);
        }
        return effFee <= feeLimit;
      });
    }

    if (q) {
      const queryLower = q.toLowerCase().trim();
      list = list.filter(t => {
        const hay = [
          t.name,
          t.profession,
          t.bio,
          t.area,
          ...t.formats,
          ...t.specialties,
          ...t.qualifications
        ].join(' ').toLowerCase();
        return hay.includes(queryLower);
      });
    }

    // Attach upcoming slots and reviews summary
    for (const t of list) {
      t.slots = this.listAvailabilitySlots(t.id, true);
      const reviews = this.getReviewsForTherapist(t.id);
      const avg = reviews.length ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
      t.reviewsCount = reviews.length;
      t.averageRating = avg ? avg.toFixed(1) : '—';
    }

    return list;
  },

  createTherapist(data) {
    db.prepare(`
      INSERT INTO therapist_profiles (
        id, user_id, name, profession, specialties, bio, qualifications,
        experience_years, area, formats, languages, approach, session_fee,
        offer, phone, email, is_doctor, registration_number, registration_council,
        initials, tone, photo, listed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.user_id,
      data.name,
      data.profession,
      JSON.stringify(data.specialties || []),
      data.bio || '',
      JSON.stringify(data.qualifications || []),
      Number(data.experience_years) || 0,
      data.area || '',
      JSON.stringify(data.formats || ['In person']),
      JSON.stringify(data.languages || ['English']),
      data.approach || '',
      Number(data.session_fee) || 700,
      data.offer ? JSON.stringify(data.offer) : null,
      data.phone || '',
      data.email.toLowerCase(),
      data.is_doctor ? 1 : 0,
      data.registration_number || '',
      data.registration_council || '',
      data.initials || '',
      data.tone || 'green',
      data.photo || null,
      data.listed !== undefined ? (data.listed ? 1 : 0) : 1
    );
    return this.getTherapistById(data.id);
  },

  updateTherapist(id, data) {
    const current = this.getTherapistById(id);
    if (!current) return null;

    db.prepare(`
      UPDATE therapist_profiles SET
        name = ?,
        profession = ?,
        specialties = ?,
        bio = ?,
        qualifications = ?,
        experience_years = ?,
        area = ?,
        formats = ?,
        languages = ?,
        approach = ?,
        session_fee = ?,
        offer = ?,
        phone = ?,
        email = ?,
        is_doctor = ?,
        registration_number = ?,
        registration_council = ?,
        initials = ?,
        tone = ?,
        photo = ?,
        listed = ?
      WHERE id = ?
    `).run(
      data.name !== undefined ? data.name : current.name,
      data.profession !== undefined ? data.profession : current.profession,
      JSON.stringify(data.specialties !== undefined ? data.specialties : current.specialties),
      data.bio !== undefined ? data.bio : current.bio,
      JSON.stringify(data.qualifications !== undefined ? data.qualifications : current.qualifications),
      Number(data.experience_years !== undefined ? data.experience_years : current.experience_years),
      data.area !== undefined ? data.area : current.area,
      JSON.stringify(data.formats !== undefined ? data.formats : current.formats),
      JSON.stringify(data.languages !== undefined ? data.languages : current.languages),
      data.approach !== undefined ? data.approach : current.approach,
      Number(data.session_fee !== undefined ? data.session_fee : current.session_fee),
      data.offer !== undefined ? (data.offer ? JSON.stringify(data.offer) : null) : (current.offer ? JSON.stringify(current.offer) : null),
      data.phone !== undefined ? data.phone : current.phone,
      data.email !== undefined ? data.email.toLowerCase() : current.email,
      data.is_doctor !== undefined ? (data.is_doctor ? 1 : 0) : current.is_doctor,
      data.registration_number !== undefined ? data.registration_number : current.registration_number,
      data.registration_council !== undefined ? data.registration_council : current.registration_council,
      data.initials !== undefined ? data.initials : current.initials,
      data.tone !== undefined ? data.tone : current.tone,
      data.photo !== undefined ? data.photo : current.photo,
      data.listed !== undefined ? (data.listed ? 1 : 0) : current.listed,
      id
    );

    return this.getTherapistById(id);
  },

  _formatTherapist(row) {
    return {
      ...row,
      specialties: typeof row.specialties === 'string' ? JSON.parse(row.specialties || '[]') : row.specialties,
      qualifications: typeof row.qualifications === 'string' ? JSON.parse(row.qualifications || '[]') : row.qualifications,
      formats: typeof row.formats === 'string' ? JSON.parse(row.formats || '[]') : row.formats,
      languages: typeof row.languages === 'string' ? JSON.parse(row.languages || '[]') : row.languages,
      offer: typeof row.offer === 'string' && row.offer ? JSON.parse(row.offer) : row.offer,
      is_doctor: Boolean(row.is_doctor),
      listed: Boolean(row.listed)
    };
  },

  // Availability Slots
  listAvailabilitySlots(therapistId, unbookedOnly = false) {
    let sql = 'SELECT * FROM availability_slots WHERE therapist_id = ?';
    if (unbookedOnly) {
      sql += ' AND is_booked = 0';
    }
    sql += ' ORDER BY date ASC, time ASC';
    return db.prepare(sql).all(therapistId);
  },

  getSlotById(id) {
    return db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(id) || null;
  },

  createAvailabilitySlot({ id, therapist_id, date, time, activity, mode }) {
    db.prepare(`
      INSERT INTO availability_slots (id, therapist_id, date, time, activity, mode, is_booked)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(id, therapist_id, date, time, activity, mode || 'In person');
    return this.getSlotById(id);
  },

  deleteAvailabilitySlot(id, therapistId) {
    const result = db.prepare('DELETE FROM availability_slots WHERE id = ? AND therapist_id = ?').run(id, therapistId);
    return result.changes > 0;
  },

  markSlotBooked(id, isBooked = true) {
    db.prepare('UPDATE availability_slots SET is_booked = ? WHERE id = ?').run(isBooked ? 1 : 0, id);
  },

  // Bookings
  createBooking({ id, parent_id, therapist_id, slot_id, date, time, activity, mode, note }) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO bookings (id, parent_id, therapist_id, slot_id, date, time, activity, mode, status, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(id, parent_id, therapist_id, slot_id || null, date, time, activity, mode || 'In person', note || '', now, now);

    if (slot_id) {
      this.markSlotBooked(slot_id, true);
    }
    return this.getBookingById(id);
  },

  getBookingById(id) {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return null;
    const parent = this.getUserById(booking.parent_id);
    const therapist = this.getTherapistById(booking.therapist_id);
    return {
      ...booking,
      parentName: parent ? parent.name : 'Parent',
      childName: parent ? parent.child_name : '',
      therapistName: therapist ? therapist.name : 'Provider',
      therapistProfession: therapist ? therapist.profession : '',
      therapistInitial: therapist ? therapist.initials : 'P',
      therapistTone: therapist ? therapist.tone : 'green'
    };
  },

  listBookingsForUser(userId, role) {
    let sql = '';
    if (role === 'parent') {
      sql = 'SELECT * FROM bookings WHERE parent_id = ? ORDER BY date DESC, time DESC';
    } else {
      // Find therapist profile ID for this user
      const t = this.getTherapistByUserId(userId);
      if (!t) return [];
      sql = 'SELECT * FROM bookings WHERE therapist_id = ? ORDER BY date DESC, time DESC';
      userId = t.id;
    }

    const rows = db.prepare(sql).all(userId);
    return rows.map(b => {
      const parent = this.getUserById(b.parent_id);
      const therapist = this.getTherapistById(b.therapist_id);
      return {
        ...b,
        parentName: parent ? parent.name : 'Parent',
        childName: parent ? parent.child_name : '',
        therapistName: therapist ? therapist.name : 'Provider',
        therapistProfession: therapist ? therapist.profession : '',
        therapistInitial: therapist ? therapist.initials : 'P',
        therapistTone: therapist ? therapist.tone : 'green'
      };
    });
  },

  updateBookingStatus(id, status) {
    const now = new Date().toISOString();
    const booking = this.getBookingById(id);
    if (!booking) return null;

    db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

    // If cancelled or declined, release the slot if it existed
    if (['declined', 'cancelled'].includes(status) && booking.slot_id) {
      this.markSlotBooked(booking.slot_id, false);
    }

    return this.getBookingById(id);
  },

  // Community Programs & Registrations
  listCommunityPrograms({ q = '', area = '', maxFee = null } = {}) {
    let list = db.prepare('SELECT * FROM community_programs ORDER BY date ASC').all();
    if (area) {
      const areaLower = area.toLowerCase().trim();
      list = list.filter(p => p.area.toLowerCase().includes(areaLower));
    }
    if (maxFee !== null && maxFee !== '' && !isNaN(Number(maxFee))) {
      list = list.filter(p => Number(p.fee) <= Number(maxFee));
    }
    if (q) {
      const queryLower = q.toLowerCase().trim();
      list = list.filter(p => [p.org, p.title, p.activity, p.area, p.details].join(' ').toLowerCase().includes(queryLower));
    }
    return list;
  },

  getCommunityProgramById(id) {
    return db.prepare('SELECT * FROM community_programs WHERE id = ?').get(id) || null;
  },

  createCommunityRegistration({ id, program_id, parent_id, parent_name, email, child_age, note }) {
    db.prepare(`
      INSERT INTO community_registrations (id, program_id, parent_id, parent_name, email, child_age, note, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, program_id, parent_id, parent_name, email.toLowerCase().trim(), child_age, note || '', new Date().toISOString());
    return db.prepare('SELECT * FROM community_registrations WHERE id = ?').get(id);
  },

  listCommunityRegistrationsForParent(parentId) {
    return db.prepare(`
      SELECT cr.*, cp.title, cp.org, cp.date, cp.area, cp.fee
      FROM community_registrations cr
      JOIN community_programs cp ON cr.program_id = cp.id
      WHERE cr.parent_id = ?
      ORDER BY cr.sent_at DESC
    `).all(parentId);
  },

  // Messages
  getMessagesBetween(therapistId, parentId) {
    return db.prepare(`
      SELECT * FROM messages
      WHERE therapist_id = ? AND parent_id = ?
      ORDER BY created_at ASC
    `).all(therapistId, parentId);
  },

  listConversationThreadsForUser(userId, role) {
    if (role === 'parent') {
      // Find all therapists the parent has messaged with or has bookings with
      const rows = db.prepare(`
        SELECT DISTINCT therapist_id FROM messages WHERE parent_id = ?
        UNION
        SELECT DISTINCT therapist_id FROM bookings WHERE parent_id = ?
      `).all(userId, userId);

      return rows.map(r => {
        const therapist = this.getTherapistById(r.therapist_id);
        const lastMsg = db.prepare(`
          SELECT * FROM messages
          WHERE therapist_id = ? AND parent_id = ?
          ORDER BY created_at DESC LIMIT 1
        `).get(r.therapist_id, userId);

        return {
          partnerId: r.therapist_id,
          name: therapist ? therapist.name : 'Provider',
          profession: therapist ? therapist.profession : '',
          initials: therapist ? therapist.initials : 'P',
          tone: therapist ? therapist.tone : 'green',
          lastMessage: lastMsg ? lastMsg.text : '',
          lastMessageTime: lastMsg ? lastMsg.created_at : null
        };
      });
    } else {
      // Therapist role: Find all parents who messaged or booked this therapist
      const t = this.getTherapistByUserId(userId);
      if (!t) return [];

      const rows = db.prepare(`
        SELECT DISTINCT parent_id FROM messages WHERE therapist_id = ?
        UNION
        SELECT DISTINCT parent_id FROM bookings WHERE therapist_id = ?
      `).all(t.id, t.id);

      return rows.map(r => {
        const parent = this.getUserById(r.parent_id);
        const lastMsg = db.prepare(`
          SELECT * FROM messages
          WHERE therapist_id = ? AND parent_id = ?
          ORDER BY created_at DESC LIMIT 1
        `).get(t.id, r.parent_id);

        return {
          partnerId: r.parent_id,
          name: parent ? parent.name : 'Parent',
          childName: parent ? parent.child_name : '',
          initials: parent ? (parent.child_name ? parent.child_name[0] : parent.name[0]).toUpperCase() : 'P',
          tone: 'green',
          lastMessage: lastMsg ? lastMsg.text : '',
          lastMessageTime: lastMsg ? lastMsg.created_at : null
        };
      });
    }
  },

  createMessage({ id, therapist_id, parent_id, from_role, sender_id, text }) {
    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO messages (id, therapist_id, parent_id, from_role, sender_id, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, therapist_id, parent_id, from_role, sender_id, text.trim(), createdAt);

    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  },

  // Reviews
  getReviewsForTherapist(therapistId) {
    return db.prepare(`
      SELECT * FROM reviews
      WHERE therapist_id = ?
      ORDER BY created_at DESC
    `).all(therapistId);
  },

  createReview({ id, therapist_id, parent_id, author, rating, text }) {
    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO reviews (id, therapist_id, parent_id, author, rating, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, therapist_id, parent_id || null, author.trim(), rating, text.trim(), createdAt);

    return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  },

  // Calendar Aggregation
  getCalendarEvents(userId, role, year, month) {
    const events = [];
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    if (role === 'parent') {
      // 1. Parent bookings
      const bookings = db.prepare(`
        SELECT * FROM bookings
        WHERE parent_id = ? AND date LIKE ?
      `).all(userId, `${monthStr}%`);

      for (const b of bookings) {
        const t = this.getTherapistById(b.therapist_id);
        events.push({
          id: b.id,
          type: 'booking',
          date: b.date,
          time: b.time,
          title: `${b.activity} with ${t ? t.name : 'Provider'}`,
          status: b.status,
          mode: b.mode,
          category: 'session'
        });
      }

      // 2. Parent community registrations
      const regPrograms = db.prepare(`
        SELECT cr.*, cp.title, cp.activity, cp.date, cp.area
        FROM community_registrations cr
        JOIN community_programs cp ON cr.program_id = cp.id
        WHERE cr.parent_id = ? AND cp.date LIKE ?
      `).all(userId, `${monthStr}%`);

      for (const reg of regPrograms) {
        events.push({
          id: reg.id,
          type: 'community',
          date: reg.date,
          time: 'Morning',
          title: `Group: ${reg.title}`,
          status: 'registered',
          mode: 'In person',
          category: 'community'
        });
      }
    } else {
      // Therapist role
      const t = this.getTherapistByUserId(userId);
      if (!t) return [];

      // 1. Therapist bookings
      const bookings = db.prepare(`
        SELECT * FROM bookings
        WHERE therapist_id = ? AND date LIKE ?
      `).all(t.id, `${monthStr}%`);

      for (const b of bookings) {
        const p = this.getUserById(b.parent_id);
        events.push({
          id: b.id,
          type: 'booking',
          date: b.date,
          time: b.time,
          title: `${b.activity} with ${p ? (p.child_name || p.name) : 'Family'}`,
          status: b.status,
          mode: b.mode,
          category: 'session'
        });
      }

      // 2. Therapist open availability slots
      const slots = db.prepare(`
        SELECT * FROM availability_slots
        WHERE therapist_id = ? AND date LIKE ? AND is_booked = 0
      `).all(t.id, `${monthStr}%`);

      for (const s of slots) {
        events.push({
          id: s.id,
          type: 'slot',
          date: s.date,
          time: s.time,
          title: `Open: ${s.activity} (${s.mode})`,
          status: 'open',
          mode: s.mode,
          category: 'availability'
        });
      }
    }

    return events;
  }
};

// Initialize schema on load
initDatabase();

module.exports = {
  db,
  repository,
  initDatabase
};
