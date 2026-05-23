import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { format, differenceInDays } from 'date-fns';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './AdminDebtsPage.module.css';

export default function AdminDebtsPage() {
  const { data: debts, isLoading, error } = useQuery({
    queryKey: ['admin-debts'],
    queryFn: async () => {
      const res = await api.get('/admin/debts');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton height={28} width={220} />
        <Skeleton height={220} />
      </div>
    );
  }
  if (error) return <div className={styles.error}>Помилка завантаження боргів</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Борги студентів</h1>
      
      <div className={`ui-card ${styles.card}`}>
        <div className={`nm-inset-sm ${styles.tableWrapper}`}>
          <table className={styles.table}>
            <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Студент</th>
              <th className={styles.th}>Курс / Кімната</th>
              <th className={styles.th}>Сума</th>
              <th className={styles.th}>Опис</th>
              <th className={styles.th}>Термін</th>
              <th className={styles.th}>Прострочено (днів)</th>
              <th className={styles.th}>Статус</th>
            </tr>
            </thead>
            <tbody className={styles.tbody}>
            {debts?.map((debt: any) => {
              const overdueDays = debt.dueDate ? differenceInDays(new Date(), new Date(debt.dueDate)) : 0;
              const isOverdue = overdueDays > 0 && debt.status !== 'PAID';
              
              return (
                <tr key={debt.id} className={`${styles.tr} ${isOverdue ? styles.trOverdue : ''}`}>
                  <td className={styles.td}>
                    <div className={styles.studentName}>
                      {debt.student?.fullName || `${debt.student?.user?.firstName} ${debt.student?.user?.lastName}`}
                    </div>
                    <div className={styles.studentEmail}>
                      {debt.student?.email}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <p className={styles.courseText}>{debt.student?.course || '-'} курс</p>
                    <p className={styles.roomText}>{debt.student?.room?.roomNumber ? `Кім. ${debt.student.room.roomNumber}` : 'Немає кімнати'}</p>
                  </td>
                  <td className={styles.td}>
                    <span className={`nm-raised-xs ${styles.amount}`}>
                      {debt.amount} ₴
                    </span>
                  </td>
                  <td className={styles.description}>
                    {debt.description}
                  </td>
                  <td className={styles.dueDate}>
                    {debt.dueDate ? format(new Date(debt.dueDate), 'dd.MM.yyyy') : '-'}
                  </td>
                  <td className={styles.td}>
                    {isOverdue ? (
                      <span className={`nm-inset-sm ${styles.overdueBadge}`}>
                        {overdueDays}
                      </span>
                    ) : (
                      <span className={styles.overdueDash}>-</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={`nm-inset-sm ${styles.statusBadge} ${
                      debt.status === 'PAID' ? styles.statusPaid : 
                      isOverdue ? styles.statusOverdue :
                      styles.statusPending
                    }`}>
                      {debt.status === 'PAID' ? 'Оплачено' : isOverdue ? 'Прострочено' : 'Очікує оплати'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!debts || debts.length === 0) && (
              <tr>
                <td colSpan={7} className={styles.emptyState}>Немає записів про борги</td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
