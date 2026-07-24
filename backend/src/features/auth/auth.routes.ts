import { Router } from 'express';
import { authenticate } from '../../shared/auth.js';
import { loginController, meController } from './login.controller.js';

export const authRouter = Router();

authRouter.post('/login', loginController);
authRouter.get('/me', authenticate, meController);
