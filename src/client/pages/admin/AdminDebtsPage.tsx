import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { format, differenceInDays } from 'date-fns';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={220} />
        <Skeleton height={220} />
      </div>
    );
  }
  if (error) return <div className="px-4 sm:px-6 lg:px-8 py-6 text-red-500 font-bold">Помилка завантаження боргів</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-3xl font-bold text-[rgb(var(--text))] mb-8 tracking-tight">Борги студентів</h1>
      
      <div className="ui-card overflow-hidden p-1">
        <div className="overflow-x-auto rounded-3xl bg-[rgb(var(--surface-2))] nm-inset-sm">
          <table className="min-w-full text-left border-collapse">
            <thead className="border-b border-[rgb(var(--border)/0.2)]">
            <tr>
              <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Студент</th>
              <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Курс / Кімната</th>
              <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Сума</th>
              <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Опис</th>
              <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Термін</th>
              <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Прострочено (днів)</th>
              <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Статус</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border)/0.1)]">
            {debts?.map((debt: any) => {
              const overdueDays = debt.dueDate ? differenceInDays(new Date(), new Date(debt.dueDate)) : 0;
              const isOverdue = overdueDays > 0 && debt.status !== 'PAID';
              
              return (
                <tr key={debt.id} className={`hover:bg-[rgb(var(--surface))] transition-colors ${isOverdue ? 'bg-red-500/5' : ''}`}>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-[rgb(var(--text))]">
                      {debt.student?.fullName || `${debt.student?.user?.firstName} ${debt.student?.user?.lastName}`}
                    </div>
                    <div className="text-xs font-medium text-[rgb(var(--muted))] mt-1">
                      {debt.student?.email}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <p className="text-sm font-bold text-[rgb(var(--text))]">{debt.student?.course || '-'} курс</p>
                    <p className="text-xs font-medium text-[rgb(var(--muted))] mt-1">{debt.student?.room?.roomNumber ? `Кім. ${debt.student.room.roomNumber}` : 'Немає кімнати'}</p>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-lg font-black text-[rgb(var(--text))] bg-[rgb(var(--surface))] nm-raised-xs px-3 py-1 rounded-lg">
                      {debt.amount} ₴
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-[rgb(var(--text))]">
                    {debt.description}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-[rgb(var(--muted))]">
                    {debt.dueDate ? format(new Date(debt.dueDate), 'dd.MM.yyyy') : '-'}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {isOverdue ? (
                      <span className="text-sm font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-lg nm-inset-sm">
                        {overdueDays}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-[rgb(var(--muted))]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1.5 inline-flex text-[10px] font-bold uppercase tracking-wider rounded-xl nm-inset-sm ${
                      debt.status === 'PAID' ? 'bg-green-500/10 text-green-500' : 
                      isOverdue ? 'bg-red-500/10 text-red-500' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {debt.status === 'PAID' ? 'Оплачено' : isOverdue ? 'Прострочено' : 'Очікує оплати'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!debts || debts.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[rgb(var(--muted))] font-medium">Немає записів про борги</td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
