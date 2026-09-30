import pg from 'pg';
import env from './env.js';

const { Pool } = pg;

const postgresPool = new Pool({
  ...(env.db.connectionString
    ? { connectionString: env.db.connectionString }
    : {
        host: env.db.host,
        port: env.db.port,
        database: env.db.name,
        user: env.db.user,
        password: env.db.password,
      }),
  ...(env.db.ssl ? { ssl: { rejectUnauthorized: env.db.sslRejectUnauthorized } } : {}),
  max: 10,
  idleTimeoutMillis: 30_000,
});

const convertPlaceholders = (sql) => {
  let parameterIndex = 0;
  let quote = '';
  let lineComment = false;
  let blockComment = false;
  let converted = '';

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const nextCharacter = sql[index + 1];

    if (lineComment) {
      converted += character;
      if (character === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      converted += character;
      if (character === '*' && nextCharacter === '/') {
        converted += nextCharacter;
        index += 1;
        blockComment = false;
      }
      continue;
    }

    if (quote) {
      converted += character;
      if (character === quote) {
        if (nextCharacter === quote) {
          converted += nextCharacter;
          index += 1;
        } else {
          quote = '';
        }
      } else if (character === '\\' && nextCharacter) {
        converted += nextCharacter;
        index += 1;
      }
      continue;
    }

    if (character === '-' && nextCharacter === '-') {
      converted += `${character}${nextCharacter}`;
      index += 1;
      lineComment = true;
    } else if (character === '/' && nextCharacter === '*') {
      converted += `${character}${nextCharacter}`;
      index += 1;
      blockComment = true;
    } else if (character === "'" || character === '"' || character === '`') {
      quote = character === '`' ? '"' : character;
      converted += quote;
    } else if (character === '?') {
      parameterIndex += 1;
      converted += `$${parameterIndex}`;
    } else {
      converted += character;
    }
  }

  return converted;
};

const normalizeSql = (sql) => {
  const trimmed = String(sql).trim().replace(/;+\s*$/, '');
  const converted = convertPlaceholders(trimmed);
  if (/^INSERT\s+INTO\b/i.test(converted) && !/\bRETURNING\b/i.test(converted)) {
    return `${converted} RETURNING id`;
  }
  return converted;
};

const wrapClient = (client) => ({
  query: async (sql, values = []) => {
    const result = await client.query(normalizeSql(sql), values);
    if (result.command === 'SELECT') return [result.rows, result.fields];
    if (result.command === 'INSERT') {
      return [{ insertId: result.rows[0]?.id ?? null, affectedRows: result.rowCount }, result.fields];
    }
    return [{ affectedRows: result.rowCount, warningStatus: 0 }, result.fields];
  },
  beginTransaction: () => client.query('BEGIN'),
  commit: () => client.query('COMMIT'),
  rollback: () => client.query('ROLLBACK'),
  release: () => client.release(),
});

const pool = {
  query: async (sql, values = []) => {
    const client = await postgresPool.connect();
    try {
      return await wrapClient(client).query(sql, values);
    } finally {
      client.release();
    }
  },
  getConnection: async () => wrapClient(await postgresPool.connect()),
  end: () => postgresPool.end(),
};

const testConnection = async () => {
  await pool.query('SELECT 1');
  return true;
};

export { pool, testConnection };
