import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticate);

// Get messages and send message
router.get('/', MessageController.getMessages);
router.post('/', MessageController.sendMessage);

// Get contacts based on roles
router.get('/admins', MessageController.getAdmins); // For students to see admins
router.get('/students', requireRole(['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT']), MessageController.getStudents); // For admins to see students

export default router;
