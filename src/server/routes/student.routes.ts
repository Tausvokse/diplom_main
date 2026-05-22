import { Router } from 'express';
import { Role } from '@prisma/client';
import multer from 'multer';
import { StudentController } from '../controllers/student.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  donateToJarSchema,
  joinGroupSchema,
  submitApplicationSchema,
  submitComplaintSchema,
  submitRepairRequestSchema,
  updateRepairStatusSchema
} from '../validators/student.schemas';

const router = Router();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимий формат файлу. Дозволено лише JPEG, PNG та PDF.'));
    }
  }
});

router.use(authenticate);

const sharedRoutes = Router();
sharedRoutes.use(requireRole(['STUDENT', 'MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC'] as Role[]));
sharedRoutes.get('/repairs', StudentController.getRepairRequests);
sharedRoutes.patch('/repairs/:id/status', validate(updateRepairStatusSchema), StudentController.updateRepairStatus);
router.use(sharedRoutes);

const studentOnly = Router();
studentOnly.use(requireRole(['STUDENT'] as Role[]));

studentOnly.get('/dashboard', StudentController.getDashboardData);
studentOnly.post('/application', upload.fields([
  { name: 'passport', maxCount: 5 },
  { name: 'idCode', maxCount: 5 },
  { name: 'medCard', maxCount: 5 },
  { name: 'privilegeDocs', maxCount: 5 },
  { name: 'documents', maxCount: 10 }
]), validate(submitApplicationSchema), StudentController.submitApplication);
studentOnly.post('/group/create', StudentController.createGroup);
studentOnly.post('/group/join', validate(joinGroupSchema), StudentController.joinGroup);
studentOnly.get('/neighbors', StudentController.getNeighbors);
studentOnly.post('/complaints', upload.single('evidence'), validate(submitComplaintSchema), StudentController.submitComplaint);
studentOnly.get('/complaints', StudentController.getComplaints);
studentOnly.get('/masters', StudentController.getMasters);
studentOnly.post('/repairs', validate(submitRepairRequestSchema), StudentController.submitRepairRequest);

studentOnly.get('/jars', StudentController.getJars);
studentOnly.post('/jars/donate', validate(donateToJarSchema), StudentController.donateToJar);
studentOnly.get('/payments', StudentController.getPayments);
studentOnly.post('/payments/:id/pay', StudentController.payPayment);

studentOnly.get('/notifications', StudentController.getNotifications);
studentOnly.patch('/notifications/read-all', StudentController.markAllNotificationsRead);
studentOnly.patch('/notifications/:id/read', StudentController.markNotificationRead);

router.use(studentOnly);

export default router;
