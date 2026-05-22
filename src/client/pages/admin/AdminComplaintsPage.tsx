import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, ExternalLink, Search, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { api } from '../../services/api';

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
    className: 'text-yellow-500 bg-yellow-500/10 nm-inset-sm',
    icon: Clock
  },
  INVESTIGATING: {
    label: 'Перевірка',
    className: 'text-blue-500 bg-blue-500/10 nm-inset-sm',
    icon: ShieldAlert
  },
  RESOLVED: {
    label: 'Вирішено',
    className: 'text-green-500 bg-green-500/10 nm-inset-sm',
    icon: CheckCircle2
  },
  DISMISSED: {
    label: 'Відхилено',
    className: 'text-[rgb(var(--muted))] bg-[rgb(var(--surface-2))] nm-inset-sm',
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={240} />
        <Skeleton height={72} />
        <Skeleton height={260} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2">Розгляд скарг</h1>
          <p className="ui-muted text-sm">Контроль конфліктів між мешканцями, доказів і статусів перевірки</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusOptions.map(status => {
            const count = complaints.filter(item => item.status === status).length;
            const Icon = statusConfig[status].icon;
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
            placeholder="Пошук за студентом, квитком або описом"
            className="w-full pl-12 pr-4 ui-input bg-[rgb(var(--surface-2))]"
          />
        </div>
        <button
          onClick={() => setStatusFilter('ALL')}
          className="ui-button ui-button-outline px-6"
        >
          Усі скарги
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {filteredComplaints.map(complaint => {
          const StatusIcon = statusConfig[complaint.status].icon;
          return (
            <article key={complaint.id} className="ui-card p-6 md:p-8 flex flex-col">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl nm-raised bg-[rgb(var(--surface))] text-red-500 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-[rgb(var(--text))]">{complaint.accuser.fullName}</p>
                    <p className="text-xs font-medium ui-muted mt-1">подав скаргу на <span className="font-bold text-[rgb(var(--text))]">{complaint.accused.fullName}</span></p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${statusConfig[complaint.status].className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusConfig[complaint.status].label}
                </span>
              </div>

              <div className="nm-inset-sm bg-[rgb(var(--surface-2))] p-5 rounded-2xl mb-6">
                <p className="text-sm text-[rgb(var(--text))] leading-relaxed font-medium">{complaint.content}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6 flex-1">
                <div className="rounded-2xl nm-flat bg-[rgb(var(--surface))] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>Заявник
                  </p>
                  <p className="font-bold text-[rgb(var(--text))] mb-1">{complaint.accuser.studentIdNumber}</p>
                  <p className="text-xs font-medium ui-muted">{complaint.accuser.dormitory?.name || '-'}, кімн. {complaint.accuser.room?.roomNumber || '-'}</p>
                </div>
                <div className="rounded-2xl nm-flat bg-[rgb(var(--surface))] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span>Порушник
                  </p>
                  <p className="font-bold text-[rgb(var(--text))] mb-1">{complaint.accused.studentIdNumber}</p>
                  <p className="text-xs font-medium ui-muted">{complaint.accused.dormitory?.name || '-'}, кімн. {complaint.accused.room?.roomNumber || '-'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto pt-6 border-t border-[rgb(var(--border)/0.2)]">
                <div className="flex items-center gap-4">
                  <select
                    value={complaint.status}
                    onChange={(event) => updateStatus(complaint.id, event.target.value as ComplaintStatus)}
                    disabled={updatingId === complaint.id}
                    className="ui-input min-h-[40px] py-2 bg-[rgb(var(--surface-2))] disabled:opacity-50"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{statusConfig[status].label}</option>
                    ))}
                  </select>
                  <span className="text-xs font-bold ui-muted">
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {complaint.evidenceUrl && (
                  <a
                    href={getFileUrl(complaint.evidenceUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl nm-raised bg-[rgb(var(--surface))] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[rgb(var(--accent))] hover:nm-inset-sm transition-all"
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
        <div className="text-center py-16 nm-inset-sm bg-[rgb(var(--surface-2))] rounded-3xl text-[rgb(var(--muted))] font-medium text-sm">
          Скарг за поточними фільтрами немає.
        </div>
      )}
    </div>
  );
};

export default AdminComplaintsPage;
