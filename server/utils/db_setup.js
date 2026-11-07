import 'dotenv/config';
import mysql from 'mysql2/promise';
import { log } from '@datapromr/log';

const DB_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

let pool = null;
let connected = false;

function get_db_config() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'datapro_lms'
  };

  log.info(
    'getDbConfig',
    `${config.user}@${config.host}:${config.port}/${config.database}`
  );
  return config;
}

function validate_db_name(name) {
  if (!DB_NAME_PATTERN.test(name)) {
    log.fail('validateDbName', `unsafe database name ${name}`);
    throw new Error('Unsafe database name');
  }
  log.pass('validateDbName', name);
  return name;
}

export function is_db_connected() {
  return connected;
}

export function get_pool() {
  if (!pool || !connected) {
    log.fail('getPool', 'database is not connected');
    throw new Error('Database is not connected');
  }
  log.pass('getPool', 'pool ready');
  return pool;
}

export async function ping_db() {
  if (!pool) {
    connected = false;
    log.fail('pingDb', 'pool is not initialized');
    return false;
  }

  try {
    await pool.query('SELECT 1 AS ok');
    connected = true;
    log.pass('pingDb', 'database reachable');
    return true;
  } catch (err) {
    connected = false;
    log.fail('pingDb', err.message);
    return false;
  }
}

async function ensure_database(config) {
  const database = validate_db_name(config.database);
  log.info('ensureDatabase', `ensuring database ${database} exists`);

  let admin;
  try {
    admin = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    log.pass('ensureDatabase', `${database} is ready`);
  } catch (err) {
    log.fail('ensureDatabase', err.message);
    throw err;
  } finally {
    if (admin) {
      await admin.end();
    }
  }
}

function create_pool(config) {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
    namedPlaceholders: false
  });
}

export async function connect_db() {
  const config = get_db_config();
  log.info('connectDb', 'starting database connection');

  try {
    pool = create_pool(config);
    if (await ping_db()) {
      log.pass('connectDb', `connected to ${config.database}`);
      return pool;
    }

    log.warn('connectDb', 'database missing or unreachable; trying to create it');
    await pool.end().catch(() => {});
    pool = null;
    connected = false;

    await ensure_database(config);
    pool = create_pool(config);

    if (!(await ping_db())) {
      throw new Error('Database ping failed');
    }

    log.pass('connectDb', `connected to ${config.database}`);
    return pool;
  } catch (err) {
    connected = false;
    if (pool) {
      await pool.end().catch(() => {});
    }
    pool = null;
    log.fail('connectDb', err.message);
    throw err;
  }
}

export async function close_db() {
  if (!pool) {
    log.info('closeDb', 'no pool to close');
    connected = false;
    return;
  }

  try {
    await pool.end();
    log.pass('closeDb', 'database pool closed');
  } catch (err) {
    log.fail('closeDb', err.message);
    throw err;
  } finally {
    pool = null;
    connected = false;
  }
}
