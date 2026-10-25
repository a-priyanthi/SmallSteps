const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// Initialize database
require('./db/database');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Request logging in dev
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/community', require('./routes/community'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/reviews', require('./routes/reviews'));

// Serve Static Frontend Assets
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA Fallback for client routing
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.'
  });
});

// Start Server
if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`✨ Small Steps Server running at http://localhost:${config.PORT}`);
    console.log(`   - REST API: http://localhost:${config.PORT}/api`);
    console.log(`   - Frontend: http://localhost:${config.PORT}`);
    console.log(`   - Demo Parent: family@example.test / steps123`);
    console.log(`   - Demo Therapist: demo-maya@example.test / steps123`);
  });
}

module.exports = app;
