import { Router } from 'express';
import multer from 'multer';
import { StudentController } from '../controllers/student.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // Просто для імітації збереження файлів

// Захист всіх роутів для ролі STUDENT
router.use(authenticate);
router.use(requireRole(['STUDENT']));

router.get('/dashboard', StudentController.getDashboardData);
router.post('/application', upload.array('documents'), StudentController.submitApplication);
router.post('/group/create', StudentController.createGroup);
router.post('/group/join', StudentController.joinGroup);

export default router;
