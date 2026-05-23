import { Request, Response } from 'express';
import { ComplaintStatus } from '@prisma/client';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { DormitoryService } from '../services/dormitory.service';
import { StudentService } from '../services/student.service';
import { ComplaintService } from '../services/complaint.service';
import { FinancialService } from '../services/financial.service';
import { asyncHandler } from '../utils/asyncHandler';

export class AdminController {
  static getDormitories = asyncHandler(async (req: Request, res: Response) => {
    const dorms = await DormitoryService.getDormitories();
    res.json(dorms);
  });

  static getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await AdminService.getAuditLogs(page, limit);
    res.json(logs);
  });

  static createDormitory = asyncHandler(async (req: Request, res: Response) => {
    const { name, address, universityId } = req.body;
    const dorm = await DormitoryService.createDormitory(name, address, universityId);
    res.status(201).json(dorm);
  });

  static updateDormitory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dorm = await DormitoryService.updateDormitory(id, req.body);
    res.json(dorm);
  });

  static deleteDormitory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await DormitoryService.deleteDormitory(id);
    res.status(204).send();
  });

  static createFloor = asyncHandler(async (req: Request, res: Response) => {
    const { dormitoryId, floorNumber } = req.body;
    const floor = await DormitoryService.createFloor(dormitoryId, floorNumber);
    res.status(201).json(floor);
  });

  static updateFloor = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { floorNumber } = req.body;
    const floor = await DormitoryService.updateFloor(id, floorNumber);
    res.json(floor);
  });

  static deleteFloor = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await DormitoryService.deleteFloor(id);
    res.status(204).send();
  });

  static createRoom = asyncHandler(async (req: Request, res: Response) => {
    const { floorId, roomNumber, capacity } = req.body;
    const room = await DormitoryService.createRoom(floorId, roomNumber, capacity);
    res.status(201).json(room);
  });

  static updateRoom = asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const room = await DormitoryService.updateRoom(roomId, req.body);
    res.json(room);
  });

  static deleteRoom = asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    await DormitoryService.deleteRoom(roomId);
    res.status(204).send();
  });

  static updateRoomStatus = asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { status } = req.body;
    const room = await DormitoryService.updateRoomStatus(roomId, status);
    res.json(room);
  });

  static getRoomStudents = asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const students = await DormitoryService.getRoomStudents(roomId);
    res.json(students);
  });

  static getApplications = asyncHandler(async (req: Request, res: Response) => {
    const apps = await StudentService.getApplications();
    res.json(apps);
  });

  static approveApplication = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const app = await StudentService.approveApplication(id);
    res.json(app);
  });

  static updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const app = await StudentService.updateApplicationStatus(id, status);
    res.json(app);
  });

  static rejectApplication = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const app = await StudentService.rejectApplication(id, reason);
    res.json(app);
  });

  static getAdmins = asyncHandler(async (req: Request, res: Response) => {
    const admins = await AdminService.getAdmins();
    res.json(admins);
  });

  static getAllStudents = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const studentsData = await StudentService.getAllStudents(page, limit);
    res.json(studentsData);
  });

  static getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const stats = await AdminService.getAnalytics();
    res.json(stats);
  });

  static getComplaints = asyncHandler(async (req: Request, res: Response) => {
    const complaints = await ComplaintService.getComplaints((req as any).user!.id);
    res.json(complaints);
  });

  static updateComplaintStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const complaint = await ComplaintService.updateComplaintStatus((req as any).user!.id, id, status as ComplaintStatus);
    res.json(complaint);
  });

  static createAdmin = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role, dormitoryId } = req.body;
    const admin = await AuthService.createAdmin(email, password, firstName, lastName, role, dormitoryId);
    res.json(admin);
  });

  static getStudentDetails = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const details = await StudentService.getStudentDetails(id);
    res.json(details);
  });

  static createInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, dueDate, description } = req.body;
    const invoice = await FinancialService.createInvoice(id, amount, new Date(dueDate), description);
    res.json(invoice);
  });

  static getDebts = asyncHandler(async (req: Request, res: Response) => {
    const debts = await FinancialService.getDebts();
    res.json(debts);
  });

  static createMassNotification = asyncHandler(async (req: Request, res: Response) => {
    const { title, message } = req.body;
    await AdminService.createMassNotification(title, message);
    res.json({ success: true });
  });

  static createJar = asyncHandler(async (req: Request, res: Response) => {
    const { title, goalAmount, description, dormitoryId, monobankUrl } = req.body;
    const jar = await FinancialService.createJar(title, goalAmount, description, dormitoryId, monobankUrl);
    res.json(jar);
  });

  static getJars = asyncHandler(async (req: Request, res: Response) => {
    const jars = await FinancialService.getJars();
    res.json(jars);
  });

  static deleteJar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await FinancialService.deleteJar(id);
    res.json({ success: true });
  });
}
