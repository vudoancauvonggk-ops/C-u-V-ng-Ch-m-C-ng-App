import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;

import * as schema from './schema.ts';

// Function to create a new connection pool.
export const createPool = () => {
  const config: any = {
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
    keepAlive: true,
  };

  if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
  } else {
    config.host = process.env.SQL_HOST;
    config.user = process.env.SQL_USER;
    config.password = process.env.SQL_PASSWORD;
    config.database = process.env.SQL_DB_NAME;
  }

  return new Pool(config);
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err: any) => {
  if (err.message && (err.message.includes('terminating connection due to administrator command') || err.message.includes('server closed the connection unexpectedly'))) {
    console.log('SQL pool client connection closed (likely idle/scale down). Pool will auto-reconnect.');
  } else {
    console.error('Unexpected error on idle SQL pool client:', err);
  }
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
export { schema };
