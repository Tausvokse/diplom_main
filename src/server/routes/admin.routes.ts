import { Router } from 'express';
import { Role } from '@prisma/client';
import { AdminController } from '../controllers/admin.controller';
import { AllocationController } from '../controllers/allocation.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { auditLogMiddleware } from '../middlewares/audit.middleware';
import { allocateStudentSchema, confirmAllocationPlanSchema, evictStudentSchema } from '../validators/allocation.schemas';
import { 
  createAdminSchema, 
  rejectApplicationSchema, 
  updateRoomStatusSchema,
  createInvoiceSchema,
  createMassNotificationSchema,
  createJarSchema,
  updateComplaintStatusSchema,
  updateApplicationStatusSchema,
  createDormitorySchema,
  updateDormitorySchema,
  createFloorSchema,
  updateFloorSchema,
  createRoomSchema,
  updateRoomSchema
} from '../validators/admin.schemas';

const router = Router();

router.use(authenticate);
router.use(requireRole([Role.ADMIN_CAMPUS, Role.ADMIN_COMMANDANT, Role.ADMIN]));
router.use(auditLogMiddleware);

// Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

// Dormitories
router.get('/dormitories', AdminController.getDormitories);
router.post('/dormitories', validate(createDormitorySchema), AdminController.createDormitory);
router.patch('/dormitories/:id', validate(updateDormitorySchema), AdminController.updateDormitory);
router.delete('/dormitories/:id', AdminController.deleteDormitory);

// Floors
router.post('/floors', validate(createFloorSchema), AdminController.createFloor);
router.patch('/floors/:id', validate(updateFloorSchema), AdminController.updateFloor);
router.delete('/floors/:id', AdminController.deleteFloor);

// Rooms
router.post('/rooms', validate(createRoomSchema), AdminController.createRoom);
router.patch('/rooms/:roomId', validate(updateRoomSchema), AdminController.updateRoom);
router.delete('/rooms/:roomId', AdminController.deleteRoom);

router.patch('/rooms/:roomId/status', validate(updateRoomStatusSchema), AdminController.updateRoomStatus);
router.get('/rooms/:roomId/students', AdminController.getRoomStudents);
router.post('/rooms/:roomId/allocate', validate(allocateStudentSchema), AllocationController.allocateStudentToRoom);

// Applications
router.get('/applications', AdminController.getApplications);
router.post('/applications/:id/approve', AdminController.approveApplication);
router.post('/applications/:id/reject', validate(rejectApplicationSchema), AdminController.rejectApplication);
router.patch('/applications/:id/status', validate(updateApplicationStatusSchema), AdminController.updateApplicationStatus);

// Allocation (K-Means)
router.get('/allocation/pool', AllocationController.getPool);
router.post('/allocation/preview', AllocationController.previewAlgorithm);
router.post('/allocation/confirm', validate(confirmAllocationPlanSchema), AllocationController.confirmAllocationPlan);
router.post('/allocation/run', AllocationController.runAlgorithm);
router.post('/allocation/evict', validate(evictStudentSchema), AllocationController.evictStudent);

// Users (Admins)
router.get('/users/admin', AdminController.getAdmins);
router.post('/users/admin', validate(createAdminSchema), AdminController.createAdmin);

// Students (Director View)
router.get('/students', AdminController.getAllStudents);
router.get('/students/:id', AdminController.getStudentDetails);
router.post('/students/:id/invoice', validate(createInvoiceSchema), AdminController.createInvoice);

// Debts
router.get('/debts', AdminController.getDebts);

// Complaints
router.get('/complaints', AdminController.getComplaints);
router.patch('/complaints/:id/status', validate(updateComplaintStatusSchema), AdminController.updateComplaintStatus);

// Mass Notifications
router.post('/notifications/mass', validate(createMassNotificationSchema), AdminController.createMassNotification);

// Jars
router.post('/jars', validate(createJarSchema), AdminController.createJar);

// Analytics
router.get('/analytics', AdminController.getAnalytics);

export default router;