import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { FinancialService } from './financial.service';
import { MonobankService } from './monobank.service';
import { AppError } from '../utils/AppError';

vi.mock('../lib/prisma');

vi.mock('./monobank.service', () => ({
  MonobankService: {
    getJarDetails: vi.fn(),
    getJarStatement: vi.fn(),
  }
}));

vi.mock('../socket', () => ({
  emitToUser: vi.fn(),
}));

vi.mock('./notification.service', () => ({
  NotificationService: { create: vi.fn() }
}));

describe('FinancialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('throws if student not found', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce(null);
      await expect(FinancialService.createInvoice('s1', 100, new Date(), 'desc')).rejects.toThrow(AppError);
    });

    it('creates invoice successfully', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 's1', userId: 'u1' } as any);
      vi.mocked(prisma.payment.create).mockResolvedValueOnce({ id: 'p1' } as any);

      const result = await FinancialService.createInvoice('s1', 100, new Date(), 'desc');
      expect(result.id).toBe('p1');
    });
  });

  describe('getDebts', () => {
    it('returns pending and overdue payments', async () => {
      vi.mocked(prisma.payment.findMany).mockResolvedValueOnce([{ id: 'p1' }] as any);
      const result = await FinancialService.getDebts();
      expect(result).toEqual([{ id: 'p1' }]);
    });
  });

  describe('createJar', () => {
    it('creates jar correctly', async () => {
      vi.mocked(prisma.jar.create).mockResolvedValueOnce({ id: 'j1' } as any);
      const result = await FinancialService.createJar('Title', 1000, 'desc', 'd1');
      expect(result.id).toBe('j1');
    });
  });

  describe('getJars', () => {
    it('returns jars without monobank sync if no url', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1', dormitoryId: 'd1' } as any);
      vi.mocked(prisma.jar.findMany).mockResolvedValueOnce([{ id: 'j1', monobankUrl: null, transactions: [] }] as any);
      
      const result = await FinancialService.getJars('u1');
      expect(result).toHaveLength(1);
    });

    it('syncs with monobank if url is present', async () => {
      vi.mocked(prisma.jar.findMany).mockResolvedValueOnce([{ id: 'j1', monobankUrl: 'http://mono', transactions: [] }] as any);
      vi.mocked(MonobankService.getJarDetails).mockResolvedValueOnce({ id: 'mono1', balance: 5000, goal: 10000 } as any);
      vi.mocked(prisma.jar.update).mockResolvedValueOnce({} as any);
      vi.mocked(MonobankService.getJarStatement).mockResolvedValueOnce([{
        id: 'txn1', time: 1000, amount: 5000, description: 'donation', counterName: 'Donor'
      }] as any);

      const result = await FinancialService.getJars();
      expect(result[0].currentAmount).toBe(50); // 5000 / 100
      expect((result[0] as any).transactions).toHaveLength(1);
      expect((result[0] as any).transactions[0].student.fullName).toBe('Donor');
    });
  });

  describe('donateToJar', () => {
    it('throws if amount <= 0', async () => {
      await expect(FinancialService.donateToJar('u1', 'j1', 0)).rejects.toThrow(AppError);
    });

    it('throws if profile not found', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce(null);
      await expect(FinancialService.donateToJar('u1', 'j1', 100)).rejects.toThrow(AppError);
    });

    it('throws if jar not found', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1', dormitoryId: 'd1' } as any);
      vi.mocked(prisma.jar.findFirst).mockResolvedValueOnce(null);
      await expect(FinancialService.donateToJar('u1', 'j1', 100)).rejects.toThrow(AppError);
    });

    it('donates successfully', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1', dormitoryId: 'd1' } as any);
      vi.mocked(prisma.jar.findFirst).mockResolvedValueOnce({ id: 'j1' } as any);
      vi.mocked(prisma.$transaction).mockResolvedValueOnce([{}, {}] as any);

      const result = await FinancialService.donateToJar('u1', 'j1', 100);
      expect(result.success).toBe(true);
    });
  });

  describe('getPayments', () => {
    it('returns empty array if profile not found', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce(null);
      const result = await FinancialService.getPayments('u1');
      expect(result).toEqual([]);
    });

    it('updates overdue and returns payments', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1' } as any);
      vi.mocked(prisma.payment.updateMany).mockResolvedValueOnce({ count: 1 });
      vi.mocked(prisma.payment.findMany).mockResolvedValueOnce([{ id: 'pay1' }] as any);

      const result = await FinancialService.getPayments('u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('payPayment', () => {
    it('throws if payment already paid', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1' } as any);
      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce({ id: 'pay1', status: 'PAID' } as any);

      await expect(FinancialService.payPayment('u1', 'pay1')).rejects.toThrow(AppError);
    });

    it('pays payment successfully', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1' } as any);
      vi.mocked(prisma.payment.findFirst).mockResolvedValueOnce({ id: 'pay1', status: 'PENDING' } as any);
      vi.mocked(prisma.payment.update).mockResolvedValueOnce({ id: 'pay1', status: 'PAID' } as any);

      const result = await FinancialService.payPayment('u1', 'pay1');
      expect(result.status).toBe('PAID');
    });
  });
});
