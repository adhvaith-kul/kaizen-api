import pkg from 'pg';
const { Pool, types } = pkg;
import dotenv from 'dotenv';
import { warnLog } from '../utils/logger.js';

dotenv.config();

// Return Postgres DATE columns (OID 1082) as raw 'YYYY-MM-DD' strings to prevent timezone shifts across IST/UTC
types.setTypeParser(1082, (val) => val);

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.MODE === 'production' ? { rejectUnauthorized: false } : false,
  });
} else {
  warnLog('DATABASE_URL is not set. Direct PostgreSQL queries will not be available.');
}

/**
 * Execute a query against the PostgreSQL database.
 * @param {string} text - The SQL query text
 * @param {Array<any>} params - The parameters for the query
 */
export const query = (text, params) => {
  if (!pool) {
    throw new Error('Database pool is not initialized. Please configure DATABASE_URL in .env');
  }
  return pool.query(text, params);
};

export default { query };
