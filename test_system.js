const http = require('http');
const app = require('./server/index');

const PORT = 3899;
let server;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          const parsed = resBody ? JSON.parse(resBody) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Small Steps Full-Stack Verification Suite...\n');

  server = app.listen(PORT);
  await new Promise(r => setTimeout(r, 600));

  try {
    const testTimestamp = Date.now();

    // 1. Register a brand-new Parent
    console.log('1️⃣ Testing New Parent Registration...');
    const parentEmail = `parent_${testTimestamp}@gmail.com`;
    const regParentRes = await request('POST', '/api/auth/register', {
      role: 'parent',
      name: 'Sneha Kulkarni',
      childName: 'Reyansh',
      childAge: '5 years old, autistic, sensory seeking',
      area: 'Koramangala, Bengaluru',
      email: parentEmail,
      password: 'parentSecret123'
    });

    if (regParentRes.status !== 201 || !regParentRes.body.token) {
      throw new Error(`Parent registration failed: ${JSON.stringify(regParentRes.body)}`);
    }
    const parentToken = regParentRes.body.token;
    console.log('   ✅ Parent registered successfully:', regParentRes.body.user.name, `(Child: ${regParentRes.body.user.childName})`);

    // 2. Parent Login
    console.log('2️⃣ Testing Parent Login with email & password (no preview/demo)...');
    const loginParentRes = await request('POST', '/api/auth/login', {
      email: parentEmail,
      password: 'parentSecret123'
    });
    if (loginParentRes.status !== 200 || loginParentRes.body.user.role !== 'parent') {
      throw new Error(`Parent login failed: ${JSON.stringify(loginParentRes.body)}`);
    }
    console.log('   ✅ Parent logged in seamlessly. Role identified as parent.');

    // 3. Parent Profile Update
    console.log('3️⃣ Testing Parent Profile Update...');
    const updateProfileRes = await request('PUT', '/api/auth/profile', {
      name: 'Sneha Kulkarni-Rao',
      childName: 'Reyansh Rao',
      childAge: '6 years old',
      phone: '+91 98450 11223',
      location: 'HSR Layout, Bengaluru'
    }, parentToken);
    if (updateProfileRes.status !== 200 || updateProfileRes.body.user.childName !== 'Reyansh Rao') {
      throw new Error(`Profile update failed: ${JSON.stringify(updateProfileRes.body)}`);
    }
    console.log('   ✅ Parent profile updated successfully in database.');

    // 4. Register a brand-new Specialist / Therapist
    console.log('4️⃣ Testing New Specialist / Therapist Registration...');
    const therapistEmail = `therapist_${testTimestamp}@pediatric.care`;
    const regTherapistRes = await request('POST', '/api/auth/register', {
      role: 'therapist',
      name: 'Dr. Kabir Sen',
      profession: 'Pediatric Occupational Therapist & Sensory Integration Specialist',
      phone: '+91 99880 77665',
      area: 'HSR Layout, Bengaluru',
      specialties: 'Sensory integration, Fine motor, Aquatic therapy',
      sessionFee: 850,
      experienceYears: 8,
      qualifications: 'BOT, Certified Sensory Integration Specialist\nMember of AIOTA',
      isDoctor: true,
      registrationNumber: 'KMC-OT-4421',
      registrationCouncil: 'Karnataka Medical Council',
      email: therapistEmail,
      password: 'therapistSecret123'
    });

    if (regTherapistRes.status !== 201 || !regTherapistRes.body.therapistProfile) {
      throw new Error(`Therapist registration failed: ${JSON.stringify(regTherapistRes.body)}`);
    }
    const therapistToken = regTherapistRes.body.token;
    const therapistId = regTherapistRes.body.therapistProfile.id;
    console.log('   ✅ Therapist registered successfully:', regTherapistRes.body.user.name, `(ID: ${therapistId}, Doctor: ${regTherapistRes.body.therapistProfile.is_doctor})`);

    // 5. Therapist Login
    console.log('5️⃣ Testing Therapist Login...');
    const loginTherapistRes = await request('POST', '/api/auth/login', {
      email: therapistEmail,
      password: 'therapistSecret123'
    });
    if (loginTherapistRes.status !== 200 || loginTherapistRes.body.user.role !== 'therapist') {
      throw new Error(`Therapist login failed: ${JSON.stringify(loginTherapistRes.body)}`);
    }
    console.log('   ✅ Therapist logged in seamlessly. Role identified as therapist.');

    // 6. Therapist creates an availability slot
    console.log('6️⃣ Testing Therapist Adding Availability Slot...');
    const slotRes = await request('POST', '/api/providers/availability', {
      date: '2026-11-05',
      time: '11:00 AM',
      activity: 'Sensory integration',
      mode: 'In person'
    }, therapistToken);
    if (slotRes.status !== 201 || !slotRes.body.slot) {
      throw new Error(`Slot creation failed: ${JSON.stringify(slotRes.body)}`);
    }
    const slotId = slotRes.body.slot.id;
    console.log('   ✅ Slot added by therapist:', slotId, 'at 11:00 AM');

    // 7. Parent books the slot
    console.log('7️⃣ Testing Parent Requesting Appointment with New Specialist...');
    const bookingRes = await request('POST', '/api/bookings', {
      providerId: therapistId,
      slotId: slotId,
      note: 'Reyansh is sensitive to bright overhead lights and loud sudden noises.'
    }, parentToken);
    if (bookingRes.status !== 201 || !bookingRes.body.booking) {
      throw new Error(`Booking failed: ${JSON.stringify(bookingRes.body)}`);
    }
    const bookingId = bookingRes.body.booking.id;
    console.log('   ✅ Appointment requested successfully. Booking ID:', bookingId, 'Status:', bookingRes.body.booking.status);

    // 8. Therapist confirms the booking
    console.log('8️⃣ Testing Therapist Confirming Booking...');
    const confirmRes = await request('PUT', `/api/bookings/${bookingId}/status`, {
      status: 'confirmed'
    }, therapistToken);
    if (confirmRes.status !== 200 || confirmRes.body.booking.status !== 'confirmed') {
      throw new Error(`Confirmation failed: ${JSON.stringify(confirmRes.body)}`);
    }
    console.log('   ✅ Booking confirmed by therapist.');

    // 9. Parent sends a private message to Therapist
    console.log('9️⃣ Testing Direct Messaging (Parent -> Therapist)...');
    const msgRes = await request('POST', `/api/messages/${therapistId}`, {
      text: 'Hello Dr. Kabir! We are looking forward to our session on Nov 5th.'
    }, parentToken);
    if (msgRes.status !== 201 || !msgRes.body.message) {
      throw new Error(`Sending message failed: ${JSON.stringify(msgRes.body)}`);
    }
    console.log('   ✅ Message delivered:', msgRes.body.message.text);

    // 10. Therapist replies to Parent
    console.log('🔟 Testing Direct Messaging Reply (Therapist -> Parent)...');
    const replyRes = await request('POST', `/api/messages/${loginParentRes.body.user.id}`, {
      text: 'Hello Sneha! Looking forward to meeting Reyansh. We have low-light sensory rooms prepared.'
    }, therapistToken);
    if (replyRes.status !== 201 || !replyRes.body.message) {
      throw new Error(`Sending reply failed: ${JSON.stringify(replyRes.body)}`);
    }
    console.log('   ✅ Reply delivered:', replyRes.body.message.text);

    // 11. Parent leaves a review
    console.log('1️⃣1️⃣ Testing Family Review Submission...');
    const reviewRes = await request('POST', `/api/reviews/${therapistId}`, {
      rating: 5,
      text: 'Dr. Kabir was immensely patient and made my son feel safe and celebrated right away!',
      author: 'Sneha (Parent of Reyansh)'
    }, parentToken);
    if (reviewRes.status !== 201 || !reviewRes.body.review) {
      throw new Error(`Review submission failed: ${JSON.stringify(reviewRes.body)}`);
    }
    console.log('   ✅ Review submitted and linked to Dr. Kabir Sen.');

    // 12. Check Calendar View
    console.log('1️⃣2️⃣ Testing Calendar Schedule for Parent...');
    const calRes = await request('GET', '/api/calendar?year=2026&month=11', null, parentToken);
    if (calRes.status !== 200 || !calRes.body.events) {
      throw new Error(`Calendar query failed: ${JSON.stringify(calRes.body)}`);
    }
    console.log(`   ✅ Calendar returned ${calRes.body.events.length} schedule items.`);

    console.log('\n🎉 ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY! The database and backend are 100% operational for real parents and specialists.');

  } catch (err) {
    console.error('\n❌ Test failure:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runTests();
