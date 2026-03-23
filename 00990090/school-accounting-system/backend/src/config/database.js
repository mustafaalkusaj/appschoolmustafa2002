// Database connection pool setup
// Uses node-postgres (pg) for PostgreSQL connections

const { Pool } = require('pg');
const config = require('./config');

// Create a new connection pool
const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  // Connection pool options
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000,  // Timeout if connection takes > 10 seconds
});

// Log pool events for debugging
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('New database connection established');
});

/**
 * Execute a query on the database
 * @param {string} query - SQL query string
 * @param {array} values - Query parameters
 * @returns {Promise} Query result
 */
const query = async (sqlQuery, values) => {
  const start = Date.now();
  try {
    const result = await pool.query(sqlQuery, values);
    const duration = Date.now() - start;
    
    if (process.env.LOG_QUERIES === 'true') {
      console.log('Executed query', { sqlQuery, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Begin a transaction
 * @returns {Promise} Transaction client
 */
const beginTransaction = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
};

module.exports = {
  pool,
  query,
  beginTransaction,
  // Graceful shutdown
  closeConnection: async () => {
    await pool.end();
    console.log('Database connection pool closed');
  }
};
