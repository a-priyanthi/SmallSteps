# Small Steps — Inclusive Activity Support & Care Marketplace

> A full-stack web platform connecting families of neurodivergent children with verified activity specialists, pediatric therapists, and inclusive community programs.

---

## 🌟 Overview

**Small Steps** provides a dedicated, calming, and affirming space for families and pediatric activity specialists (occupational therapists, adaptive swim coaches, music therapists, movement instructors, and developmental paediatricians).

Unlike generic directories, Small Steps is built from the ground up for neurodivergent access:
- **Child-paced discovery**: Search by activity, neighbourhood, sensory format, and budget.
- **Two-leaf notebook specialist profiles**: Transparently view bios, qualifications, approach to accommodations, indicative session fees, and active promotional discounts.
- **Role-based calendar & timetable**: Parents see appointments and community group sessions; therapists see client bookings and open slots.
- **Isolated private messaging**: Direct parent-therapist communication with server-enforced privacy.
- **Doctor verification support**: Registration number and issuing council tracking for medical doctors.
- **Inclusive community programs**: Low-cost and free group programs hosted by local organisations and NGOs.

---

## 🛠️ Architecture & Tech Stack

```
small-steps/
├── server/
│   ├── index.js          # Express server entry point (API + static SPA serving)
│   ├── config.js         # Environment & server configuration
│   ├── db/
│   │   ├── database.js   # Built-in SQLite database (node:sqlite) + query repository
│   │   └── seed-data.js  # Rich sample dataset (50+ regional providers, demo accounts)
│   ├── middleware/
│   │   └── auth.js       # JWT extraction, role guards (requireParent, requireTherapist)
│   └── routes/
│       ├── auth.js       # POST /api/auth/register, /login, /me, /logout
│       ├── providers.js  # GET /api/providers, PUT /profile, /pricing, availability slots
│       ├── bookings.js   # GET & POST /api/bookings, PUT /:id/status (confirm/decline/cancel)
│       ├── community.js  # GET /api/community, POST /:id/register, /my-registrations
│       ├── calendar.js   # GET /api/calendar (monthly role-scoped events)
│       ├── messages.js   # GET & POST /api/messages (isolated parent-therapist threads)
│       └── reviews.js    # GET & POST /api/reviews (verified family feedback)
├── public/               # Frontend Client (HTML5, Modular CSS, Vanilla JS)
│   ├── index.html        # Clean semantic SPA shell
│   ├── css/
│   │   ├── base.css      # Design tokens, Google Fonts, theme variables
│   │   ├── layout.css    # Topbar, app-shell, dialogs, toasts, responsive rules
│   │   ├── components.css# Folder cards, calendar grid, chat UI, tags, buttons
│   │   └── pages.css     # Auth screens, discovery hero, profile spread, reviews
│   └── js/
│       ├── api.js        # Centralized asynchronous API client
│       └── app.js        # Dynamic view controller & reactive event handlers
├── data/
│   └── small_steps.db    # SQLite persistent database file
├── package.json          # Node.js project manifest & scripts
├── .gitignore            # Git exclusion rules
└── README.md             # Project documentation
```

### Technology Highlights
- **Backend**: Node.js v22+ with Express 4, native `node:sqlite` (zero C++ compile dependencies), JSON Web Tokens (`jsonwebtoken`), and `bcryptjs` for secure password hashing.
- **Database**: Embedded SQLite with foreign keys, transactional integrity, and automated seed generation.
- **Frontend**: Native HTML5, modern CSS3 (clay-play & scrapbook design system, CSS Grid/Flexbox), and modular Vanilla JavaScript ES6+.
- **Design System**: Typography using *Modak*, *Cherry Bomb One*, *Nunito*, *Fraunces*, and *DM Sans*.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.0.0 or higher; v22+ recommended for native `node:sqlite`)
- [Git](https://git-scm.com/)

### 1. Installation
In the project directory, install dependencies:
```bash
npm install
```

### 2. Start the Application
Run the full-stack server:
```bash
npm start
```

For development with automatic server restart:
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔑 Demo Access Credentials

The database comes pre-seeded with sample accounts and directory listings across India (Bengaluru, Chennai, Mumbai, Delhi, Pune, Kolkata, Hyderabad, etc.):

| Account Role | Email | Password | Details |
|---|---|---|---|
| **Parent Workspace** | `family@example.test` | `steps123` | Child: Mira (Age 6). Includes sample bookings & chat threads. |
| **Therapist Workspace** | `demo-maya@example.test` | `steps123` | Maya Chen, Autism-informed Swim Coach. Includes requests & slots. |

> **Quick Login**: On the sign-in screen, click **Parent preview** or **Therapist preview** to fill demo credentials with one tap.

---

## 📋 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Create Parent or Therapist account (hashes password with bcrypt)
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Retrieve active user session and profile data
- `POST /api/auth/logout` — End session

### Providers & Directory (`/api/providers`)
- `GET /api/providers` — Search providers by `q`, `area`, `mode`, `category`, `maxFee`
- `GET /api/providers/:id` — Retrieve full provider spread details, slots, and reviews
- `GET /api/providers/activities/list` — Distinct list of all offered activities
- `PUT /api/providers/profile` — Update therapist profile (bio, specialties, qualifications, doctor credentials, photo)
- `PUT /api/providers/pricing` — Set session fee and dated promotional discount offer
- `POST /api/providers/availability` — Add an open appointment time slot
- `DELETE /api/providers/availability/:slotId` — Remove an availability slot

### Bookings & Sessions (`/api/bookings`)
- `GET /api/bookings` — Role-scoped list of bookings (Parents see their own; Therapists see assigned requests)
- `POST /api/bookings` — Parent requests an appointment slot with personal context note
- `PUT /api/bookings/:id/status` — Therapist confirms/declines/completes; Parent cancels

### Community Activities (`/api/community`)
- `GET /api/community` — List inclusive group programs hosted by local NGOs
- `GET /api/community/my-registrations` — Parent's submitted registrations
- `POST /api/community/:id/register` — Submit family registration for a community program

### Calendar (`/api/calendar`)
- `GET /api/calendar?year=YYYY&month=M` — Monthly calendar events aggregated by role

### Messages & Chat (`/api/messages`)
- `GET /api/messages/threads` — List conversation threads for active user
- `GET /api/messages/:partnerId` — Fetch chat log for a specific parent-therapist relationship
- `POST /api/messages/:partnerId` — Send a direct message

### Reviews & Feedback (`/api/reviews`)
- `GET /api/reviews/:therapistId` — Fetch reviews and average rating for a provider
- `POST /api/reviews/:therapistId` — Parent submits verified review (rating 1–5 and feedback)

---

## 📦 Pushing to Your Git Repository

To push this project to your GitHub, GitLab, or Git server:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Stage all files
git add .

# 3. Create initial commit
git commit -m "feat: complete Small Steps fullstack platform with Express backend, SQLite, and responsive frontend"

# 4. Set default branch to main
git branch -M main

# 5. Link your remote repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 6. Push to remote
git push -u origin main
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
