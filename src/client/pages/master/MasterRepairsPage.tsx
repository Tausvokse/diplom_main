import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Hammer, MapPin, Search, Wrench, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { api } from '../../services/api';

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
    className: 'text-yellow-500 bg-yellow-500/10 nm-inset-sm'
  },
  IN_PROGRESS: {
    label: 'В роботі',
    icon: Hammer,
    className: 'text-blue-500 bg-blue-500/10 nm-inset-sm'
  },
  COMPLETED: {
    label: 'Завершено',
    icon: CheckCircle2,
    className: 'text-green-500 bg-green-500/10 nm-inset-sm'
  },
  CANCELLED: {
    label: 'Скасовано',
    icon: XCircle,
    className: 'text-[rgb(var(--muted))] bg-[rgb(var(--surface-2))] nm-inset-sm'
  }
};

const statusOptions: RepairStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const MasterRepairsPage: React.FC = () => {
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={240} />
        <Skeleton height={70} />
        <Skeleton height={220} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2">Мої ремонтні заявки</h1>
          <p className="ui-muted text-sm">Заявки, призначені вам студентами або адміністрацією</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusOptions.map(status => {
            const Icon = statusConfig[status].icon;
            const count = repairs.filter(repair => repair.status === status).length;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                  isActive 
                    ? `nm-inset-sm ${statusConfig[status].className}`
                    : 'nm-flat bg-[rgb(var(--surface))] text-[rgb(var(--muted))] hover:nm-raised-sm'
                }`}
              >
                <div className="flex items-center">
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">{statusConfig[status].label}</span>
                </div>
                <span className="text-xs font-black">{count}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="ui-card p-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[rgb(var(--muted))]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Пошук за описом, кімнатою або гуртожитком"
            className="w-full pl-12 pr-4 ui-input bg-[rgb(var(--surface-2))]"
          />
        </div>
        <button
          onClick={() => setStatusFilter('ALL')}
          className="ui-button ui-button-outline px-6"
        >
          Усі заявки
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {filteredRepairs.map(repair => {
          const StatusIcon = statusConfig[repair.status].icon;
          return (
            <article key={repair.id} className="ui-card p-6 md:p-8 flex flex-col shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl nm-raised bg-[rgb(var(--surface))] text-blue-500 flex items-center justify-center flex-shrink-0">
                    <Wrench className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-[rgb(var(--text))]">Кімната <span className="text-[rgb(var(--accent))]">{repair.room.roomNumber}</span></p>
                    <p className="text-xs font-medium ui-muted flex items-center mt-1">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-[rgb(var(--muted))]" />
                      {repair.room.floor?.dormitory?.name || 'Гуртожиток'}, поверх {repair.room.floor?.floorNumber || '-'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${statusConfig[repair.status].className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusConfig[repair.status].label}
                </span>
              </div>

              <div className="nm-inset-sm bg-[rgb(var(--surface-2))] p-5 rounded-2xl mb-6 flex-1">
                <p className="text-sm text-[rgb(var(--text))] leading-relaxed font-medium">{repair.description}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto pt-6 border-t border-[rgb(var(--border)/0.2)]">
                <select
                  value={repair.status}
                  onChange={(event) => updateStatus(repair.id, event.target.value as RepairStatus)}
                  disabled={updatingId === repair.id}
                  className="ui-input min-h-[40px] py-2 bg-[rgb(var(--surface-2))] disabled:opacity-50"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{statusConfig[status].label}</option>
                  ))}
                </select>
                <span className="text-xs font-bold uppercase tracking-wider ui-muted">
                  Створено <span className="text-[rgb(var(--text))] ml-1">{new Date(repair.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {filteredRepairs.length === 0 && (
        <div className="text-center py-16 nm-inset-sm bg-[rgb(var(--surface-2))] rounded-3xl text-[rgb(var(--muted))] font-medium text-sm">
          Ремонтних заявок за поточними фільтрами немає.
        </div>
      )}
    </div>
  );
};

export default MasterRepairsPage;
