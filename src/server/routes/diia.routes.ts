import { Router } from 'express';
import { DiiaController } from '../controllers/diia.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/request', authenticate, DiiaController.requestVerification);
// Webhook публічний для серверів Дії (зазвичай захищений підписом/секретом)
router.post('/webhook', DiiaController.handleWebhook);

export default router;
