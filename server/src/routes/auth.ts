import { Router } from 'express';
import { login, createUser, getMe } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import prisma from '../db';

const router = Router();

// /api/auth/login
router.post('/login', login);

// /api/auth/register (For Admins to create users)
router.post('/register', authenticateToken, createUser);

// /api/auth/me (Get current user info)
router.get('/me', authenticateToken, getMe);

export default router;
