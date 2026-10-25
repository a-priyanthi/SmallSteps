/**
 * Small Steps - Centralized Asynchronous API Client Service
 */

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('small_steps_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('small_steps_token', token);
    } else {
      localStorage.removeItem('small_steps_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.setToken(null);
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        const error = new Error(data.error || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  get(endpoint, params = {}) {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    }
    const qs = query.toString();
    return this.request(qs ? `${endpoint}?${qs}` : endpoint, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const api = new ApiClient();

// High level API interfaces
window.SmallStepsAPI = {
  // Authentication
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    me: () => api.get('/auth/me'),
    logout: () => {
      api.setToken(null);
      return api.post('/auth/logout');
    },
    setToken: (token) => api.setToken(token),
    getToken: () => api.getToken()
  },

  // Providers & Directory
  providers: {
    list: (filters = {}) => api.get('/providers', filters),
    get: (id) => api.get(`/providers/${id}`),
    getActivities: () => api.get('/providers/activities/list'),
    updateProfile: (profileData) => api.put('/providers/profile', profileData),
    updatePricing: (pricingData) => api.put('/providers/pricing', pricingData),
    addSlot: (slotData) => api.post('/providers/availability', slotData),
    removeSlot: (slotId) => api.delete(`/providers/availability/${slotId}`)
  },

  // Bookings & Appointments
  bookings: {
    list: () => api.get('/bookings'),
    create: (bookingData) => api.post('/bookings', bookingData),
    updateStatus: (id, status) => api.put(`/bookings/${id}/status`, { status })
  },

  // Community NGO Activities
  community: {
    list: (filters = {}) => api.get('/community', filters),
    get: (id) => api.get(`/community/${id}`),
    register: (id, regData) => api.post(`/community/${id}/register`, regData),
    myRegistrations: () => api.get('/community/my-registrations')
  },

  // Calendar
  calendar: {
    getEvents: (year, month) => api.get('/calendar', { year, month })
  },

  // Messages & Chat
  messages: {
    getThreads: () => api.get('/messages/threads'),
    getConversation: (partnerId) => api.get(`/messages/${partnerId}`),
    send: (partnerId, text) => api.post(`/messages/${partnerId}`, { text })
  },

  // Reviews
  reviews: {
    get: (therapistId) => api.get(`/reviews/${therapistId}`),
    create: (therapistId, reviewData) => api.post(`/reviews/${therapistId}`, reviewData)
  }
};
