import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { MonobankService } from './monobank.service';

export class FinancialService {
  static async createInvoice(studentId: string, amount: number, dueDate: Date, description: string) {
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId }, include: { user: true } });
    if (!student) {
      throw new AppError('Студента не знайдено', 404);
    }
    const payment = await prisma.payment.create({
      data: {
        studentId,
        amount,
        dueDate,
        description,
        status: 'PENDING'
      }
    });

    const { NotificationService } = await import('./notification.service');
    await NotificationService.create(
      studentId,
      'Новий рахунок',
      `Вам виставлено рахунок на суму ${amount} грн. Оплатити до ${dueDate.toLocaleDateString()}. Призначення: ${description}`,
      'PAYMENT_REMINDER'
    );

    const { emitToUser } = await import('../socket');
    emitToUser(student.userId, 'new_payment', payment);

    return payment;
  }

  static async getDebts() {
    return prisma.payment.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            room: true,
            dormitory: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  static async createJar(title: string, goalAmount: number, description: string | undefined, dormitoryId: string | null | undefined, monobankUrl?: string) {
    return prisma.jar.create({
      data: {
        title,
        goalAmount,
        description,
        dormitoryId: dormitoryId || null,
        currentAmount: 0,
        monobankUrl
      }
    });
  }

  static async getJars(userId?: string) {
    let dormitoryId: string | null = null;
    if (userId) {
      const profile = await prisma.studentProfile.findUnique({ where: { userId } });
      dormitoryId = profile?.dormitoryId || null;
    }

    const jars = await prisma.jar.findMany({
      where: dormitoryId 
        ? { OR: [{ dormitoryId }, { dormitoryId: null }] } 
        : {},
      include: {
        transactions: {
          include: { student: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Sync with Monobank if URL provided
    for (let jar of jars) {
      if (jar.monobankUrl) {
        try {
          const monoJar = await MonobankService.getJarDetails(jar.monobankUrl);
          if (monoJar) {
            const updatedCurrent = monoJar.balance / 100;
            const updatedGoal = monoJar.goal / 100;
            
            await prisma.jar.update({
              where: { id: jar.id },
              data: { currentAmount: updatedCurrent, goalAmount: updatedGoal }
            });
            
            jar.currentAmount = updatedCurrent;
            jar.goalAmount = updatedGoal;
            
            const statement = await MonobankService.getJarStatement(monoJar.id);
            const monoTransactions = statement.map(item => ({
              id: item.id,
              amount: Math.abs(item.amount) / 100,
              comment: item.comment || item.description,
              createdAt: new Date(item.time * 1000).toISOString(),
              student: { fullName: item.counterName || 'Зовнішній донат' }
            }));
            
            (jar as any).transactions = [...monoTransactions, ...jar.transactions];
          }
        } catch (e) {
          console.error(`Monobank sync failed for jar ${jar.id}:`, e);
        }
      }
    }

    return jars;
  }

  static async deleteJar(id: string) {
    return prisma.jar.delete({
      where: { id }
    });
  }

  static async donateToJar(userId: string, jarId: string, amount: number, comment?: string) {
    if (amount <= 0) throw new AppError('Сума має бути більше 0', 400);
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('Профіль не знайдено', 404);

    const jar = await prisma.jar.findFirst({ 
      where: { 
        id: jarId, 
        OR: [{ dormitoryId: profile.dormitoryId }, { dormitoryId: null }] 
      } 
    });
    if (!jar) throw new AppError('Банку не знайдено або вона не доступна', 404);

    await prisma.$transaction([
      prisma.jarTransaction.create({
        data: {
          jarId,
          studentId: profile.id,
          amount,
          comment
        }
      }),
      prisma.jar.update({
        where: { id: jarId },
        data: { currentAmount: { increment: amount } }
      })
    ]);

    return { success: true };
  }

  static async getPayments(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) return [];

    await prisma.payment.updateMany({
      where: { 
        studentId: profile.id, 
        status: 'PENDING', 
        dueDate: { lt: new Date() } 
      },
      data: { status: 'OVERDUE' }
    });

    return prisma.payment.findMany({
      where: { studentId: profile.id },
      orderBy: { dueDate: 'asc' }
    });
  }

  static async payPayment(userId: string, paymentId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('Профіль не знайдено', 404);

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, studentId: profile.id }
    });
    
    if (!payment) throw new AppError('Платіж не знайдено або не належить вам', 404);
    if (payment.status === 'PAID') throw new AppError('Платіж вже оплачено', 409);

    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidAt: new Date() }
    });
  }
}
