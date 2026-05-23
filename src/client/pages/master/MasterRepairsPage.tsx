import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Hammer, MapPin, Search, Wrench, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './MasterRepairsPage.module.css';
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
    className: `${styles.statusPending} nm-inset-sm`
  },
  IN_PROGRESS: {
    label: 'В роботі',
    icon: Hammer,
    className: `${styles.statusInProgress} nm-inset-sm`
  },
  COMPLETED: {
    label: 'Завершено',
    icon: CheckCircle2,
    className: `${styles.statusCompleted} nm-inset-sm`
  },
  CANCELLED: {
    label: 'Скасовано',
    icon: XCircle,
    className: `${styles.statusCancelled} nm-inset-sm`
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
      <div className={styles.loaderContainer}>
        <Skeleton height={28} width={240} />
        <Skeleton height={70} />
        <Skeleton height={220} />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Мої ремонтні заявки</h1>
          <p className={`ui-muted ${styles.subtitle}`}>Заявки, призначені вам студентами або адміністрацією</p>
        </div>
        <div className={styles.statsGrid}>
          {statusOptions.map(status => {
            const Icon = statusConfig[status].icon;
            const count = repairs.filter(repair => repair.status === status).length;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`${styles.statButton} ${
                  isActive 
                    ? `nm-inset-sm ${statusConfig[status].className}`
                    : `nm-flat ${styles.statButtonInactive}`
                }`}
              >
                <div className={styles.statButtonInner}>
                  <Icon className={styles.statIcon} />
                  <span className={styles.statLabel}>{statusConfig[status].label}</span>
                </div>
                <span className={styles.statCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className={`ui-card ${styles.searchCard}`}>
        <div className={styles.searchInputWrapper}>
          <Search className={styles.searchIcon} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Пошук за описом, кімнатою або гуртожитком"
            className={`ui-input ${styles.searchInput}`}
          />
        </div>
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`ui-button ui-button-outline ${styles.resetButton}`}
        >
          Усі заявки
        </button>
      </div>

      <div className={styles.repairsGrid}>
        {filteredRepairs.map(repair => {
          const StatusIcon = statusConfig[repair.status].icon;
          return (
            <article key={repair.id} className={`ui-card ${styles.repairCard}`}>
              <div className={styles.repairHeader}>
                <div className={styles.repairHeaderLeft}>
                  <div className={`${styles.repairIconWrapper} nm-raised`}>
                    <Wrench className={styles.repairIcon} />
                  </div>
                  <div>
                    <p className={styles.roomTitle}>Кімната <span className={styles.roomAccent}>{repair.room.roomNumber}</span></p>
                    <p className={`ui-muted ${styles.roomLocation}`}>
                      <MapPin className={styles.locationIcon} />
                      {repair.room.floor?.dormitory?.name || 'Гуртожиток'}, поверх {repair.room.floor?.floorNumber || '-'}
                    </p>
                  </div>
                </div>
                <span className={`${styles.statusBadge} ${statusConfig[repair.status].className}`}>
                  <StatusIcon className={styles.badgeIcon} />
                  {statusConfig[repair.status].label}
                </span>
              </div>

              <div className={`nm-inset-sm ${styles.descriptionBox}`}>
                <p className={styles.descriptionText}>{repair.description}</p>
              </div>

              <div className={styles.footer}>
                <select
                  value={repair.status}
                  onChange={(event) => updateStatus(repair.id, event.target.value as RepairStatus)}
                  disabled={updatingId === repair.id}
                  className={`ui-input ${styles.selectInput}`}
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{statusConfig[status].label}</option>
                  ))}
                </select>
                <span className={`ui-muted ${styles.dateInfo}`}>
                  Створено <span className={styles.dateValue}>{new Date(repair.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {filteredRepairs.length === 0 && (
        <div className={`nm-inset-sm ${styles.emptyState}`}>
          Ремонтних заявок за поточними фільтрами немає.
        </div>
      )}
    </div>
  );
};

export default MasterRepairsPage;
