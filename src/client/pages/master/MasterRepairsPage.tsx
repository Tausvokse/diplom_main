import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Hammer, MapPin, Search, Wrench, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { api } from '../../services/api';
import { useTheme } from '../../components/ThemeProvider';

type RepairStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface MasterRepair {
  id: string;
  description: string;
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
  room: {
    roomNumber: string;
    floor?: {
      floorNumber: number;
      dormitory?: { name: string; address: string };
    };
  };
}

const statusConfig: Record<RepairStatus, { label: string; icon: React.ElementType; className: string }> = {
  PENDING: {
    label: 'Очікує',
    icon: Clock,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/50'
  },
  IN_PROGRESS: {
    label: 'В роботі',
    icon: Hammer,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50'
  },
  COMPLETED: {
    label: 'Завершено',
    icon: CheckCircle2,
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50'
  },
  CANCELLED: {
    label: 'Скасовано',
    icon: XCircle,
    className: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  }
};

const statusOptions: RepairStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const MasterRepairsPage: React.FC = () => {
  const { theme } = useTheme();
  const [repairs, setRepairs] = useState<MasterRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RepairStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/student/repairs');
      setRepairs(res.data);
    } catch {
      toast.error('Не вдалося завантажити заявки');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: RepairStatus) => {
    setUpdatingId(id);
    try {
      const res = await api.patch(`/student/repairs/${id}/status`, { status });
      setRepairs(prev => prev.map(repair => repair.id === id ? res.data : repair));
      toast.success('Статус ремонту оновлено');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRepairs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return repairs.filter(repair => {
      const matchesStatus = statusFilter === 'ALL' || repair.status === statusFilter;
      const matchesQuery = !normalizedQuery ||
        repair.description.toLowerCase().includes(normalizedQuery) ||
        repair.room.roomNumber.toLowerCase().includes(normalizedQuery) ||
        repair.room.floor?.dormitory?.name.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [repairs, query, statusFilter]);

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={240} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={70} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={220} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Мої ремонтні заявки</h1>
          <p className="text-gray-500 dark:text-gray-400">Заявки, призначені вам студентами або адміністрацією</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statusOptions.map(status => {
            const Icon = statusConfig[status].icon;
            const count = repairs.filter(repair => repair.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${statusFilter === status ? statusConfig[status].className : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-semibold">{statusConfig[status].label}</span>
                <span className="text-xs font-mono">{count}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Пошук за описом, кімнатою або гуртожитком"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setStatusFilter('ALL')}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Усі заявки
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredRepairs.map(repair => {
          const StatusIcon = statusConfig[repair.status].icon;
          return (
            <article key={repair.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 flex items-center justify-center">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Кімната {repair.room.roomNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {repair.room.floor?.dormitory?.name || 'Гуртожиток'}, поверх {repair.room.floor?.floorNumber || '-'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig[repair.status].className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusConfig[repair.status].label}
                </span>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-200 mb-5">{repair.description}</p>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <select
                  value={repair.status}
                  onChange={(event) => updateStatus(repair.id, event.target.value as RepairStatus)}
                  disabled={updatingId === repair.id}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{statusConfig[status].label}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">
                  Створено {new Date(repair.createdAt).toLocaleDateString()}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {filteredRepairs.length === 0 && (
        <div className="text-center py-14 bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
          Ремонтних заявок за поточними фільтрами немає.
        </div>
      )}
    </div>
  );
};

export default MasterRepairsPage;
