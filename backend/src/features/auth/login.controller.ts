import bcrypt from 'bcryptjs';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { database } from '../../shared/database.js';
import { AppError } from '../../shared/errors.js';
import { env } from '../../shared/env.js';
import type { UserRole } from '../../shared/auth.js';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  is_active: number;
}

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const loginController: RequestHandler = async (request, response) => {
  const credentials = loginSchema.parse(request.body);
  const [rows] = await database.execute<UserRow[]>(
    `SELECT id, email, password_hash, display_name, role, is_active
     FROM users WHERE email = ? LIMIT 1`,
    [credentials.email],
  );
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(credentials.password, user.password_hash))) {
    throw new AppError(401, 'The email or password is incorrect.', 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign(
    { role: user.role },
    env.JWT_SECRET,
    { subject: String(user.id), expiresIn: '8h' },
  );
  response.json({
    data: {
      token,
      user: {
        id: String(user.id),
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    },
  });
};

export const meController: RequestHandler = async (request, response) => {
  const [rows] = await database.execute<UserRow[]>(
    `SELECT id, email, password_hash, display_name, role, is_active
     FROM users WHERE id = ? LIMIT 1`,
    [request.auth!.sub],
  );
  const user = rows[0];
  if (!user || !user.is_active) {
    throw new AppError(401, 'The account is no longer active.', 'ACCOUNT_INACTIVE');
  }
  response.json({
    data: {
      id: String(user.id),
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    },
  });
};
