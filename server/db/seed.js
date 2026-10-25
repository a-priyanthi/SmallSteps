const { db } = require('./database');
const { generateSeedData } = require('./seed-data');

function runSeed() {
  console.log('🌱 Resetting and re-seeding database with fresh sample data...');
  
  // Clear tables in reverse foreign-key order
  db.exec(`
    DELETE FROM reviews;
    DELETE FROM messages;
    DELETE FROM community_registrations;
    DELETE FROM community_programs;
    DELETE FROM bookings;
    DELETE FROM availability_slots;
    DELETE FROM therapist_profiles;
    DELETE FROM users;
  `);

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

  for (const u of seed.users) {
    insertUser.run(u.id, u.email.toLowerCase(), u.password_hash, u.role, u.name, u.child_name, u.created_at);
  }

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
      t.email,
      t.is_doctor ? 1 : 0,
      t.registration_number || '',
      t.registration_council || '',
      t.initials,
      t.tone,
      t.photo || null,
      t.listed ? 1 : 0
    );
  }

  for (const s of seed.slots) {
    insertSlot.run(s.id, s.therapist_id, s.date, s.time, s.activity, s.mode, s.is_booked ? 1 : 0);
  }

  for (const p of seed.communityPrograms) {
    insertProgram.run(p.id, p.org, p.title, p.activity, p.area, p.date, p.deadline, p.sessions, p.duration, p.age, p.fee, p.details);
  }

  for (const b of seed.bookings) {
    insertBooking.run(b.id, b.parent_id, b.therapist_id, b.slot_id, b.date, b.time, b.activity, b.mode, b.status, b.note, b.created_at, b.updated_at);
  }

  for (const m of seed.messages) {
    insertMessage.run(m.id, m.therapist_id, m.parent_id, m.from_role, m.sender_id, m.text, m.created_at);
  }

  for (const r of seed.reviews) {
    insertReview.run(r.id, r.therapist_id, r.parent_id, r.author, r.rating, r.text, r.created_at);
  }

  console.log('✨ Small Steps database successfully re-seeded:');
  console.log(`   - ${seed.users.length} Users`);
  console.log(`   - ${seed.therapists.length} Therapist Profiles`);
  console.log(`   - ${seed.slots.length} Availability Slots`);
  console.log(`   - ${seed.communityPrograms.length} Community Programs`);
  console.log(`   - ${seed.bookings.length} Bookings`);
  console.log(`   - ${seed.messages.length} Direct Messages`);
  console.log(`   - ${seed.reviews.length} Parent Reviews`);
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
