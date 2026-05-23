import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { emitToUser } from '../socket';

export class NotificationService {
  static async create(
    studentProfileId: string,
    title: string,
    message: string,
    type: NotificationType = 'INFO'
  ) {
    const notification = await prisma.notification.create({
      data: {
        studentId: studentProfileId,
        title,
        message,
        type,
        isRead: false
      },
      include: {
        student: { select: { userId: true } }
      }
    });

    // Real-time update to user
    emitToUser(notification.student.userId, 'new_notification', notification);

    return notification;
  }

  static async createApplicationStatusNotification(
    applicationId: string,
    newStatus: string,
    reason?: string
  ) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { student: true }
    });
    if (!app) return;

    const typeLabels: Record<string, string> = {
      CHECK_IN: 'на поселення',
      CHECK_OUT: 'на виселення'
    };
    const appTypeLabel = typeLabels[app.type] || '';

    let title: string;
    let message: string;

    if (newStatus === 'APPROVED') {
      title = 'Заяву схвалено';
      message = `Вашу заяву ${appTypeLabel} було успішно схвалено.`;
    } else if (newStatus === 'REJECTED') {
      title = 'Заяву відхилено';
      message = `Вашу заяву ${appTypeLabel} було відхилено.${reason ? ` Причина: ${reason}` : ''}`;
    } else {
      title = 'Оновлення статусу заяви';
      message = `Статус вашої заяви ${appTypeLabel} змінено на: ${newStatus}`;
    }

    return this.create(app.studentId, title, message, 'APPLICATION_UPDATE');
  }

  static async createAllocationNotification(
    studentProfileId: string,
    dormitoryName: string,
    roomNumber: string
  ) {
    return this.create(
      studentProfileId,
      'Вас поселено!',
      `Вас було розподілено до гуртожитку "${dormitoryName}", кімната ${roomNumber}.`,
      'ALLOCATION_RESULT'
    );
  }

  static async createEvictionNotification(studentProfileId: string) {
    return this.create(
      studentProfileId,
      'Виселення',
      'Вас було виселено з гуртожитку.',
      'ALLOCATION_RESULT'
    );
  }

  static async markAllRead(studentProfileId: string) {
    return prisma.notification.updateMany({
      where: { studentId: studentProfileId, isRead: false },
      data: { isRead: true }
    });
  }
}
