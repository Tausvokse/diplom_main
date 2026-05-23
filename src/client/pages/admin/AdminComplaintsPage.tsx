import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, ExternalLink, Search, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { api } from '../../services/api';
import styles from './AdminComplaintsPage.module.css';

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
    className: `nm-inset-sm ${styles.statusPending}`,
    icon: Clock
  },
  INVESTIGATING: {
    label: 'Перевірка',
    className: `nm-inset-sm ${styles.statusInvestigating}`,
    icon: ShieldAlert
  },
  RESOLVED: {
    label: 'Вирішено',
    className: `nm-inset-sm ${styles.statusResolved}`,
    icon: CheckCircle2
  },
  DISMISSED: {
    label: 'Відхилено',
    className: `nm-inset-sm ${styles.statusDismissed}`,
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

import { socketService } from '../../services/socket';

const AdminComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplaintStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('new_complaint', (complaint: AdminComplaint) => {
        setComplaints(prev => [complaint, ...prev]);
      });
      socket.on('complaint_status_updated', (updated: AdminComplaint) => {
        setComplaints(prev => prev.map(item => item.id === updated.id ? updated : item));
      });
    }

    return () => {
      if (socket) {
        socket.off('new_complaint');
        socket.off('complaint_status_updated');
      }
    };
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
      <div className={styles.container}>
        <Skeleton height={28} width={240} />
        <Skeleton height={72} />
        <Skeleton height={260} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Розгляд скарг</h1>
          <p className={`ui-muted ${styles.subtitle}`}>Контроль конфліктів між мешканцями, доказів і статусів перевірки</p>
        </div>
        <div className={styles.statusGrid}>
          {statusOptions.map(status => {
            const count = complaints.filter(item => item.status === status).length;
            const Icon = statusConfig[status].icon;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`${styles.statusButton} ${
                  isActive 
                    ? statusConfig[status].className
                    : `${styles.statusButtonInactive}`
                }`}
              >
                <div className={styles.statusButtonContent}>
                  <Icon className={styles.statusButtonIcon} />
                  <span className={styles.statusButtonLabel}>{statusConfig[status].label}</span>
                </div>
                <span className={styles.statusButtonCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className={`ui-card ${styles.searchBar}`}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Пошук за студентом, квитком або описом"
            className={`ui-input ${styles.searchInput}`}
          />
        </div>
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`ui-button ui-button-outline ${styles.searchButton}`}
        >
          Усі скарги
        </button>
      </div>

      <div className={styles.listGrid}>
        {filteredComplaints.map(complaint => {
          const StatusIcon = statusConfig[complaint.status].icon;
          return (
            <article key={complaint.id} className={`ui-card ${styles.complaintCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardUser}>
                  <div className={`nm-raised ${styles.userIconWrapper}`}>
                    <AlertTriangle className={styles.userIcon} />
                  </div>
                  <div>
                    <p className={styles.accuserName}>{complaint.accuser.fullName}</p>
                    <p className={`ui-muted ${styles.accusedInfo}`}>подав скаргу на <span className={styles.accusedName}>{complaint.accused.fullName}</span></p>
                  </div>
                </div>
                <span className={`${styles.badge} ${statusConfig[complaint.status].className}`}>
                  <StatusIcon className={styles.badgeIcon} />
                  {statusConfig[complaint.status].label}
                </span>
              </div>

              <div className={`nm-inset-sm ${styles.contentBox}`}>
                <p className={styles.contentText}>{complaint.content}</p>
              </div>

              <div className={styles.infoGrid}>
                <div className={`nm-flat ${styles.infoBox}`}>
                  <p className={`${styles.infoLabel} ${styles.infoLabelAccuser}`}>
                    <span className={styles.dotAccuser}></span>Заявник
                  </p>
                  <p className={styles.studentId}>{complaint.accuser.studentIdNumber}</p>
                  <p className={`ui-muted ${styles.studentLocation}`}>{complaint.accuser.dormitory?.name || '-'}, кімн. {complaint.accuser.room?.roomNumber || '-'}</p>
                </div>
                <div className={`nm-flat ${styles.infoBox}`}>
                  <p className={`${styles.infoLabel} ${styles.infoLabelAccused}`}>
                    <span className={styles.dotAccused}></span>Порушник
                  </p>
                  <p className={styles.studentId}>{complaint.accused.studentIdNumber}</p>
                  <p className={`ui-muted ${styles.studentLocation}`}>{complaint.accused.dormitory?.name || '-'}, кімн. {complaint.accused.room?.roomNumber || '-'}</p>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.footerControls}>
                  <select
                    value={complaint.status}
                    onChange={(event) => updateStatus(complaint.id, event.target.value as ComplaintStatus)}
                    disabled={updatingId === complaint.id}
                    className={`ui-input ${styles.statusSelect}`}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{statusConfig[status].label}</option>
                    ))}
                  </select>
                  <span className={`ui-muted ${styles.dateText}`}>
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {complaint.evidenceUrl && (
                  <a
                    href={getFileUrl(complaint.evidenceUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className={`nm-raised hover:nm-inset-sm ${styles.evidenceLink}`}
                  >
                    <ExternalLink className={styles.evidenceIcon} />
                    Доказ
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {filteredComplaints.length === 0 && (
        <div className={`nm-inset-sm ${styles.emptyState}`}>
          Скарг за поточними фільтрами немає.
        </div>
      )}
    </div>
  );
};

export default AdminComplaintsPage;
