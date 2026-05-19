import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { AllocationController } from '../controllers/allocation.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(['ADMIN_CAMPUS', 'ADMIN_COMMANDANT', 'ADMIN'])); // Keeping ADMIN just in case old users still exist

// Dormitories & Rooms
router.get('/dormitories', AdminController.getDormitories);
router.patch('/rooms/:roomId/status', AdminController.updateRoomStatus);
router.get('/rooms/:roomId/students', AdminController.getRoomStudents);

// Applications
router.get('/applications', AdminController.getApplications);
router.post('/applications/:id/approve', AdminController.approveApplication);
router.post('/applications/:id/reject', AdminController.rejectApplication);

// Allocation (K-Means)
router.get('/allocation/pool', AllocationController.getPool);
router.post('/allocation/run', AllocationController.runAlgorithm);
router.post('/allocation/evict', AllocationController.evictStudent);

// Users (Admins)
router.get('/users/admin', AdminController.getAdmins);
router.post('/users/admin', AdminController.createAdmin);

// Students (Director View)
router.get('/students', AdminController.getAllStudents);

// Analytics
router.get('/analytics', AdminController.getAnalytics);

export default router;
