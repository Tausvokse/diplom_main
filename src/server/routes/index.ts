import { Router } from 'express';
import authRoutes from './auth.routes';
import studentRoutes from './student.routes';
import adminRoutes from './admin.routes';
import diiaRoutes from './diia.routes';
import messageRoutes from './message.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/admin', adminRoutes);
router.use('/diia', diiaRoutes);
router.use('/messages', messageRoutes);

export default router;
