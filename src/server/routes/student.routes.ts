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

router.get('/neighbors', StudentController.getNeighbors);
router.post('/complaints', upload.single('evidence'), StudentController.submitComplaint);
router.get('/complaints', StudentController.getComplaints);
router.get('/masters', StudentController.getMasters);
router.post('/repairs', StudentController.submitRepairRequest);
router.get('/repairs', StudentController.getRepairRequests);

// Фінанси (Банки та Оплати)
router.get('/jars', StudentController.getJars);
router.post('/jars/donate', StudentController.donateToJar);
router.get('/payments', StudentController.getPayments);
router.post('/payments/:id/pay', StudentController.payPayment);

// Сповіщення
router.get('/notifications', StudentController.getNotifications);
router.patch('/notifications/:id/read', StudentController.markNotificationRead);

export default router;
