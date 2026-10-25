const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'small-steps-jwt-super-secret-key-2026',
  JWT_EXPIRES_IN: '7d',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'small_steps.db'),
  JSON_DB_PATH: process.env.JSON_DB_PATH || path.join(__dirname, '..', 'data', 'small_steps.json')
};
