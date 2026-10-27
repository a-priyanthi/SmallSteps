/**
 * Small Steps - Main Application Logic & View Controller
 */

// Application State
const State = {
  user: null,
  page: 'discover',
  authMode: 'signin',
  signupRole: 'parent',
  filters: {
    q: '',
    area: '',
    mode: 'all',
    category: 'All activities',
    maxFee: ''
  },
  calendarDate: new Date(),
  selectedThread: null,
  reviewProviderId: null,
  activities: []
};

// Formatting & Helper Utilities
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (name = '') => name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
const fmtDate = (s, options = { month: 'short', day: 'numeric' }) => {
  if (!s) return '';
  const d = new Date(s + (s.includes('T') ? '' : 'T12:00:00'));
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', options);
};

function avatar(person, tone = 'green') {
  const init = person?.initials || initials(person?.name || person?.childName || '?');
  return `<span class="avatar ${tone}">${esc(init)}</span>`;
}

function providerPortrait(t, variant = '') {
  const name = t?.name || 'Provider';
  const photo = t?.photo;
  const picture = photo
    ? `<img src="${esc(photo)}" alt="Portrait of ${esc(name)}">`
    : `<div class="portrait-placeholder"><span class="portrait-spark">✦</span><span class="portrait-monogram">${esc(t?.initials || initials(name))}</span><span class="portrait-caption">Specialist photo</span></div>`;
  return `<div class="provider-cover ${esc(t?.tone || '')} ${variant}">${picture}<span class="cover-label">Activity specialist</span></div>`;
}

function tag(text, tone = 'green') {
  return `<span class="tag ${tone}">${esc(text)}</span>`;
}

function toast(message) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  root.innerHTML = `<div class="toast">${esc(message)}</div>`;
  setTimeout(() => { root.innerHTML = ''; }, 3000);
}

function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

function openModal(title, bodyHtml, submitLabel = null, onSubmit = null, isSpread = false) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this)closeModal()">
      <div class="modal ${isSpread ? 'profile-spread-modal' : ''}">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button class="modal-close" onclick="closeModal()" aria-label="Close">×</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-actions">
          <button class="btn" onclick="closeModal()">Close</button>
          ${submitLabel ? `<button class="btn btn-primary" id="modal-submit-btn">${esc(submitLabel)}</button>` : ''}
        </div>
      </div>
    </div>
  `;
  if (submitLabel && onSubmit) {
    document.getElementById('modal-submit-btn').onclick = onSubmit;
  }
}

// Global App Initialization
async function initApp() {
  // Listen for auth expiration
  window.addEventListener('auth:expired', () => {
    toast('Session expired. Please sign in again.');
    State.user = null;
    render();
  });

  // Check existing token
  if (SmallStepsAPI.auth.getToken()) {
    try {
      const data = await SmallStepsAPI.auth.me();
      State.user = data.user;
      State.page = State.user.role === 'parent' ? 'discover' : 'sessions';
    } catch (err) {
      SmallStepsAPI.auth.setToken(null);
      State.user = null;
    }
  }

  // Load activities list
  try {
    const res = await SmallStepsAPI.providers.getActivities();
    State.activities = res.activities || [];
  } catch (e) {}

  render();
}

// Primary Render Router
function render() {
  const authScreen = document.getElementById('signin-screen');
  const appShell = document.getElementById('app-shell');

  if (!State.user) {
    if (authScreen) authScreen.hidden = false;
    if (appShell) appShell.hidden = true;
    renderAuthForm();
    return;
  }

  if (authScreen) authScreen.hidden = true;
  if (appShell) appShell.hidden = false;

  updateNavigation();

  const container = document.getElementById('page');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">Loading...</div>';

  if (State.page === 'discover' && State.user.role === 'parent') {
    renderDiscover(container);
  } else if (State.page === 'community' && State.user.role === 'parent') {
    renderCommunity(container);
  } else if (State.page === 'sessions') {
    renderSessions(container);
  } else if (State.page === 'calendar') {
    renderCalendar(container);
  } else if (State.page === 'messages') {
    renderMessages(container);
  } else if (State.page === 'family-profile' && State.user.role === 'parent') {
    renderFamilyProfile(container);
  } else if (State.page === 'profile' && State.user.role === 'therapist') {
    renderProfile(container);
  } else if (State.page === 'reviews' && State.user.role === 'parent') {
    renderReviews(container);
  } else {
    State.page = State.user.role === 'parent' ? 'discover' : 'sessions';
    render();
  }
}

// Update Top Navigation Bar
function updateNavigation() {
  const nav = document.getElementById('top-nav');
  if (!nav || !State.user) return;
  const isParent = State.user.role === 'parent';

  // Toggle role-specific navigation items
  nav.querySelector('[data-page="discover"]')?.toggleAttribute('hidden', !isParent);
  nav.querySelector('[data-page="community"]')?.toggleAttribute('hidden', !isParent);
  nav.querySelector('#nav-family-profile')?.toggleAttribute('hidden', !isParent);
  nav.querySelector('#nav-therapist-profile')?.toggleAttribute('hidden', isParent);

  const familySpaceTitle = document.getElementById('family-space-title');
  if (familySpaceTitle) {
    familySpaceTitle.textContent = isParent
      ? (State.user.childName ? `${State.user.childName}’s space` : 'Family space')
      : `${State.user.name}’s provider space`;
  }

  const roleHint = document.getElementById('role-hint');
  if (roleHint) {
    roleHint.textContent = isParent ? 'Family workspace' : 'Specialist workspace';
  }

  nav.querySelectorAll('[data-page]').forEach(btn => {
    const active = btn.dataset.page === State.page;
    btn.classList.toggle('active', active);
  });
}

function setPage(nextPage) {
  State.page = nextPage;
  render();
}

// ----------------------------------------------------
// 1. Authentication View & Handlers
// ----------------------------------------------------
function renderAuthForm() {
  const isSignup = State.authMode === 'signup';
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');
  const kicker = document.getElementById('signin-kicker');
  const title = document.getElementById('signin-title');
  const subtitle = document.getElementById('signin-subtitle');

  if (isSignup) {
    if (signinForm) signinForm.hidden = true;
    if (signupForm) signupForm.hidden = false;
    if (kicker) kicker.textContent = 'JOIN SMALL STEPS';
    if (title) title.textContent = 'Create your account';
    if (subtitle) subtitle.textContent = 'Join Small Steps to discover inclusive activities or offer specialist care.';

    // Toggle role forms
    const isParentRole = State.signupRole === 'parent';
    const parentFields = document.getElementById('parent-signup-fields');
    const therapistFields = document.getElementById('therapist-signup-fields');

    if (parentFields) parentFields.hidden = !isParentRole;
    if (therapistFields) therapistFields.hidden = isParentRole;

    document.querySelectorAll('.signup-role-btn').forEach(btn => {
      const active = btn.dataset.signupRole === State.signupRole;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  } else {
    if (signinForm) signinForm.hidden = false;
    if (signupForm) signupForm.hidden = true;
    if (kicker) kicker.textContent = 'WELCOME TO SMALL STEPS';
    if (title) title.textContent = 'Sign in';
    if (subtitle) subtitle.textContent = 'Enter your email and password to open your family space or provider workspace.';
  }

  document.querySelectorAll('[data-auth-mode]').forEach(btn => {
    const active = btn.dataset.authMode === State.authMode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  const signinFeedback = document.getElementById('signin-feedback');
  if (signinFeedback) signinFeedback.textContent = '';
  const signupFeedback = document.getElementById('signup-feedback');
  if (signupFeedback) signupFeedback.textContent = '';
}

function setAuthMode(mode) {
  State.authMode = mode;
  renderAuthForm();
}

function setSignupRole(role) {
  State.signupRole = role;
  renderAuthForm();
}

async function handleSignIn(event) {
  event.preventDefault();
  const feedback = document.getElementById('signin-feedback');
  if (feedback) feedback.textContent = '';

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  if (!email || !password) {
    if (feedback) feedback.textContent = 'Please enter both your email address and password.';
    return;
  }

  const submitBtn = document.getElementById('signin-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Signing in...</span>';
  }

  try {
    const res = await SmallStepsAPI.auth.login({ email, password });
    SmallStepsAPI.auth.setToken(res.token);
    State.user = res.user;
    State.page = State.user.role === 'parent' ? 'discover' : 'sessions';
    toast(`Welcome back, ${State.user.name}!`);
    render();
  } catch (err) {
    if (feedback) feedback.textContent = err.message || 'Invalid email or password.';
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign in</span> <span aria-hidden="true">→</span>';
    }
  }
}

async function handleSignUp(event) {
  event.preventDefault();
  const feedback = document.getElementById('signup-feedback');
  if (feedback) feedback.textContent = '';

  const isParent = State.signupRole === 'parent';
  let payload = { role: State.signupRole };

  if (isParent) {
    const name = document.getElementById('parent-name').value.trim();
    const childName = document.getElementById('parent-child-name').value.trim();
    const childAge = document.getElementById('parent-child-age').value.trim();
    const area = document.getElementById('parent-area').value.trim();
    const email = document.getElementById('parent-email').value.trim();
    const password = document.getElementById('parent-password').value;
    const confirmPassword = document.getElementById('parent-confirm-password').value;

    if (!name) { feedback.textContent = 'Please enter your caregiver name.'; return; }
    if (!childName) { feedback.textContent = 'Please enter your child’s name.'; return; }
    if (!email) { feedback.textContent = 'Please enter an email address.'; return; }
    if (password.length < 6) { feedback.textContent = 'Password must be at least 6 characters.'; return; }
    if (password !== confirmPassword) { feedback.textContent = 'Passwords do not match.'; return; }

    payload = {
      role: 'parent',
      name,
      childName,
      childAge,
      area,
      email,
      password
    };
  } else {
    const name = document.getElementById('therapist-name').value.trim();
    const profession = document.getElementById('therapist-profession').value.trim();
    const phone = document.getElementById('therapist-phone').value.trim();
    const area = document.getElementById('therapist-area').value.trim();
    const activities = document.getElementById('therapist-activities').value.trim();
    const fee = document.getElementById('therapist-fee').value;
    const qualifications = document.getElementById('therapist-qualifications').value.trim();
    const isDoctor = document.getElementById('therapist-is-doctor').checked;
    const registrationNumber = document.getElementById('therapist-registration-number').value.trim();
    const registrationCouncil = document.getElementById('therapist-registration-council').value.trim();
    const email = document.getElementById('therapist-email').value.trim();
    const password = document.getElementById('therapist-password').value;
    const confirmPassword = document.getElementById('therapist-confirm-password').value;

    if (!name) { feedback.textContent = 'Please enter your full name.'; return; }
    if (!profession) { feedback.textContent = 'Please enter your professional title.'; return; }
    if (!phone) { feedback.textContent = 'Please enter a contact phone number.'; return; }
    if (!area) { feedback.textContent = 'Please enter your city / location.'; return; }
    if (!activities) { feedback.textContent = 'Please enter at least one activity you offer.'; return; }
    if (isDoctor && (!registrationNumber || !registrationCouncil)) {
      feedback.textContent = 'Medical registration number and council are required for doctor verification.';
      return;
    }
    if (!email) { feedback.textContent = 'Please enter an email address.'; return; }
    if (password.length < 6) { feedback.textContent = 'Password must be at least 6 characters.'; return; }
    if (password !== confirmPassword) { feedback.textContent = 'Passwords do not match.'; return; }

    payload = {
      role: 'therapist',
      name,
      profession,
      phone,
      area,
      specialties: activities,
      sessionFee: fee ? Number(fee) : 700,
      qualifications,
      isDoctor,
      registrationNumber,
      registrationCouncil,
      email,
      password
    };
  }

  const submitBtn = document.getElementById('signup-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating account...</span>';
  }

  try {
    const res = await SmallStepsAPI.auth.register(payload);
    SmallStepsAPI.auth.setToken(res.token);
    State.user = res.user;
    State.page = State.user.role === 'parent' ? 'discover' : 'sessions';
    toast(`Account created! Welcome, ${State.user.name}.`);
    render();
  } catch (err) {
    if (feedback) feedback.textContent = err.message || 'Registration failed. Please check your details.';
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create account</span> <span aria-hidden="true">→</span>';
    }
  }
}

async function signOut() {
  await SmallStepsAPI.auth.logout();
  State.user = null;
  State.page = 'discover';
  toast('Signed out.');
  render();
}

// ----------------------------------------------------
// Family Profile View (Parent Workspace)
// ----------------------------------------------------
async function renderFamilyProfile(container) {
  try {
    const [bookingsRes, regsRes] = await Promise.all([
      SmallStepsAPI.bookings.list().catch(() => ({ bookings: [] })),
      SmallStepsAPI.community.myRegistrations().catch(() => ({ registrations: [] }))
    ]);

    const bookings = bookingsRes.bookings || [];
    const registrations = regsRes.registrations || [];
    const u = State.user;

    container.innerHTML = `
      <section class="family-profile-page">
        <div class="family-profile-header" style="display:flex;align-items:center;gap:18px;margin-bottom:24px;background:#fff8dc;padding:24px;border-radius:18px;border:1px solid #e5d8a8;">
          <div class="profile-avatar-circle" style="width:68px;height:68px;border-radius:50%;background:#cfe4a8;color:#2c5432;display:grid;place-items:center;font-size:26px;font-weight:800;border:2px solid #8ab86f;">
            <span>${esc(initials(u.name))}</span>
          </div>
          <div class="profile-title-block">
            <div class="eyebrow" style="font-size:10px;font-weight:800;letter-spacing:0.12em;color:#578744;">FAMILY WORKSPACE & CHILD PROFILE</div>
            <h1 style="font-size:28px;margin:4px 0 2px;">${esc(u.name)}</h1>
            <p style="margin:0;color:#6b5943;font-size:14px;">${esc(u.email)} · Child: <b>${esc(u.childName || 'Child')}</b> ${u.childAge ? `(${esc(u.childAge)})` : ''}</p>
          </div>
        </div>

        <div class="grid" style="grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr); gap: 24px;">
          <!-- Left: Edit Family Profile Form -->
          <div class="card" style="padding: 24px; background: #fffdf5; border-radius: 16px; border: 1px solid #ebdcb2;">
            <div class="card-head" style="margin-bottom: 20px;">
              <h2 style="font-size:20px;margin-bottom:4px;">Family & Child Details</h2>
              <p style="color: #79664f; font-size: 13px; margin:0;">These details help pediatric activity specialists prepare personalized accommodations for your child.</p>
            </div>

            <form id="family-profile-form">
              <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="field">
                  <label for="fp-name">Caregiver full name</label>
                  <input class="input" id="fp-name" value="${esc(u.name)}" required>
                </div>
                <div class="field">
                  <label for="fp-child-name">Child’s name</label>
                  <input class="input" id="fp-child-name" value="${esc(u.childName || '')}" required>
                </div>
              </div>

              <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px;">
                <div class="field">
                  <label for="fp-child-age">Child’s age / sensory profile</label>
                  <input class="input" id="fp-child-age" placeholder="e.g. 6 years old, loves swimming" value="${esc(u.childAge || '')}">
                </div>
                <div class="field">
                  <label for="fp-location">City / Neighbourhood</label>
                  <input class="input" id="fp-location" placeholder="e.g. Indiranagar, Bengaluru" value="${esc(u.location || '')}">
                </div>
              </div>

              <div class="field" style="margin-top: 14px;">
                <label for="fp-phone">Contact phone number</label>
                <input class="input" id="fp-phone" type="tel" placeholder="+91 98450 00000" value="${esc(u.phone || '')}">
              </div>

              <div class="field" style="margin-top: 14px;">
                <label>Registered email (read only)</label>
                <input class="input" value="${esc(u.email)}" disabled style="background:#f4eedc; cursor:not-allowed;">
              </div>

              <div style="margin-top: 22px; display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" type="submit" id="save-fp-btn">Save Changes</button>
                <span id="fp-feedback" style="font-weight: 700; font-size: 13px; color: #2e6037;"></span>
              </div>
            </form>
          </div>

          <!-- Right: Summary & Quick Actions -->
          <div style="display: flex; flex-direction: column; gap: 18px;">
            <div class="card" style="padding: 20px; background: #eaf5e1; border: 1px solid #c2e2af; border-radius: 16px;">
              <h3 style="margin-bottom: 12px; color: #2e5734; font-size: 17px;">Active Engagements</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: center;">
                <div style="background: #fff; padding: 16px 12px; border-radius: 12px; border: 1px solid #d4ebc5;">
                  <span style="font-size: 28px; font-weight: 800; color: #37633c; display: block;">${bookings.length}</span>
                  <small style="color: #647b68; font-weight: 700; font-size: 11px;">Sessions Booked</small>
                </div>
                <div style="background: #fff; padding: 16px 12px; border-radius: 12px; border: 1px solid #d4ebc5;">
                  <span style="font-size: 28px; font-weight: 800; color: #37633c; display: block;">${registrations.length}</span>
                  <small style="color: #647b68; font-weight: 700; font-size: 11px;">Programs Enrolled</small>
                </div>
              </div>
            </div>

            <div class="card" style="padding: 22px; background: #fffdf5; border: 1px solid #ebdcb2; border-radius: 16px;">
              <h3 style="margin-bottom: 8px; font-size: 17px;">Explore Activities</h3>
              <p style="font-size: 13px; color: #79664f; margin-bottom: 16px; line-height: 1.5;">Find verified pediatric specialists, coaches, or sensory workshops near you.</p>
              <button class="btn btn-primary" style="width: 100%; margin-bottom: 10px;" onclick="setPage('discover')">Find Activities ⌕</button>
              <button class="btn" style="width: 100%;" onclick="setPage('calendar')">View Calendar ▦</button>
            </div>
          </div>
        </div>
      </section>
    `;

    document.getElementById('family-profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = document.getElementById('fp-feedback');
      const saveBtn = document.getElementById('save-fp-btn');
      feedback.textContent = '';
      saveBtn.disabled = true;

      try {
        const name = document.getElementById('fp-name').value.trim();
        const childName = document.getElementById('fp-child-name').value.trim();
        const childAge = document.getElementById('fp-child-age').value.trim();
        const location = document.getElementById('fp-location').value.trim();
        const phone = document.getElementById('fp-phone').value.trim();

        const res = await SmallStepsAPI.auth.updateProfile({
          name,
          childName,
          childAge,
          location,
          phone
        });

        State.user = { ...State.user, ...res.user };
        toast('Family profile updated successfully!');
        feedback.textContent = 'Saved!';
        updateNavigation();
        setTimeout(() => { feedback.textContent = ''; }, 3000);
      } catch (err) {
        feedback.style.color = '#c0392b';
        feedback.textContent = err.message || 'Failed to save changes.';
      } finally {
        saveBtn.disabled = false;
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="error-notice">Could not load family profile: ${esc(err.message)}</div>`;
  }
}

// ----------------------------------------------------
// 2. Discover / Directory View
// ----------------------------------------------------
async function renderDiscover(container) {
  try {
    const [providersRes, ngosRes] = await Promise.all([
      SmallStepsAPI.providers.list(State.filters),
      SmallStepsAPI.community.list({ area: State.filters.area, q: State.filters.q, maxFee: State.filters.maxFee })
    ]);

    const providers = providersRes.providers || [];
    const ngos = ngosRes.programs || [];

    const activitiesList = ['All activities', ...State.activities];

    let contentHtml = `
      <section class="discovery-hero">
        <div class="hero-copy">
          <div class="eyebrow">A little space to grow & play</div>
          <h1 class="display-title">Find their kind<br><em>of wonderful.</em></h1>
          <p>Swimming, art, music and everyday adventures—meet kind specialists who make room for your child to explore, at their own pace.</p>
          <span class="hero-handnote">Tiny steps, big joy—at your child’s pace.</span>
        </div>
        <div class="hero-collage" aria-hidden="true">
          <div class="hero-paper-note">
            <span>MAKE SPACE FOR</span>
            <strong>little<br>adventures</strong>
            <i>✦</i>
          </div>
          <div class="hero-photo-print">
            <div class="hero-landscape">
              <span class="land-sun"></span>
              <span class="land-hill"></span>
              <span class="land-path"></span>
            </div>
            <div class="hero-photo-caption">Start with what they love</div>
          </div>
          <div class="hero-side-note">
            <b>THIS WEEK</b>
            <span>swim · make · explore</span>
          </div>
          <span class="hero-flower">✿</span>
        </div>
      </section>

      <div class="card discovery-search">
        <form class="search-form" id="search-filter-form">
          <div class="field">
            <label for="mp-search">Activity, skill, or provider</label>
            <input class="input" id="mp-search" value="${esc(State.filters.q)}" placeholder="Swimming, music, cooking, name…">
          </div>
          <div class="field">
            <label for="mp-area">Area or city</label>
            <input class="input" id="mp-area" value="${esc(State.filters.area)}" placeholder="Chennai, Adyar, Bengaluru…">
          </div>
          <div class="field">
            <label for="mp-mode">Format</label>
            <select class="input" id="mp-mode">
              <option value="all" ${State.filters.mode === 'all' ? 'selected' : ''}>Any format</option>
              <option value="In person" ${State.filters.mode === 'In person' ? 'selected' : ''}>In person</option>
              <option value="Online" ${State.filters.mode === 'Online' ? 'selected' : ''}>Online</option>
            </select>
          </div>
          <div class="field">
            <label for="mp-budget">Max fee (₹)</label>
            <input class="input" id="mp-budget" type="number" min="0" step="50" value="${esc(State.filters.maxFee)}" placeholder="Any fee">
          </div>
          <button type="submit" class="btn btn-primary search-submit">Find support →</button>
        </form>

        <div class="category-row">
          <span class="tiny muted" style="font-weight:700">Filter activity:</span>
          ${activitiesList.map(cat => `
            <button type="button" class="chip ${State.filters.category === cat ? 'active' : ''}" onclick="selectCategory('${esc(cat)}')">
              ${esc(cat)}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    if (providers.length > 0) {
      contentHtml += `
        <div class="directory-head">
          <div>
            <h2>${providers.length} ${providers.length === 1 ? 'specialist' : 'specialists'} available</h2>
            <p>Click any profile card to view full approach, qualifications, open slots, and family reviews.</p>
          </div>
          <span class="tag orange">Verified & sample specialists</span>
        </div>
        <div class="provider-grid">
          ${providers.map((p, i) => renderProviderCard(p, i)).join('')}
        </div>
      `;
    }

    if (ngos.length > 0) {
      contentHtml += `
        <div class="directory-head" style="margin-top:28px">
          <div>
            <h2>${ngos.length} community group ${ngos.length === 1 ? 'activity' : 'activities'}</h2>
            <p>Explore free and low-cost inclusive group sessions hosted by community organisations.</p>
          </div>
          <span class="tag green">Community & NGOs</span>
        </div>
        <div class="ngo-grid">
          ${ngos.map(renderNgoCard).join('')}
        </div>
      `;
    }

    if (providers.length === 0 && ngos.length === 0) {
      contentHtml += `
        <div class="card empty-state">
          <div class="empty-icon">⌕</div>
          <h2>Oops, sorry!</h2>
          <p>We couldn't find any listings matching those filters. Try searching for a different area or activity.</p>
          <button class="btn" onclick="clearFilters()">Clear all filters</button>
        </div>
      `;
    }

    container.innerHTML = contentHtml;

    document.getElementById('search-filter-form').onsubmit = (e) => {
      e.preventDefault();
      State.filters.q = document.getElementById('mp-search').value.trim();
      State.filters.area = document.getElementById('mp-area').value.trim();
      State.filters.mode = document.getElementById('mp-mode').value;
      State.filters.maxFee = document.getElementById('mp-budget').value;
      render();
    };
  } catch (err) {
    container.innerHTML = `<div class="card empty-state"><p>Error loading directory: ${esc(err.message)}</p></div>`;
  }
}

function selectCategory(cat) {
  State.filters.category = cat;
  render();
}

function clearFilters() {
  State.filters = { q: '', area: '', mode: 'all', category: 'All activities', maxFee: '' };
  render();
}

function renderProviderCard(t, index) {
  const nextSlot = t.slots && t.slots.length ? t.slots[0] : null;
  const ratingAvg = t.averageRating || '—';
  const reviewsCount = t.reviewsCount || 0;

  let offerHtml = '';
  if (t.offer && t.offer.percent) {
    const discounted = Math.round(Number(t.session_fee) * (100 - Number(t.offer.percent)) / 100);
    offerHtml = `
      <div class="provider-offer">
        <span class="offer-burst">−${t.offer.percent}%</span>
        <div>
          <b>Special offer: ₹${discounted.toLocaleString('en-IN')} / session</b>
          <small>Standard ₹${Number(t.session_fee).toLocaleString('en-IN')} · valid until ${fmtDate(t.offer.endDate)}</small>
        </div>
      </div>
    `;
  }

  return `
    <article class="provider-card" onclick="openProviderModal('${esc(t.id)}')">
      <div class="provider-file-tab">
        <span>Specialist file</span>
        <span>${esc(t.specialties[0] || 'Activities')}</span>
      </div>
      ${providerPortrait(t)}
      <div class="provider-card-body">
        <div class="provider-top">
          <div class="provider-title">
            <h3>${esc(t.name)}</h3>
            <p>${esc(t.profession)}</p>
          </div>
          <span class="profile-badge">${t.is_doctor ? 'Medical doctor' : 'Specialist'}</span>
        </div>

        <div class="provider-rating">
          <span>★ ${ratingAvg}</span>
          <button type="button" onclick="event.stopPropagation();openReviewsPage('${esc(t.id)}')">
            (${reviewsCount} ${reviewsCount === 1 ? 'review' : 'reviews'})
          </button>
        </div>

        <div class="provider-tags">
          ${t.specialties.slice(0, 3).map(s => tag(s, 'purple')).join('')}
        </div>

        <p class="provider-bio">${esc(t.bio)}</p>

        <div class="provider-facts">
          <span>⌖ ${esc(t.area || 'Service area flexible')}</span>
          <span>◷ ${Number(t.experience_years) || 0} years experience</span>
          <span>◉ ${t.formats.map(esc).join(' · ')}</span>
        </div>

        <div class="provider-price">
          ₹${Number(t.session_fee).toLocaleString('en-IN')} <small>/ session</small>
        </div>

        ${offerHtml}

        <div class="provider-footer">
          <div class="next-slot">
            ${nextSlot ? `Next opening: <b>${fmtDate(nextSlot.date)} · ${esc(nextSlot.time)}</b>` : 'No upcoming slots posted'}
          </div>
          <div class="provider-actions">
            <button class="btn btn-sm" onclick="event.stopPropagation();openProviderModal('${esc(t.id)}')">
              Full profile ↗
            </button>
            <button class="btn btn-primary btn-sm" ${nextSlot ? '' : 'disabled'} onclick="event.stopPropagation();openBookingModal('${esc(t.id)}','${nextSlot ? esc(nextSlot.id) : ''}')">
              Request session
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderNgoCard(p) {
  return `
    <article class="ngo-card">
      <div class="ngo-card-top">
        <span class="ngo-stamp">${p.fee > 0 ? 'PAID' : 'FREE'}</span>
        <span class="tag ${p.fee > 0 ? 'orange' : 'green'}">
          ${p.fee > 0 ? `₹${Number(p.fee).toLocaleString('en-IN')}` : 'No registration fee'}
        </span>
      </div>
      <div class="ngo-kicker">${esc(p.org)}</div>
      <h2>${esc(p.title)}</h2>
      <p>${esc(p.details)}</p>
      <div class="ngo-facts">
        <span>⌖ ${esc(p.area)}</span>
        <span>▦ Starts ${fmtDate(p.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span>◷ ${p.sessions} ${p.sessions === 1 ? 'session' : 'sessions'} (${esc(p.duration)})</span>
        <span>♡ Suitable for ${esc(p.age)}</span>
      </div>
      <div class="ngo-deadline">Register by ${fmtDate(p.deadline)}</div>
      <button class="btn btn-primary" onclick="openNgoRegistrationModal('${esc(p.id)}')">
        View details & register →
      </button>
    </article>
  `;
}

// ----------------------------------------------------
// 3. Provider Full Profile Spread Modal (2-leaf notebook)
// ----------------------------------------------------
async function openProviderModal(id) {
  try {
    const data = await SmallStepsAPI.providers.get(id);
    const t = data.provider;

    let offerBlock = '';
    if (t.offer && t.offer.percent) {
      const disc = Math.round(Number(t.session_fee) * (100 - Number(t.offer.percent)) / 100);
      offerBlock = `
        <div class="provider-offer" style="margin:10px 0">
          <span class="offer-burst">−${t.offer.percent}%</span>
          <div>
            <b>Promotional rate: ₹${disc.toLocaleString('en-IN')} / session</b>
            <small>Standard: ₹${Number(t.session_fee).toLocaleString('en-IN')} · Valid until ${fmtDate(t.offer.endDate)}</small>
          </div>
        </div>
      `;
    }

    const doctorRow = t.is_doctor ? `
      <div class="profile-note-row">
        <span>Medical Registration</span>
        <b>${esc(t.registration_number || 'Registered')} · ${esc(t.registration_council || 'Medical Council')}</b>
      </div>
    ` : '';

    const slotsList = t.slots && t.slots.length ? t.slots.map(s => `
      <div class="slot-row">
        <div>
          <b>${fmtDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })} · ${esc(s.time)}</b>
          <small>${esc(s.activity)} (${esc(s.mode)})</small>
        </div>
        <button class="btn btn-primary btn-sm" onclick="closeModal();openBookingModal('${esc(t.id)}','${esc(s.id)}')">
          Request this slot
        </button>
      </div>
    `).join('') : '<p class="muted tiny">No public slots posted right now. Message provider directly to arrange a time.</p>';

    const bodyHtml = `
      <div class="profile-spread">
        <!-- Cover Leaf -->
        <section class="profile-leaf profile-cover-leaf">
          <div class="profile-page-label">
            <span>ACTIVITY SPECIALIST</span>
            <span>PROFILE FILE</span>
          </div>
          ${providerPortrait(t, 'profile-large')}
          <h2>${esc(t.name)}</h2>
          <p class="profile-role">${esc(t.profession)}</p>
          <div class="provider-tags">
            ${t.specialties.map(s => tag(s, 'purple')).join('')}
          </div>
          <div class="profile-story">
            <span class="notes-label">A LITTLE ABOUT ME</span>
            <p>${esc(t.bio)}</p>
          </div>
          <div class="profile-contact-actions">
            <button class="btn" onclick="closeModal();startConversationWith('${esc(t.id)}')">
              Message provider
            </button>
            <button class="btn btn-sm" onclick="closeModal();openReviewsPage('${esc(t.id)}')">
              Read all reviews (${t.reviewsCount})
            </button>
          </div>
        </section>

        <!-- Notes Leaf -->
        <section class="profile-leaf profile-notes-leaf">
          <div class="notes-page-title">
            <div>
              <span class="notes-label">SPECIALIST DETAILS</span>
              <h3>Getting to know ${esc(t.name.split(' ')[0])}</h3>
            </div>
            <span style="color:var(--orange);font-size:20px">✦</span>
          </div>

          <div class="profile-note-row">
            <span>Activities</span>
            <b>${esc(t.specialties.join(' · '))}</b>
          </div>
          <div class="profile-note-row">
            <span>Experience</span>
            <b>${Number(t.experience_years)} years</b>
          </div>
          <div class="profile-note-row">
            <span>Service area</span>
            <b>${esc(t.area || 'Flexible / Online')}</b>
          </div>
          <div class="profile-note-row">
            <span>Session formats</span>
            <b>${esc(t.formats.join(' · '))}</b>
          </div>
          <div class="profile-note-row">
            <span>Languages</span>
            <b>${esc(t.languages.join(' · '))}</b>
          </div>
          <div class="profile-note-row">
            <span>Phone</span>
            <b><a href="tel:${esc(t.phone)}" style="color:var(--green)">${esc(t.phone || 'Available on request')}</a></b>
          </div>
          <div class="profile-note-row">
            <span>Email</span>
            <b><a href="mailto:${esc(t.email)}" style="color:var(--green)">${esc(t.email)}</a></b>
          </div>
          <div class="profile-note-row">
            <span>Session fee</span>
            <b>₹${Number(t.session_fee).toLocaleString('en-IN')} per session</b>
          </div>

          ${offerBlock}
          ${doctorRow}

          <div class="profile-notes-block">
            <span class="notes-label">QUALIFICATIONS & ACCREDITATIONS</span>
            <ul>
              ${t.qualifications.map(q => `<li>${esc(q)}</li>`).join('')}
            </ul>
          </div>

          <div class="profile-notes-block">
            <span class="notes-label">HOW I ADAPT ACTIVITIES</span>
            <p>${esc(t.approach || 'Predictable structure, child-led pacing, sensory accommodations, and collaborative check-ins.')}</p>
          </div>

          <div class="profile-notes-block">
            <span class="notes-label">OPEN APPOINTMENT TIMES</span>
            <div style="margin-top:6px">
              ${slotsList}
            </div>
          </div>
        </section>
      </div>
    `;

    openModal('Provider Profile', bodyHtml, null, null, true);
  } catch (err) {
    toast(`Could not open profile: ${err.message}`);
  }
}

// ----------------------------------------------------
// 4. Session Booking Modal
// ----------------------------------------------------
async function openBookingModal(providerId, slotId = '') {
  if (State.user.role !== 'parent') {
    toast('Only parent accounts can request sessions.');
    return;
  }

  try {
    const data = await SmallStepsAPI.providers.get(providerId);
    const t = data.provider;
    const slot = t.slots.find(s => s.id === slotId) || t.slots[0];

    const bodyHtml = `
      <div style="background:#fff8dc;padding:12px;border-radius:8px;border:1px solid #ead99b;margin-bottom:14px">
        <b>Requesting with: ${esc(t.name)}</b>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">
          ${slot ? `Selected slot: <b>${fmtDate(slot.date, { weekday: 'long', month: 'long', day: 'numeric' })} at ${esc(slot.time)}</b>` : 'Custom session request'}
        </div>
        <div style="font-size:11px;color:var(--muted)">Activity: ${esc(slot?.activity || t.specialties[0])} · Format: ${esc(slot?.mode || 'In person')}</div>
        <div style="font-size:12px;font-weight:800;color:var(--green);margin-top:4px">
          Fee: ₹${Number(t.session_fee).toLocaleString('en-IN')}
        </div>
      </div>
      <div class="field">
        <label for="booking-note">Helpful context for the provider (sensory preferences, goals, questions):</label>
        <textarea class="textarea" id="booking-note" placeholder="Our child Mira loves water games and responds best to visual schedules..."></textarea>
      </div>
    `;

    openModal('Request an Appointment', bodyHtml, 'Send Request', async () => {
      const note = document.getElementById('booking-note').value;
      try {
        await SmallStepsAPI.bookings.create({
          providerId: t.id,
          slotId: slot ? slot.id : null,
          note
        });
        closeModal();
        toast('Session request sent to provider!');
        setPage('sessions');
      } catch (err) {
        toast(`Request failed: ${err.message}`);
      }
    });
  } catch (err) {
    toast(`Could not start booking: ${err.message}`);
  }
}

// ----------------------------------------------------
// 5. Community Group Activities View & Modal
// ----------------------------------------------------
async function renderCommunity(container) {
  try {
    const [ngosRes, myRegsRes] = await Promise.all([
      SmallStepsAPI.community.list(),
      SmallStepsAPI.community.myRegistrations()
    ]);

    const programs = ngosRes.programs || [];
    const myRegistrations = myRegsRes.registrations || [];

    let registeredHtml = '';
    if (myRegistrations.length > 0) {
      registeredHtml = `
        <div class="card" style="margin-bottom:24px;background:#f3f8ee;border-color:#b9d995">
          <div class="card-head">
            <div>
              <h2>Your group registrations (${myRegistrations.length})</h2>
              <p>Active registration requests submitted to community activity organisers.</p>
            </div>
            <span class="tag green">Confirmed in space</span>
          </div>
          <div class="stack">
            ${myRegistrations.map(r => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed #c0d8a5">
                <div>
                  <b style="font-size:13px">${esc(r.title)}</b>
                  <div style="font-size:11px;color:var(--muted)">${esc(r.org)} · ${esc(r.area)} · Starts ${fmtDate(r.date)}</div>
                </div>
                <span class="tag green">Registered</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="greeting">
        <div>
          <div class="eyebrow">Community & NGOs</div>
          <h1 class="display-title">Group activities & inclusive clubs</h1>
          <p>Explore welcoming group sessions designed for children to explore together at a comfortable pace.</p>
        </div>
      </div>

      ${registeredHtml}

      <div class="ngo-grid">
        ${programs.map(renderNgoCard).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card empty-state"><p>Error loading community activities: ${esc(err.message)}</p></div>`;
  }
}

async function openNgoRegistrationModal(programId) {
  try {
    const data = await SmallStepsAPI.community.get(programId);
    const p = data.program;

    const bodyHtml = `
      <div style="background:#fff8dc;padding:12px;border-radius:8px;border:1px solid #ead99b;margin-bottom:14px">
        <b style="font-size:14px">${esc(p.title)}</b>
        <div style="font-size:11px;color:var(--muted);margin:3px 0">${esc(p.org)} · ${esc(p.area)}</div>
        <p style="font-size:11px;color:#55442f;margin-top:6px">${esc(p.details)}</p>
        <div style="font-size:11px;font-weight:800;color:var(--green)">
          ${p.fee > 0 ? `Fee: ₹${Number(p.fee).toLocaleString('en-IN')} (covers all sessions)` : 'Free community activity'}
        </div>
      </div>
      <div class="field">
        <label for="ngo-parent-name">Parent / caregiver name</label>
        <input class="input" id="ngo-parent-name" value="${esc(State.user.name)}" required>
      </div>
      <div class="field">
        <label for="ngo-email">Contact email</label>
        <input class="input" id="ngo-email" type="email" value="${esc(State.user.email)}" required>
      </div>
      <div class="field">
        <label for="ngo-child-age">Child's age</label>
        <input class="input" id="ngo-child-age" type="number" min="2" max="18" value="7" required>
      </div>
      <div class="field">
        <label for="ngo-note">Any access notes or preferences for the facilitators:</label>
        <textarea class="textarea" id="ngo-note" placeholder="Quiet pauses, preferred sensory equipment, etc."></textarea>
      </div>
    `;

    openModal('Register for Group Activity', bodyHtml, 'Submit Registration', async () => {
      const parentName = document.getElementById('ngo-parent-name').value.trim();
      const email = document.getElementById('ngo-email').value.trim();
      const childAge = document.getElementById('ngo-child-age').value;
      const note = document.getElementById('ngo-note').value.trim();

      if (!parentName || !email || !childAge) {
        toast('Please fill in all required fields.');
        return;
      }

      try {
        await SmallStepsAPI.community.register(p.id, {
          parentName,
          email,
          childAge,
          note
        });
        closeModal();
        toast('Registration request submitted!');
        render();
      } catch (err) {
        toast(`Registration failed: ${err.message}`);
      }
    });
  } catch (err) {
    toast(`Could not open registration: ${err.message}`);
  }
}

// ----------------------------------------------------
// 6. Sessions & Requests Management View
// ----------------------------------------------------
async function renderSessions(container) {
  try {
    const res = await SmallStepsAPI.bookings.list();
    const bookings = res.bookings || [];
    const isParent = State.user.role === 'parent';

    const pending = bookings.filter(b => b.status === 'pending');
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const past = bookings.filter(b => ['completed', 'declined', 'cancelled'].includes(b.status));

    container.innerHTML = `
      <div class="greeting">
        <div>
          <div class="eyebrow">${isParent ? 'My Family Sessions' : 'Provider Requests & Appointments'}</div>
          <h1 class="display-title">${isParent ? 'Appointments & bookings' : 'Session management queue'}</h1>
          <p>${isParent ? 'Keep track of appointment requests, upcoming confirmed sessions, and notes with your providers.' : 'Review new booking requests, confirm session times, and coordinate with families.'}</p>
        </div>
        ${isParent ? '<button class="btn btn-primary" onclick="setPage(\'discover\')">Find a specialist →</button>' : ''}
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <h2>${isParent ? 'Your bookings' : 'Client session queue'} (${bookings.length})</h2>
            <p>Real-time booking records stored securely in the Small Steps server database.</p>
          </div>
        </div>

        ${bookings.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">◷</div>
            <h2>No appointments scheduled</h2>
            <p>${isParent ? 'Search the directory and request your first session with an activity specialist.' : 'When families request an appointment opening, it will appear here for confirmation.'}</p>
            ${isParent ? '<button class="btn btn-primary" onclick="setPage(\'discover\')">Explore providers</button>' : ''}
          </div>
        ` : `
          <div class="stack">
            ${bookings.map(b => renderBookingRow(b, isParent)).join('')}
          </div>
        `}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card empty-state"><p>Error loading sessions: ${esc(err.message)}</p></div>`;
  }
}

function renderBookingRow(b, isParent) {
  const d = new Date(b.date + 'T12:00:00');
  const dayNum = isNaN(d.getTime()) ? '1' : d.getDate();
  const dayName = isNaN(d.getTime()) ? 'Day' : d.toLocaleDateString('en-US', { weekday: 'short' });

  const statusTone = {
    pending: 'orange',
    confirmed: 'green',
    completed: 'blue',
    declined: 'gray',
    cancelled: 'gray'
  }[b.status] || 'gray';

  let actionsHtml = '';
  if (isParent) {
    if (['pending', 'confirmed'].includes(b.status)) {
      actionsHtml += `<button class="btn btn-sm" onclick="updateBookingStatus('${esc(b.id)}', 'cancelled')">Cancel appointment</button>`;
    }
    actionsHtml += `<button class="btn btn-sm" onclick="startConversationWith('${esc(b.therapist_id)}')">Message provider</button>`;
  } else {
    // Therapist actions
    if (b.status === 'pending') {
      actionsHtml += `
        <button class="btn btn-primary btn-sm" onclick="updateBookingStatus('${esc(b.id)}', 'confirmed')">Confirm request</button>
        <button class="btn btn-sm" onclick="updateBookingStatus('${esc(b.id)}', 'declined')">Decline</button>
      `;
    } else if (b.status === 'confirmed') {
      actionsHtml += `
        <button class="btn btn-primary btn-sm" onclick="updateBookingStatus('${esc(b.id)}', 'completed')">Mark completed</button>
      `;
    }
    actionsHtml += `<button class="btn btn-sm" onclick="startConversationWith('${esc(b.parent_id)}')">Message family</button>`;
  }

  const partnerName = isParent ? b.therapistName : (b.childName ? `${b.parentName} (${b.childName}’s family)` : b.parentName);

  return `
    <div class="booking-row">
      <div class="datebox">
        <b>${dayNum}</b>
        <small>${dayName}</small>
      </div>
      <div class="booking-main">
        <div class="booking-title">
          <b>${esc(b.activity)} session</b>
          <span class="tag ${statusTone}">${esc(b.status.toUpperCase())}</span>
        </div>
        <p>with <b>${esc(partnerName)}</b> · ${fmtDate(b.date, { month: 'short', day: 'numeric', year: 'numeric' })} at ${esc(b.time)} (${esc(b.mode)})</p>
        ${b.note ? `<div class="booking-note">${esc(b.note)}</div>` : ''}
        <div class="booking-actions">
          ${actionsHtml}
        </div>
      </div>
    </div>
  `;
}

async function updateBookingStatus(id, newStatus) {
  try {
    await SmallStepsAPI.bookings.updateStatus(id, newStatus);
    toast(`Appointment marked as ${newStatus}.`);
    render();
  } catch (err) {
    toast(`Could not update status: ${err.message}`);
  }
}

// ----------------------------------------------------
// 7. Calendar View
// ----------------------------------------------------
async function renderCalendar(container) {
  try {
    const year = State.calendarDate.getFullYear();
    const month = State.calendarDate.getMonth() + 1;

    const res = await SmallStepsAPI.calendar.getEvents(year, month);
    const events = res.events || [];

    const monthName = State.calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Build Calendar Matrix for this month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startOffset = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const todayStr = new Date().toISOString().slice(0, 10);

    let daysHtml = '';
    // Leading days from prev month
    for (let i = 0; i < startOffset; i++) {
      daysHtml += `<div class="day out"></div>`;
    }

    for (let d = 1; d <= totalDays; d++) {
      const curDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = curDateStr === todayStr;
      const dayEvents = events.filter(e => e.date === curDateStr);

      daysHtml += `
        <div class="day ${isToday ? 'today' : ''}">
          <span class="daynum">${d}</span>
          ${dayEvents.map(e => `
            <div class="cal-event ${esc(e.category)}" title="${esc(e.title)} (${esc(e.time)})">
              ${esc(e.time)} ${esc(e.title)}
            </div>
          `).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="greeting">
        <div>
          <div class="eyebrow">Interactive Schedule</div>
          <h1 class="display-title">Calendar & timetable</h1>
          <p>${State.user.role === 'parent' ? 'Overview of all your confirmed sessions, pending requests, and registered community groups.' : 'Your therapist timetable with bookings and published availability openings.'}</p>
        </div>
        <div class="greeting-actions">
          <button class="btn" onclick="changeMonth(-1)">‹ Previous</button>
          <button class="btn" onclick="changeMonth(1)">Next ›</button>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <h2>${monthName}</h2>
            <p>Events color-coded: green for sessions, orange for community activities, purple for open slots.</p>
          </div>
        </div>

        <div class="calendar">
          <div class="weekday">Sun</div>
          <div class="weekday">Mon</div>
          <div class="weekday">Tue</div>
          <div class="weekday">Wed</div>
          <div class="weekday">Thu</div>
          <div class="weekday">Fri</div>
          <div class="weekday">Sat</div>
          ${daysHtml}
        </div>

        <div style="display:flex;gap:18px;margin-top:16px;font-size:11px;font-weight:700">
          <span><span class="tag green" style="padding:2px 6px">■</span> Confirmed / Session</span>
          <span><span class="tag orange" style="padding:2px 6px">■</span> Community / Request</span>
          ${State.user.role === 'therapist' ? '<span><span class="tag purple" style="padding:2px 6px">■</span> Open availability</span>' : ''}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card empty-state"><p>Error loading calendar: ${esc(err.message)}</p></div>`;
  }
}

function changeMonth(delta) {
  State.calendarDate = new Date(State.calendarDate.getFullYear(), State.calendarDate.getMonth() + delta, 1);
  render();
}

// ----------------------------------------------------
// 8. Messages & Chat View
// ----------------------------------------------------
async function renderMessages(container) {
  try {
    const res = await SmallStepsAPI.messages.getThreads();
    const threads = res.threads || [];

    if (threads.length === 0) {
      container.innerHTML = `
        <div class="greeting">
          <div>
            <div class="eyebrow">Private Messaging</div>
            <h1 class="display-title">Care team conversations</h1>
            <p>Talk privately with your connected providers and families.</p>
          </div>
        </div>
        <div class="card empty-state">
          <div class="empty-icon">◌</div>
          <h2>No active conversations yet</h2>
          <p>${State.user.role === 'parent' ? 'Start a conversation from any provider profile card or during booking.' : 'Messages from families who have contacted or booked you will appear here.'}</p>
          ${State.user.role === 'parent' ? '<button class="btn btn-primary" onclick="setPage(\'discover\')">Browse providers</button>' : ''}
        </div>
      `;
      return;
    }

    if (!State.selectedThread || !threads.some(t => t.partnerId === State.selectedThread)) {
      State.selectedThread = threads[0].partnerId;
    }

    const activePartner = threads.find(t => t.partnerId === State.selectedThread) || threads[0];
    const messagesRes = await SmallStepsAPI.messages.getConversation(activePartner.partnerId);
    const messages = messagesRes.messages || [];

    container.innerHTML = `
      <div class="greeting">
        <div>
          <div class="eyebrow">Private Messaging</div>
          <h1 class="display-title">Care team conversations</h1>
          <p>Real-time encrypted parent-therapist chat. Isolated strictly to this relationship.</p>
        </div>
      </div>

      <div class="card messages-layout">
        <div class="threads">
          <div class="thread-label">${State.user.role === 'parent' ? 'Your specialists' : 'Connected families'}</div>
          ${threads.map(t => `
            <div class="thread ${t.partnerId === State.selectedThread ? 'active' : ''}" onclick="selectThread('${esc(t.partnerId)}')">
              ${avatar(t, t.tone || 'green')}
              <div>
                <b>${esc(t.name)}</b>
                <small>${esc(t.childName ? `Child: ${t.childName}` : (t.profession || 'Specialist'))}</small>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="chat">
          <div class="chat-header">
            ${avatar(activePartner, activePartner.tone || 'green')}
            <div>
              <b style="font-size:14px">${esc(activePartner.name)}</b>
              <small style="color:var(--muted)">${esc(activePartner.childName ? `${activePartner.childName}’s family` : activePartner.profession)}</small>
            </div>
            <span class="tag green" style="margin-left:auto">End-to-end verified</span>
          </div>

          <div class="chat-log" id="chat-log">
            ${messages.length === 0 ? `
              <div class="empty-state compact">Start your conversation about session needs, schedule, or preferences.</div>
            ` : messages.map(m => `
              <div class="msg ${m.isMine ? 'mine' : ''}">
                <div class="bubble">${esc(m.text)}</div>
                <time>${esc(m.time)}</time>
              </div>
            `).join('')}
          </div>

          <form class="chat-form" id="chat-form">
            <input class="input" id="chat-input" placeholder="Type a message..." autocomplete="off" required>
            <button type="submit" class="btn btn-primary">Send →</button>
          </form>
        </div>
      </div>
    `;

    const chatLog = document.getElementById('chat-log');
    if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;

    document.getElementById('chat-form').onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text) return;

      try {
        await SmallStepsAPI.messages.send(activePartner.partnerId, text);
        input.value = '';
        // Refresh messages view
        render();
      } catch (err) {
        toast(`Could not send message: ${err.message}`);
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="card empty-state"><p>Error loading messages: ${esc(err.message)}</p></div>`;
  }
}

function selectThread(partnerId) {
  State.selectedThread = partnerId;
  render();
}

function startConversationWith(partnerId) {
  State.selectedThread = partnerId;
  setPage('messages');
}

// ----------------------------------------------------
// 9. Therapist Profile Management View
// ----------------------------------------------------
async function renderProfile(container) {
  try {
    const authData = await SmallStepsAPI.auth.me();
    const t = authData.therapistProfile;

    if (!t) {
      container.innerHTML = '<div class="card empty-state"><p>Therapist profile not found.</p></div>';
      return;
    }

    const slots = await SmallStepsAPI.providers.get(t.id).then(r => r.provider.slots).catch(() => []);

    container.innerHTML = `
      <div class="greeting">
        <div>
          <div class="eyebrow">Provider presence</div>
          <h1 class="display-title">Profile & practice setup</h1>
          <p>Manage your public directory profile, specialties, qualifications, fees, and open session slots.</p>
        </div>
        <div class="greeting-actions">
          <button class="btn btn-primary" onclick="openPricingModal()">Set fees & promotional offer</button>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <div class="card-head">
            <div>
              <h2>Professional Profile</h2>
              <p>These details are visible to parents browsing the Small Steps directory.</p>
            </div>
            <span class="tag ${t.listed ? 'green' : 'gray'}">${t.listed ? 'Visible in directory' : 'Hidden'}</span>
          </div>

          <form id="provider-profile-form">
            <div class="photo-upload">
              <div class="photo-upload-preview" id="profile-photo-preview">
                ${providerPortrait(t, 'compact')}
              </div>
              <div class="field" style="margin:0">
                <label for="profile-photo-input">Profile Photo</label>
                <input class="input" type="file" id="profile-photo-input" accept="image/*">
                <small class="field-hint">A warm, friendly photo helps children and parents feel comfortable.</small>
              </div>
            </div>

            <div class="provider-setup-panel">
              <h3>Contact & Credentials</h3>
              <p style="font-size:11px;color:#2f5035;margin-bottom:10px">Contact details parents use to get in touch with you.</p>

              <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
                <div class="field">
                  <label for="edit-phone">Contact Phone</label>
                  <input class="input" id="edit-phone" value="${esc(t.phone)}" required>
                </div>
                <div class="field">
                  <label for="edit-email">Contact Email</label>
                  <input class="input" id="edit-email" type="email" value="${esc(t.email)}" required>
                </div>
              </div>

              <label class="doctor-toggle">
                <input type="checkbox" id="edit-is-doctor" ${t.is_doctor ? 'checked' : ''} onchange="toggleDoctorInputs(this.checked)">
                <span><b>I am a registered medical doctor</b> <small>(Paediatrician, psychiatrist, etc.)</small></span>
              </label>

              <div class="doctor-registration-grid" id="doctor-fields" ${t.is_doctor ? '' : 'hidden'}>
                <div class="field">
                  <label for="edit-reg-num">Medical Registration Number</label>
                  <input class="input" id="edit-reg-num" value="${esc(t.registration_number)}" placeholder="e.g. MCI-12345">
                </div>
                <div class="field">
                  <label for="edit-reg-council">Issuing Medical Council / State</label>
                  <input class="input" id="edit-reg-council" value="${esc(t.registration_council)}" placeholder="e.g. Tamil Nadu Medical Council">
                </div>
              </div>
            </div>

            <div class="field">
              <label for="edit-name">Full Professional Name</label>
              <input class="input" id="edit-name" value="${esc(t.name)}" required>
            </div>

            <div class="field">
              <label for="edit-profession">Professional Title</label>
              <input class="input" id="edit-profession" value="${esc(t.profession)}" required>
            </div>

            <div class="field">
              <label for="edit-specialties">Activities Offered (comma-separated)</label>
              <input class="input" id="edit-specialties" value="${esc(t.specialties.join(', '))}" required>
            </div>

            <div class="field">
              <label for="edit-bio">About Me & Introduction</label>
              <textarea class="textarea" id="edit-bio" required>${esc(t.bio)}</textarea>
            </div>

            <div class="field">
              <label for="edit-qualifications">Qualifications (one per line)</label>
              <textarea class="textarea" id="edit-qualifications" required>${esc(t.qualifications.join('\n'))}</textarea>
            </div>

            <div class="field">
              <label for="edit-approach">How You Adapt Activities for Support Needs</label>
              <textarea class="textarea" id="edit-approach">${esc(t.approach || '')}</textarea>
            </div>

            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
              <div class="field">
                <label for="edit-experience">Years Experience</label>
                <input class="input" type="number" min="0" max="60" id="edit-experience" value="${Number(t.experience_years)}">
              </div>
              <div class="field">
                <label for="edit-area">Service Area / City</label>
                <input class="input" id="edit-area" value="${esc(t.area || '')}" placeholder="Indiranagar, Chennai, etc.">
              </div>
            </div>

            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
              <div class="field">
                <label for="edit-formats">Session Formats</label>
                <input class="input" id="edit-formats" value="${esc(t.formats.join(', '))}">
              </div>
              <div class="field">
                <label for="edit-languages">Languages</label>
                <input class="input" id="edit-languages" value="${esc(t.languages.join(', '))}">
              </div>
            </div>

            <div style="margin:12px 0">
              <label style="display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer">
                <input type="checkbox" id="edit-listed" ${t.listed ? 'checked' : ''}>
                Publish profile in public specialist directory
              </label>
            </div>

            <button type="submit" class="btn btn-primary">Save Profile Changes</button>
          </form>
        </div>

        <div class="stack">
          <!-- Availability Slot Manager -->
          <div class="card">
            <div class="card-head">
              <div>
                <h2>Open Session Times</h2>
                <p>Add availability slots so parents can book appointments directly.</p>
              </div>
            </div>

            <form id="add-slot-form" style="margin-bottom:16px;background:#fff8dc;padding:12px;border-radius:6px;border:1px solid #ead99b">
              <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
                <div class="field" style="margin:0">
                  <label for="slot-date">Date</label>
                  <input class="input" type="date" id="slot-date" required>
                </div>
                <div class="field" style="margin:0">
                  <label for="slot-time">Start Time</label>
                  <input class="input" type="time" id="slot-time" value="10:00" required>
                </div>
              </div>
              <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
                <div class="field" style="margin:0">
                  <label for="slot-activity">Activity</label>
                  <input class="input" id="slot-activity" value="${esc(t.specialties[0] || 'Swimming')}" required>
                </div>
                <div class="field" style="margin:0">
                  <label for="slot-mode">Format</label>
                  <select class="input" id="slot-mode">
                    <option value="In person">In person</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-sm" style="margin-top:10px;width:100%">Add Open Slot</button>
            </form>

            <div class="stack">
              ${slots.length === 0 ? '<div class="empty-state compact">No open appointment slots. Add one above.</div>' : slots.map(s => `
                <div class="slot-row">
                  <div>
                    <b>${fmtDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })} at ${esc(s.time)}</b>
                    <small>${esc(s.activity)} (${esc(s.mode)})</small>
                  </div>
                  <button class="btn btn-sm" onclick="removeAvailabilitySlot('${esc(s.id)}')">Remove</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Photo input change handler
    let photoData = t.photo;
    document.getElementById('profile-photo-input').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        photoData = reader.result;
        document.getElementById('profile-photo-preview').innerHTML = providerPortrait({ ...t, photo: photoData }, 'compact');
      };
      reader.readAsDataURL(file);
    };

    // Form submit
    document.getElementById('provider-profile-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await SmallStepsAPI.providers.updateProfile({
          name: document.getElementById('edit-name').value,
          profession: document.getElementById('edit-profession').value,
          specialties: document.getElementById('edit-specialties').value,
          bio: document.getElementById('edit-bio').value,
          qualifications: document.getElementById('edit-qualifications').value,
          approach: document.getElementById('edit-approach').value,
          experienceYears: document.getElementById('edit-experience').value,
          area: document.getElementById('edit-area').value,
          formats: document.getElementById('edit-formats').value,
          languages: document.getElementById('edit-languages').value,
          phone: document.getElementById('edit-phone').value,
          email: document.getElementById('edit-email').value,
          isDoctor: document.getElementById('edit-is-doctor').checked,
          registrationNumber: document.getElementById('edit-reg-num')?.value,
          registrationCouncil: document.getElementById('edit-reg-council')?.value,
          photo: photoData,
          listed: document.getElementById('edit-listed').checked
        });
        toast('Provider profile successfully saved!');
        render();
      } catch (err) {
        toast(`Save error: ${err.message}`);
      }
    };

    // Add slot submit
    document.getElementById('add-slot-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await SmallStepsAPI.providers.addSlot({
          date: document.getElementById('slot-date').value,
          time: document.getElementById('slot-time').value,
          activity: document.getElementById('slot-activity').value,
          mode: document.getElementById('slot-mode').value
        });
        toast('New availability slot added.');
        render();
      } catch (err) {
        toast(`Could not add slot: ${err.message}`);
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="card empty-state"><p>Error loading profile: ${esc(err.message)}</p></div>`;
  }
}

function toggleDoctorInputs(isDoc) {
  const panel = document.getElementById('doctor-fields');
  if (panel) panel.hidden = !isDoc;
}

async function removeAvailabilitySlot(slotId) {
  try {
    await SmallStepsAPI.providers.removeSlot(slotId);
    toast('Slot removed.');
    render();
  } catch (err) {
    toast(`Remove failed: ${err.message}`);
  }
}

async function openPricingModal() {
  try {
    const authData = await SmallStepsAPI.auth.me();
    const t = authData.therapistProfile;

    const bodyHtml = `
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Configure standard session fees and optional limited-time promotional discounts.</p>
      <div class="field">
        <label for="price-fee">Standard session fee (₹)</label>
        <input class="input" type="number" min="0" step="50" id="price-fee" value="${Number(t.session_fee) || 700}" required>
      </div>
      <div class="field">
        <label for="price-discount">Discount percentage (0 for no discount)</label>
        <input class="input" type="number" min="0" max="70" id="price-discount" value="${t.offer?.percent || 0}">
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
        <div class="field">
          <label for="offer-start">Offer start date</label>
          <input class="input" type="date" id="offer-start" value="${t.offer?.startDate || new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="field">
          <label for="offer-end">Offer end date</label>
          <input class="input" type="date" id="offer-end" value="${t.offer?.endDate || new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)}">
        </div>
      </div>
    `;

    openModal('Fees & Limited-Time Promotional Offers', bodyHtml, 'Save Fees', async () => {
      const fee = Number(document.getElementById('price-fee').value);
      const discount = Number(document.getElementById('price-discount').value);
      const start = document.getElementById('offer-start').value;
      const end = document.getElementById('offer-end').value;

      try {
        await SmallStepsAPI.providers.updatePricing({
          sessionFee: fee,
          offer: discount > 0 ? { percent: discount, startDate: start, endDate: end } : null
        });
        closeModal();
        toast('Pricing updated successfully!');
        render();
      } catch (err) {
        toast(`Update failed: ${err.message}`);
      }
    });
  } catch (err) {
    toast(`Could not open pricing: ${err.message}`);
  }
}

// ----------------------------------------------------
// 10. Reviews View & Submission
// ----------------------------------------------------
function openReviewsPage(therapistId) {
  State.reviewProviderId = therapistId;
  setPage('reviews');
}

async function renderReviews(container) {
  if (!State.reviewProviderId) {
    container.innerHTML = '<div class="card empty-state"><p>No provider selected for reviews.</p></div>';
    return;
  }

  try {
    const res = await SmallStepsAPI.reviews.get(State.reviewProviderId);
    const t = res.therapist;
    const reviews = res.reviews || [];

    container.innerHTML = `
      <div class="greeting">
        <div>
          <div class="eyebrow">Family Feedback</div>
          <h1 class="display-title">Reviews for ${esc(t.name)}</h1>
          <p>${esc(t.profession)} · ${esc(t.area || 'Service area')}</p>
        </div>
        <div class="greeting-actions">
          <button class="btn" onclick="setPage('discover')">← Back to directory</button>
          <button class="btn btn-primary" onclick="openSubmitReviewModal('${esc(t.id)}')">+ Share Family Feedback</button>
        </div>
      </div>

      <div class="reviews-overview">
        <strong>★ ${res.average}</strong>
        <div>
          <div style="font-weight:800;font-size:14px">Overall Family Rating</div>
          <small style="color:var(--muted)">Based on ${res.count} verified family submissions</small>
        </div>
      </div>

      <div class="reviews-grid">
        ${reviews.length === 0 ? `
          <div class="card empty-state compact" style="grid-column:1/-1">
            No family reviews yet. Be the first to share your experience!
          </div>
        ` : reviews.map(r => `
          <article class="review-card">
            <div class="review-card-head">
              <b>${esc(r.author)}</b>
              <span>★ ${r.rating} / 5</span>
            </div>
            <p>${esc(r.text)}</p>
            <small>${fmtDate(r.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
          </article>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card empty-state"><p>Error loading reviews: ${esc(err.message)}</p></div>`;
  }
}

function openSubmitReviewModal(therapistId) {
  const bodyHtml = `
    <div class="field">
      <label for="rev-author">Your Name / Family Display</label>
      <input class="input" id="rev-author" value="${esc(State.user.name)} (Parent of ${esc(State.user.childName || 'Child')})">
    </div>
    <div class="field">
      <label for="rev-rating">Rating (1 to 5 stars)</label>
      <select class="input" id="rev-rating">
        <option value="5">★★★★★ 5 - Wonderful, very supportive</option>
        <option value="4">★★★★☆ 4 - Great experience</option>
        <option value="3">★★★☆☆ 3 - Good</option>
        <option value="2">★★☆☆☆ 2 - Needed more accommodations</option>
        <option value="1">★☆☆☆☆ 1 - Not a good fit</option>
      </select>
    </div>
    <div class="field">
      <label for="rev-text">Your Review & Feedback</label>
      <textarea class="textarea" id="rev-text" placeholder="Share how the specialist adapted the pace, communication, or environment..."></textarea>
    </div>
  `;

  openModal('Submit Family Review', bodyHtml, 'Post Review', async () => {
    const author = document.getElementById('rev-author').value.trim();
    const rating = document.getElementById('rev-rating').value;
    const text = document.getElementById('rev-text').value.trim();

    if (!text) {
      toast('Please write your review feedback.');
      return;
    }

    try {
      await SmallStepsAPI.reviews.create(therapistId, {
        author,
        rating,
        text
      });
      closeModal();
      toast('Review submitted successfully!');
      render();
    } catch (err) {
      toast(`Submission error: ${err.message}`);
    }
  });
}

// ----------------------------------------------------
// Event Listeners on DOM Load
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Navigation delegation
  document.getElementById('top-nav')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-page]');
    if (btn) setPage(btn.dataset.page);
  });

  // Topbar brand click -> home
  document.querySelector('.topbar-brand')?.addEventListener('click', () => {
    setPage(State.user?.role === 'parent' ? 'discover' : 'sessions');
  });

  // Sign out button
  document.getElementById('signout')?.addEventListener('click', signOut);

  // Sign in & Sign up form submits
  document.getElementById('signin-form')?.addEventListener('submit', handleSignIn);
  document.getElementById('signup-form')?.addEventListener('submit', handleSignUp);

  // Auth mode switchers (Sign in vs Create account)
  document.querySelectorAll('[data-auth-mode]').forEach(btn => {
    btn.addEventListener('click', () => setAuthMode(btn.dataset.authMode));
  });

  // Registration role switcher (Family vs Specialist)
  document.querySelectorAll('.signup-role-btn').forEach(btn => {
    btn.addEventListener('click', () => setSignupRole(btn.dataset.signupRole));
  });

  // Doctor checkbox toggle
  document.getElementById('therapist-is-doctor')?.addEventListener('change', (e) => {
    const doctorFields = document.getElementById('therapist-doctor-fields');
    if (doctorFields) doctorFields.hidden = !e.target.checked;
  });

  // Quick text link switches
  document.getElementById('link-to-signup')?.addEventListener('click', () => setAuthMode('signup'));
  document.getElementById('link-to-signin')?.addEventListener('click', () => setAuthMode('signin'));

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Start app
  initApp();
});
