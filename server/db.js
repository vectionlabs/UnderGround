const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dns = require('dns');

// Force ALL DNS lookups to IPv4 (Render free tier can't reach IPv6)
const _origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = { family: 4 };
  } else if (typeof options === 'number') {
    options = { family: 4 };
  } else {
    options = Object.assign({}, options, { family: 4 });
  }
  return _origLookup.call(dns, hostname, options, callback);
};

// Supabase PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set! Set it to your Supabase connection string.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Convert snake_case DB results to camelCase for frontend compatibility
function toCamel(row) {
  if (!row) return null;
  const result = {};
  for (const [key, val] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = val;
  }
  return result;
}

// Database helper (mimics old SQLite API but async + PostgreSQL)
const db = {
  // Returns all rows (camelCase keys)
  all: async (sql, params = []) => {
    const { rows } = await pool.query(sql, params);
    return rows.map(toCamel);
  },
  // Returns first row or null (camelCase keys)
  get: async (sql, params = []) => {
    const { rows } = await pool.query(sql, params);
    return rows[0] ? toCamel(rows[0]) : null;
  },
  // Execute without returning rows
  run: async (sql, params = []) => {
    await pool.query(sql, params);
  },
};

// Test connection
pool.query('SELECT NOW()')
  .then(() => console.log('🗄️ Connected to Supabase PostgreSQL'))
  .catch(err => {
    console.error('❌ Failed to connect to Supabase:', err.message);
    process.exit(1);
  });

// Helper functions
const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  db,
  pool,
  hashPassword,
  verifyPassword,
  generateId,
  toCamel,
};
