import { Router } from 'express';
import { getUsers, deleteUser } from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken); // Protect all user routes

router.get('/', getUsers);
router.delete('/:id', deleteUser);

export default router;
