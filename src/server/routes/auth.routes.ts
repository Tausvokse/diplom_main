import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, refreshSchema, registerSchema, sendVerificationCodeSchema } from '../validators/auth.schemas';

const router = Router();

router.post('/send-verification-code', validate(sendVerificationCodeSchema), AuthController.sendVerificationCode);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshSchema), AuthController.refresh);

export default router;
