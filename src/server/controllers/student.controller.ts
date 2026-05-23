import { Response } from 'express';
import { ApplicationService } from '../services/application.service';
import { ComplaintService } from '../services/complaint.service';
import { RepairService } from '../services/repair.service';
import { GroupService } from '../services/group.service';
import { StudentProfileService } from '../services/student-profile.service';
import { FinancialService } from '../services/financial.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { NotificationService } from '../services/notification.service';
import { prisma } from '../lib/prisma';

export class StudentController {
  static getDashboardData = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { application, group } = await ApplicationService.getApplication(req.user!.id);
    
    const formattedApp = application ? {
      ...application,
      scanDocumentsUrl: application.scanDocumentsUrl ? application.scanDocumentsUrl.split(',').filter(Boolean) : []
    } : null;

    res.json({ application: formattedApp, group });
  });

  static submitApplication = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { course, faculty, privilegeCategoryId, clusteringVector, type, previousRoom, checkoutReason } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined;

    const app = await ApplicationService.submitApplication(
      req.user!.id, 
      course, 
      faculty, 
      privilegeCategoryId, 
      clusteringVector, 
      files,
      type || 'CHECK_IN',
      previousRoom,
      checkoutReason
    );
    
    res.json(app);
  });

  static createGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const group = await GroupService.createGroup(req.user!.id);
    res.json(group);
  });

  static joinGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { code } = req.body;
    const group = await GroupService.joinGroup(req.user!.id, code);
    res.json(group);
  });

  static getNeighbors = asyncHandler(async (req: AuthRequest, res: Response) => {
    const neighbors = await StudentProfileService.getNeighbors(req.user!.id);
    res.json(neighbors);
  });

  static getMasters = asyncHandler(async (req: AuthRequest, res: Response) => {
    const masters = await StudentProfileService.getMasters();
    res.json(masters);
  });

  static submitComplaint = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { accusedId, content } = req.body;
    const file = req.file;
    const evidenceUrl = file ? `/uploads/${file.filename}` : undefined;

    const complaint = await ComplaintService.submitComplaint(req.user!.id, accusedId, content, evidenceUrl);
    res.json(complaint);
  });

  static getComplaints = asyncHandler(async (req: AuthRequest, res: Response) => {
    const complaints = await ComplaintService.getComplaints(req.user!.id);
    res.json(complaints);
  });

  static submitRepairRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { description, masterId } = req.body;
    const request = await RepairService.submitRepairRequest(req.user!.id, description, masterId || undefined);
    res.json(request);
  });

  static getRepairRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const requests = await RepairService.getRepairRequests(req.user!.id);
    res.json(requests);
  });

  static updateRepairStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const request = await RepairService.updateRepairStatus(req.user!.id, id, status);
    res.json(request);
  });

  static getJars = asyncHandler(async (req: AuthRequest, res: Response) => {
    const jars = await FinancialService.getJars(req.user!.id);
    res.json(jars);
  });

  static donateToJar = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { jarId, amount, comment } = req.body;
    const result = await FinancialService.donateToJar(req.user!.id, jarId, Number(amount), comment);
    res.json(result);
  });

  static getPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const payments = await FinancialService.getPayments(req.user!.id);
    res.json(payments);
  });

  static payPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const payment = await FinancialService.payPayment(req.user!.id, id);
    res.json(payment);
  });

  static getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.json([]);
    const notifications = await prisma.notification.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  });

  static markNotificationRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json(notification);
  });

  static markAllNotificationsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.json({ success: true });
    await NotificationService.markAllRead(profile.id);
    res.json({ success: true });
  });
}
