import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, ExternalLink, Search, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { api } from '../../services/api';
import { useTheme } from '../../components/ThemeProvider';

type ComplaintStatus = 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

interface ComplaintPerson {
  id: string;
  fullName: string;
  studentIdNumber: string;
  dormitory?: { name: string } | null;
  room?: { roomNumber: string } | null;
}

interface AdminComplaint {
  id: string;
  accuser: ComplaintPerson;
  accused: ComplaintPerson;
  content: string;
  evidenceUrl?: string | null;
  status: ComplaintStatus;
  createdAt: string;
}

const statusConfig: Record<ComplaintStatus, { label: string; className: string; icon: React.ElementType }> = {
  PENDING: {
    label: 'Очікує',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/50',
    icon: Clock
  },
  INVESTIGATING: {
    label: 'Перевірка',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50',
    icon: ShieldAlert
  },
  RESOLVED: {
    label: 'Вирішено',
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50',
    icon: CheckCircle2
  },
  DISMISSED: {
    label: 'Відхилено',
    className: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    icon: CircleSlash
  }
};

const statusOptions: ComplaintStatus[] = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];

const getFileUrl = (url: string) => {
  if (/^https?:\/\//.test(url)) return url;
  const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
};

const AdminComplaintsPage: React.FC = () => {
  const { theme } = useTheme();
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplaintStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/complaints');
      setComplaints(res.data);
    } catch {
      toast.error('Не вдалося завантажити скарги');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ComplaintStatus) => {
    setUpdatingId(id);
    try {
      const res = await api.patch(`/admin/complaints/${id}/status`, { status });
      setComplaints(prev => prev.map(item => item.id === id ? res.data : item));
      toast.success('Статус скарги оновлено');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredComplaints = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return complaints.filter(complaint => {
      const matchesStatus = statusFilter === 'ALL' || complaint.status === statusFilter;
      const matchesQuery = !normalizedQuery ||
        complaint.accuser.fullName.toLowerCase().includes(normalizedQuery) ||
        complaint.accused.fullName.toLowerCase().includes(normalizedQuery) ||
        complaint.content.toLowerCase().includes(normalizedQuery) ||
        complaint.accuser.studentIdNumber.toLowerCase().includes(normalizedQuery) ||
        complaint.accused.studentIdNumber.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [complaints, query, statusFilter]);

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={240} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={72} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={260} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Розгляд скарг</h1>
          <p className="text-gray-500 dark:text-gray-400">Контроль конфліктів між мешканцями, доказів і статусів перевірки</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statusOptions.map(status => {
            const count = complaints.filter(item => item.status === status).length;
            const Icon = statusConfig[status].icon;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${statusFilter === status ? statusConfig[status].className : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
              >
                <Icon className="w-4 h-4" />
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
            placeholder="Пошук за студентом, квитком або описом"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setStatusFilter('ALL')}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Усі скарги
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredComplaints.map(complaint => {
          const StatusIcon = statusConfig[complaint.status].icon;
          return (
            <article key={complaint.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{complaint.accuser.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">подав скаргу на {complaint.accused.fullName}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig[complaint.status].className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusConfig[complaint.status].label}
                </span>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">{complaint.content}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-3">
                  <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Заявник</p>
                  <p>{complaint.accuser.studentIdNumber}</p>
                  <p>{complaint.accuser.dormitory?.name || '-'}, кімн. {complaint.accuser.room?.roomNumber || '-'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-3">
                  <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Порушник</p>
                  <p>{complaint.accused.studentIdNumber}</p>
                  <p>{complaint.accused.dormitory?.name || '-'}, кімн. {complaint.accused.room?.roomNumber || '-'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <select
                    value={complaint.status}
                    onChange={(event) => updateStatus(complaint.id, event.target.value as ComplaintStatus)}
                    disabled={updatingId === complaint.id}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{statusConfig[status].label}</option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400">{new Date(complaint.createdAt).toLocaleDateString()}</span>
                </div>
                {complaint.evidenceUrl && (
                  <a
                    href={getFileUrl(complaint.evidenceUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Доказ
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {filteredComplaints.length === 0 && (
        <div className="text-center py-14 bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
          Скарг за поточними фільтрами немає.
        </div>
      )}
    </div>
  );
};

export default AdminComplaintsPage;
