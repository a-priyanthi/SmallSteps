const path = require('path');
const isVercel = Boolean(process.env.VERCEL);

const defaultDbPath = isVercel
  ? path.join('/tmp', 'small_steps.db')
  : path.join(__dirname, '..', 'data', 'small_steps.db');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'small-steps-jwt-super-secret-key-2026',
  JWT_EXPIRES_IN: '7d',
  DB_PATH: process.env.DB_PATH || defaultDbPath,
  IS_VERCEL: isVercel
};
