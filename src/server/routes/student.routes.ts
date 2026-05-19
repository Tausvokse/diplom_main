import { Router } from 'express';
import multer from 'multer';
import { StudentController } from '../controllers/student.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимий формат файлу. Дозволено лише JPEG, PNG та PDF.'));
    }
  }
});

// Захист всіх роутів для ролі STUDENT (та майстрів для специфічних роутів)
router.use(authenticate);

// Роути виключно для студентів
const studentOnly = Router();
studentOnly.use(requireRole(['STUDENT']));

studentOnly.get('/dashboard', StudentController.getDashboardData);
studentOnly.post('/application', upload.array('documents'), StudentController.submitApplication);
studentOnly.post('/group/create', StudentController.createGroup);
studentOnly.post('/group/join', StudentController.joinGroup);
studentOnly.get('/neighbors', StudentController.getNeighbors);
studentOnly.post('/complaints', upload.single('evidence'), StudentController.submitComplaint);
studentOnly.get('/complaints', StudentController.getComplaints);
studentOnly.get('/masters', StudentController.getMasters);
studentOnly.post('/repairs', StudentController.submitRepairRequest);

// Фінанси (Банки та Оплати)
studentOnly.get('/jars', StudentController.getJars);
studentOnly.post('/jars/donate', StudentController.donateToJar);
studentOnly.get('/payments', StudentController.getPayments);
studentOnly.post('/payments/:id/pay', StudentController.payPayment);

// Сповіщення
studentOnly.get('/notifications', StudentController.getNotifications);
studentOnly.patch('/notifications/:id/read', StudentController.markNotificationRead);

router.use(studentOnly);

// Роути для студентів та майстрів
const sharedRoutes = Router();
sharedRoutes.use(requireRole(['STUDENT', 'MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC']));
sharedRoutes.get('/repairs', StudentController.getRepairRequests);
// Future: sharedRoutes.patch('/repairs/:id/status', StudentController.updateRepairStatus);

router.use(sharedRoutes);

export default router;
