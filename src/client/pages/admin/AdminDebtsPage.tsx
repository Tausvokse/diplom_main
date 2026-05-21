
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { format, differenceInDays } from 'date-fns';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../components/ThemeProvider';

export default function AdminDebtsPage() {
  const { theme } = useTheme();
  const { data: debts, isLoading, error } = useQuery({
    queryKey: ['admin-debts'],
    queryFn: async () => {
      const res = await api.get('/admin/debts');
      return res.data;
    }
  });

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={220} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={220} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    );
  }
  if (error) return <div className="px-4 sm:px-6 lg:px-8 py-6 text-red-500 dark:text-red-400">Помилка завантаження боргів</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Борги студентів</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Студент</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Курс / Кімната</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Сума</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Опис</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Термін</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Прострочено (днів)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</th>
            </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {debts?.map((debt: any) => {
              const overdueDays = debt.dueDate ? differenceInDays(new Date(), new Date(debt.dueDate)) : 0;
              const isOverdue = overdueDays > 0 && debt.status !== 'PAID';
              
              return (
                <tr key={debt.id} className={isOverdue ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {debt.student?.fullName || `${debt.student?.user?.firstName} ${debt.student?.user?.lastName}`}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {debt.student?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <p>{debt.student?.course || '-'} курс</p>
                    <p>{debt.student?.room?.roomNumber ? `Кім. ${debt.student.room.roomNumber}` : 'Немає кімнати'}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {debt.amount} грн
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {debt.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {debt.dueDate ? format(new Date(debt.dueDate), 'dd.MM.yyyy') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                    {isOverdue ? overdueDays : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      debt.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                      isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {debt.status === 'PAID' ? 'Оплачено' : isOverdue ? 'Прострочено' : 'Очікує оплати'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!debts || debts.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Немає записів про борги</td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
