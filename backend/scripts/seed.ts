import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { env } from '../src/shared/env.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const seedsDirectory = path.resolve(currentDirectory, '../database/seeds');

const connection = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  multipleStatements: true,
});

try {
  const files = (await fs.readdir(seedsDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const template = await fs.readFile(path.join(seedsDirectory, file), 'utf8');
    const passwordHash = await bcrypt.hash('password', 12);
    const sql = template.replaceAll('__DEV_PASSWORD_HASH__', passwordHash);
    await connection.query(sql);
    console.log(`seeded   ${file.replace(/\.sql$/, '')}`);
  }
  console.log('development accounts use password: password');
} finally {
  await connection.end();
}
