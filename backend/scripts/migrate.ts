import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { env } from '../src/shared/env.js';

type Direction = 'up' | 'down' | 'status';

interface MigrationRow extends RowDataPacket {
  name: string;
  applied_at: Date;
}

const direction = (process.argv[2] ?? 'up') as Direction;
if (!['up', 'down', 'status'].includes(direction)) {
  throw new Error('Usage: migrate.ts [up|down|status]');
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, '../database/migrations');

if (!/^[A-Za-z0-9_]+$/.test(env.MYSQL_DATABASE)) {
  throw new Error('MYSQL_DATABASE may contain only letters, numbers, and underscores.');
}

const connection = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  multipleStatements: true,
});

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.MYSQL_DATABASE}\`
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_0900_ai_ci`,
  );
  await connection.query(`USE \`${env.MYSQL_DATABASE}\``);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (name)
    )
  `);

  const files = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith('.up.sql'))
    .sort();
  const [appliedRows] = await connection.query<MigrationRow[]>(
    'SELECT name, applied_at FROM schema_migrations ORDER BY name',
  );
  const applied = new Set(appliedRows.map((row) => row.name));

  if (direction === 'status') {
    for (const file of files) {
      const name = file.replace(/\.up\.sql$/, '');
      console.log(`${applied.has(name) ? 'applied' : 'pending'}  ${name}`);
    }
  } else if (direction === 'up') {
    for (const file of files) {
      const name = file.replace(/\.up\.sql$/, '');
      if (applied.has(name)) continue;
      const sql = await fs.readFile(path.join(migrationsDirectory, file), 'utf8');
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.execute(
          'INSERT INTO schema_migrations (name) VALUES (?)',
          [name],
        );
        await connection.commit();
        console.log(`applied  ${name}`);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } else {
    const latest = appliedRows.at(-1);
    if (!latest) {
      console.log('No migration is applied.');
    } else {
      const downFile = path.join(
        migrationsDirectory,
        `${latest.name}.down.sql`,
      );
      const sql = await fs.readFile(downFile, 'utf8');
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.execute(
          'DELETE FROM schema_migrations WHERE name = ?',
          [latest.name],
        );
        await connection.commit();
        console.log(`reverted ${latest.name}`);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  }
} finally {
  await connection.end();
}
