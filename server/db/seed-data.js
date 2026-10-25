const bcrypt = require('bcryptjs');

const today = new Date();
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const week = (n) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
  return dateKey(d);
};

const initials = (name = '') => name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();

const sampleActivities = ['Swimming', 'Music', 'Art', 'Sports', 'Cooking', 'Outdoor play', 'Community activities'];
const demoFirstNames = ['Aditi', 'Kavya', 'Rohan', 'Meera', 'Arjun', 'Nisha', 'Devika', 'Ishaan', 'Tara', 'Kiran', 'Ananya', 'Vikram', 'Leela', 'Kabir', 'Sahana', 'Naveen', 'Maya', 'Rhea', 'Sanjay', 'Diya'];
const demoLastNames = ['Raman', 'Iyer', 'Nair', 'Menon', 'Rao', 'Kapoor', 'Shah', 'Sen', 'Bose', 'Patel', 'Das', 'Reddy', 'Kulkarni', 'Thomas', 'Joseph', 'Bhat', 'Chatterjee', 'Pillai', 'Malhotra', 'Ghosh'];

const IndiaSampleCities = [
  'New Delhi, Delhi', 'Mumbai, Maharashtra', 'Bengaluru, Karnataka', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal',
  'Hyderabad, Telangana', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh', 'Dehradun, Uttarakhand',
  'Shimla, Himachal Pradesh', 'Patna, Bihar', 'Ranchi, Jharkhand', 'Raipur, Chhattisgarh', 'Bhopal, Madhya Pradesh',
  'Indore, Madhya Pradesh', 'Panaji, Goa', 'Gandhinagar, Gujarat', 'Bhubaneswar, Odisha', 'Guwahati, Assam',
  'Chandigarh', 'Amritsar, Punjab', 'Gurugram, Haryana', 'Kochi, Kerala', 'Thiruvananthapuram, Kerala',
  'Visakhapatnam, Andhra Pradesh', 'Puducherry', 'Coimbatore, Tamil Nadu', 'Madurai, Tamil Nadu', 'Mysuru, Karnataka',
  'Surat, Gujarat', 'Nagpur, Maharashtra', 'Pune, Maharashtra', 'Noida, Uttar Pradesh'
];

const chennaiSampleAreas = [
  'Adyar, Chennai', 'Ambattur, Chennai', 'Anna Nagar, Chennai', 'Ashok Nagar, Chennai', 'Besant Nagar, Chennai',
  'Chromepet, Chennai', 'Egmore, Chennai', 'Guindy, Chennai', 'Kilpauk, Chennai', 'Kodambakkam, Chennai',
  'Koyambedu, Chennai', 'Madipakkam, Chennai', 'Medavakkam, Chennai', 'Mylapore, Chennai', 'Neelankarai, Chennai',
  'Nungambakkam, Chennai', 'OMR / Perungudi, Chennai', 'OMR / Sholinganallur, Chennai', 'OMR / Thoraipakkam, Chennai',
  'Porur, Chennai', 'Saidapet, Chennai', 'T. Nagar, Chennai', 'Tambaram, Chennai', 'Thiruvanmiyur, Chennai',
  'Triplicane, Chennai', 'Vadapalani, Chennai', 'Velachery, Chennai', 'West Mambalam, Chennai'
];

function generateSeedData() {
  const passwordHash = bcrypt.hashSync('steps123', 10);

  // 1. Users
  const users = [
    {
      id: 'demo-parent',
      email: 'family@example.test',
      password_hash: passwordHash,
      role: 'parent',
      name: 'Family account',
      child_name: 'Mira',
      created_at: new Date().toISOString()
    },
    {
      id: 'maya',
      email: 'demo-maya@example.test',
      password_hash: passwordHash,
      role: 'therapist',
      name: 'Maya Chen',
      child_name: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'noah',
      email: 'demo-noah@example.test',
      password_hash: passwordHash,
      role: 'therapist',
      name: 'Noah Patel',
      child_name: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'samira',
      email: 'demo-samira@example.test',
      password_hash: passwordHash,
      role: 'therapist',
      name: 'Samira Khan',
      child_name: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'dev',
      email: 'demo-dev@example.test',
      password_hash: passwordHash,
      role: 'therapist',
      name: 'Dev Rao',
      child_name: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'anika',
      email: 'demo-anika@example.test',
      password_hash: passwordHash,
      role: 'therapist',
      name: 'Anika Desai',
      child_name: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'leela',
      email: 'demo-leela@example.test',
      password_hash: passwordHash,
      role: 'therapist',
      name: 'Leela Das',
      child_name: null,
      created_at: new Date().toISOString()
    }
  ];

  // 2. Base Therapists
  const therapists = [
    {
      id: 'maya',
      user_id: 'maya',
      name: 'Maya Chen',
      profession: 'Autism-informed swim instructor',
      specialties: ['Swimming', 'Water confidence', 'Community recreation'],
      bio: 'I help autistic children build comfort and confidence in the water at their own pace. Sessions begin with a predictable preview, plenty of choice, and time to get used to the space.',
      qualifications: ['Inclusive swim instruction certificate · sample credential', 'First aid and safeguarding · sample credential'],
      experience_years: 7,
      area: 'South Bengaluru · sample location',
      formats: ['In person'],
      languages: ['English', 'Kannada'],
      approach: 'Visual previews, child-led pacing, a quieter pool entry, and breaks whenever needed.',
      session_fee: 800,
      offer: { percent: 15, startDate: week(0), endDate: week(30) },
      phone: '+91 98450 12345',
      email: 'demo-maya@example.test',
      is_doctor: 0,
      registration_number: '',
      registration_council: '',
      initials: 'MC',
      tone: 'purple',
      photo: null,
      listed: 1
    },
    {
      id: 'noah',
      user_id: 'noah',
      name: 'Noah Patel',
      profession: 'Occupational therapist · community activities',
      specialties: ['Cooking', 'Daily living activities', 'Community activities'],
      bio: 'I support children to take part in everyday activities that matter to them, from preparing a snack to exploring a new community space. We make a plan together and adapt the environment as needed.',
      qualifications: ['Occupational therapy degree · sample credential', 'Sensory-informed practice course · sample credential'],
      experience_years: 9,
      area: 'Indiranagar · sample location',
      formats: ['In person', 'Online'],
      languages: ['English', 'Hindi'],
      approach: 'Clear steps, visual choice boards, sensory breaks, and collaboration with the family.',
      session_fee: 950,
      offer: { percent: 10, startDate: week(0), endDate: week(20) },
      phone: '+91 98450 23456',
      email: 'demo-noah@example.test',
      is_doctor: 0,
      registration_number: '',
      registration_council: '',
      initials: 'NP',
      tone: 'blue',
      photo: null,
      listed: 1
    },
    {
      id: 'samira',
      user_id: 'samira',
      name: 'Samira Khan',
      profession: 'Music therapist',
      specialties: ['Music', 'Rhythm', 'Group activities'],
      bio: 'Music can be a joyful way to explore sound, rhythm, turn-taking, and self-expression. I tailor each session around a child’s interests and sensory preferences.',
      qualifications: ['Music therapy qualification · sample credential', 'Inclusive group facilitation · sample credential'],
      experience_years: 6,
      area: 'Central Bengaluru · sample location',
      formats: ['In person', 'Online'],
      languages: ['English', 'Urdu'],
      approach: 'Choice of instruments, predictable session structure, volume control, and no pressure to perform.',
      session_fee: 750,
      offer: null,
      phone: '+91 98450 34567',
      email: 'demo-samira@example.test',
      is_doctor: 0,
      registration_number: '',
      registration_council: '',
      initials: 'SK',
      tone: 'green',
      photo: null,
      listed: 1
    },
    {
      id: 'dev',
      user_id: 'dev',
      name: 'Dev Rao',
      profession: 'Adaptive sports coach',
      specialties: ['Sports', 'Cycling', 'Outdoor play'],
      bio: 'I help children discover movement and outdoor activities in a way that feels safe and fun for them. Sessions can be individual or family-supported, with small steps toward each child’s own goals.',
      qualifications: ['Adaptive sports coaching · sample credential', 'Child safety and first aid · sample credential'],
      experience_years: 8,
      area: 'North Bengaluru · sample location',
      formats: ['In person'],
      languages: ['English', 'Kannada', 'Telugu'],
      approach: 'Demonstration before trying, flexible equipment, low-pressure practice, and a calm reset space.',
      session_fee: 700,
      offer: { percent: 20, startDate: week(0), endDate: week(25) },
      phone: '+91 98450 45678',
      email: 'demo-dev@example.test',
      is_doctor: 0,
      registration_number: '',
      registration_council: '',
      initials: 'DR',
      tone: 'orange',
      photo: null,
      listed: 1
    },
    {
      id: 'anika',
      user_id: 'anika',
      name: 'Anika Desai',
      profession: 'Creative activity facilitator',
      specialties: ['Art', 'Drawing', 'Pottery'],
      bio: 'I create welcoming art sessions where children can explore materials, make choices, and enjoy the process without needing to follow a fixed result.',
      qualifications: ['Inclusive arts facilitation · sample credential', 'Creative play and child development · sample credential'],
      experience_years: 5,
      area: 'Pune · sample location',
      formats: ['In person', 'Online'],
      languages: ['English', 'Marathi', 'Hindi'],
      approach: 'Sensory-friendly materials, a choice of tools, step-by-step previews, and permission to pause.',
      session_fee: 650,
      offer: null,
      phone: '+91 98450 56789',
      email: 'demo-anika@example.test',
      is_doctor: 0,
      registration_number: '',
      registration_council: '',
      initials: 'AD',
      tone: 'purple',
      photo: null,
      listed: 1
    },
    {
      id: 'leela',
      user_id: 'leela',
      name: 'Leela Das',
      profession: 'Inclusive movement and yoga instructor',
      specialties: ['Sports', 'Movement', 'Outdoor play'],
      bio: 'I offer gentle movement sessions for children who want to explore stretching, balance, and body awareness. Each activity has seated and standing options.',
      qualifications: ['Children’s yoga instructor · sample credential', 'Inclusive movement training · sample credential'],
      experience_years: 4,
      area: 'Online and East Bengaluru · sample location',
      formats: ['In person', 'Online'],
      languages: ['English', 'Bengali'],
      approach: 'A consistent routine, optional participation, movement choices, and a quiet pause area.',
      session_fee: 600,
      offer: { percent: 10, startDate: week(0), endDate: week(15) },
      phone: '+91 98450 67890',
      email: 'demo-leela@example.test',
      is_doctor: 0,
      registration_number: '',
      registration_council: '',
      initials: 'LD',
      tone: 'blue',
      photo: null,
      listed: 1
    }
  ];

  // 3. Availability Slots for Base Therapists
  const slots = [
    { id: 'm1', therapist_id: 'maya', date: week(3), time: '10:00', activity: 'Swimming', mode: 'In person' },
    { id: 'm2', therapist_id: 'maya', date: week(5), time: '14:00', activity: 'Water confidence', mode: 'In person' },
    { id: 'n1', therapist_id: 'noah', date: week(2), time: '15:30', activity: 'Cooking', mode: 'In person' },
    { id: 'n2', therapist_id: 'noah', date: week(4), time: '16:30', activity: 'Community activities', mode: 'Online' },
    { id: 's1', therapist_id: 'samira', date: week(3), time: '11:00', activity: 'Music', mode: 'Online' },
    { id: 's2', therapist_id: 'samira', date: week(6), time: '16:00', activity: 'Rhythm', mode: 'In person' },
    { id: 'd1', therapist_id: 'dev', date: week(2), time: '09:30', activity: 'Cycling', mode: 'In person' },
    { id: 'd2', therapist_id: 'dev', date: week(5), time: '10:30', activity: 'Outdoor play', mode: 'In person' },
    { id: 'a1', therapist_id: 'anika', date: week(2), time: '13:00', activity: 'Art', mode: 'Online' },
    { id: 'a2', therapist_id: 'anika', date: week(4), time: '14:30', activity: 'Pottery', mode: 'In person' },
    { id: 'l1', therapist_id: 'leela', date: week(3), time: '16:00', activity: 'Movement', mode: 'Online' },
    { id: 'l2', therapist_id: 'leela', date: week(7), time: '10:00', activity: 'Yoga', mode: 'In person' }
  ];

  // 4. Generate Regional Providers for India Cities & Chennai Neighbourhoods
  let regIndex = 0;
  for (const area of [...IndiaSampleCities, ...chennaiSampleAreas]) {
    const slug = area.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = `demo-${slug}`;
    const isDoctor = regIndex % 17 === 0;
    const activity = sampleActivities[regIndex % sampleActivities.length];
    const tone = ['green', 'blue', 'orange', 'purple'][regIndex % 4];
    const time = ['09:30', '10:00', '11:30', '14:00', '15:30', '16:00'][regIndex % 6];
    const nextTime = ['10:30', '12:00', '13:30', '15:00', '16:30', '17:00'][regIndex % 6];
    const providerName = `${isDoctor ? 'Dr. ' : ''}${demoFirstNames[regIndex % demoFirstNames.length]} ${demoLastNames[Math.floor(regIndex / demoFirstNames.length) % demoLastNames.length]}`;
    const email = `${id}@example.test`;

    users.push({
      id,
      email,
      password_hash: passwordHash,
      role: 'therapist',
      name: providerName,
      child_name: null,
      created_at: new Date().toISOString()
    });

    therapists.push({
      id,
      user_id: id,
      name: providerName,
      profession: isDoctor ? 'Developmental paediatrician' : `Autism-informed ${activity.toLowerCase()} coach`,
      specialties: isDoctor ? ['Community activities', 'Outdoor play'] : [activity, 'Social connection'],
      bio: isDoctor
        ? 'Medical specialist providing neurodiversity-affirming guidance, developmental support, and coordination around recreation and play.'
        : `Support specialist focused on ${activity.toLowerCase()}. Sessions are paced comfortably around sensory preferences and personal strengths.`,
      qualifications: isDoctor
        ? ['MD / MBBS · Medical Council registered', 'Developmental and behavioral pediatrics fellowship']
        : ['Inclusive activity facilitator certification', 'Pediatric first aid and neurodivergent-affirming care certification'],
      experience_years: 3 + (regIndex % 15),
      area,
      formats: regIndex % 4 === 0 ? ['In person', 'Online'] : ['In person'],
      languages: ['English', 'Tamil', 'Hindi'].slice(0, 1 + (regIndex % 2)),
      approach: 'Predictable structure, visual schedules, breaks on request, and collaborative parent communication.',
      session_fee: 650 + (regIndex % 8) * 50,
      offer: (regIndex % 3 === 0) ? { percent: 15, startDate: week(0), endDate: week(30) } : null,
      phone: `+91 98450 ${String(10000 + regIndex).slice(0, 5)}`,
      email,
      is_doctor: isDoctor ? 1 : 0,
      registration_number: isDoctor ? `MCI-TN-${201500 + regIndex}` : '',
      registration_council: isDoctor ? 'Tamil Nadu Medical Council' : '',
      initials: initials(providerName),
      tone,
      photo: null,
      listed: 1
    });

    slots.push(
      { id: `${id}-s1`, therapist_id: id, date: week(2 + (regIndex % 14)), time, activity, mode: 'In person' },
      { id: `${id}-s2`, therapist_id: id, date: week(5 + (regIndex % 14)), time: nextTime, activity, mode: regIndex % 4 === 0 ? 'Online' : 'In person' }
    );

    regIndex++;
  }

  // 5. Community / NGO Programs
  const communityPrograms = [
    {
      id: 'ngo-yoga',
      org: 'Little Lantern Community Trust',
      title: 'Gentle movement & family yoga',
      activity: 'Yoga · movement',
      area: 'Adyar, Chennai',
      date: week(14),
      deadline: week(10),
      sessions: 4,
      duration: '45 minutes',
      age: 'Ages 5–12',
      fee: 0,
      details: 'Small group with visual activity cards, optional seated movement, and a quiet corner. A parent or caregiver stays for the session.'
    },
    {
      id: 'ngo-art',
      org: 'Open Palette Collective',
      title: 'Saturday sensory art club',
      activity: 'Art · painting',
      area: 'Velachery, Chennai',
      date: week(16),
      deadline: week(12),
      sessions: 3,
      duration: '60 minutes',
      age: 'Ages 6–14',
      fee: 450,
      details: 'Explore paint, clay, and collage at your own pace. Materials are included; families can request low-mess options.'
    },
    {
      id: 'ngo-swim',
      org: 'Blue Door Inclusive Sports',
      title: 'Water comfort discovery group',
      activity: 'Swimming · water confidence',
      area: 'Anna Nagar, Chennai',
      date: week(18),
      deadline: week(13),
      sessions: 4,
      duration: '40 minutes',
      age: 'Ages 7–13',
      fee: 700,
      details: 'A small beginner group with a shallow-water introduction and predictable session routine. Pool entry is included.'
    },
    {
      id: 'ngo-nature',
      org: 'Neighbourhood Nature Circle',
      title: 'Garden explorers morning',
      activity: 'Gardening · outdoor play',
      area: 'Mylapore, Chennai',
      date: week(15),
      deadline: week(11),
      sessions: 1,
      duration: '75 minutes',
      age: 'Ages 4–12',
      fee: 0,
      details: 'A relaxed family activity with watering, soil play, and a take-home seed pot. Noise-reducing breaks are available.'
    }
  ];

  // 6. Seed Bookings
  const bookings = [
    {
      id: 'b-demo-1',
      parent_id: 'demo-parent',
      therapist_id: 'maya',
      slot_id: 'm1',
      date: week(2),
      time: '10:00',
      activity: 'Swimming',
      mode: 'In person',
      status: 'confirmed',
      note: 'Sample appointment · predictable pool entry would help.',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'b-demo-2',
      parent_id: 'demo-parent',
      therapist_id: 'noah',
      slot_id: 'n1',
      date: week(3),
      time: '15:30',
      activity: 'Cooking',
      mode: 'In person',
      status: 'pending',
      note: 'Sample request · first visit.',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ];

  // 7. Seed Messages
  const messages = [
    {
      id: 'msg-1',
      therapist_id: 'maya',
      parent_id: 'demo-parent',
      from_role: 'parent',
      sender_id: 'demo-parent',
      text: 'Hi Maya, could you tell me what the first swim session usually looks like?',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'msg-2',
      therapist_id: 'maya',
      parent_id: 'demo-parent',
      from_role: 'therapist',
      sender_id: 'maya',
      text: 'Of course! I can send a simple visual preview beforehand, and we can spend the first few minutes getting comfortable with the pool area.',
      created_at: new Date(Date.now() - 3600000 * 11).toISOString()
    },
    {
      id: 'msg-3',
      therapist_id: 'noah',
      parent_id: 'demo-parent',
      from_role: 'therapist',
      sender_id: 'noah',
      text: 'I have a cooking session opening next week. We can keep it simple and choose the recipe together.',
      created_at: new Date(Date.now() - 3600000 * 6).toISOString()
    }
  ];

  // 8. Seed Reviews
  const reviews = [
    {
      id: 'rev-m1',
      therapist_id: 'maya',
      parent_id: 'demo-parent',
      author: 'Priya & Mira (Age 6)',
      rating: 5,
      text: 'Maya created a calming pool routine with zero pressure. Mira loved the float games and felt completely safe.',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'rev-m2',
      therapist_id: 'maya',
      parent_id: null,
      author: 'Karthik S.',
      rating: 5,
      text: 'The visual transition cards made all the difference. Excellent communication before and after every session.',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString()
    },
    {
      id: 'rev-n1',
      therapist_id: 'noah',
      parent_id: 'demo-parent',
      author: 'Family review',
      rating: 5,
      text: 'Noah helped us break down snack preparation into comfortable, achievable steps. Highly recommended.',
      created_at: new Date(Date.now() - 86400000 * 8).toISOString()
    }
  ];

  return {
    users,
    therapists,
    slots,
    communityPrograms,
    bookings,
    messages,
    reviews
  };
}

module.exports = {
  generateSeedData,
  IndiaSampleCities,
  chennaiSampleAreas,
  sampleActivities
};
