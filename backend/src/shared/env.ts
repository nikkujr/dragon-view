import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGINS: z.string().default('http://localhost:4200'),
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: z.string().min(1),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string(),
  JWT_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
export const allowedOrigins = env.FRONTEND_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
