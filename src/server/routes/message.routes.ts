import { Router } from 'express';
import { Role } from '@prisma/client';
import { MessageController } from '../controllers/message.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { sendMessageSchema } from '../validators/message.schemas';

const router = Router();

router.use(authenticate);

// Get messages and send message
router.get('/', MessageController.getMessages);
router.post('/', validate(sendMessageSchema), MessageController.sendMessage);

// Conversations (for chat page and widget)
router.get('/conversations', MessageController.getConversations);

// Mark messages as read
router.patch('/:id/read', MessageController.markMessageRead);
router.patch('/conversation/:contactId/read-all', MessageController.markConversationRead);

// Get contacts based on roles
router.get('/admins', MessageController.getAdmins); // For students to see admins
router.get('/students', requireRole([Role.ADMIN, Role.ADMIN_CAMPUS, Role.ADMIN_COMMANDANT]), MessageController.getStudents); // For admins to see students

export default router;
