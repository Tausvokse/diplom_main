import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Shield, Clock, FileText, Search } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './AdminAuditLog.module.css';

interface AuditLog {
  id: string;
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  action: string;
  entity: string;
  details: any;
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const AdminAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/audit-logs?page=${page}&limit=20`);
      if (filterAction) {
        const filteredData = res.data.data.filter((l: AuditLog) => l.action === filterAction);
        setLogs({ ...res.data, data: filteredData });
      } else {
        setLogs(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'POST': return <span className={`nm-inset-sm ${styles.badge} ${styles.badgeSuccess}`}>СТВОРЕННЯ (POST)</span>;
      case 'PATCH':
      case 'PUT': return <span className={`nm-inset-sm ${styles.badge} ${styles.badgeInfo}`}>ОНОВЛЕННЯ (PATCH)</span>;
      case 'DELETE': return <span className={`nm-inset-sm ${styles.badge} ${styles.badgeError}`}>ВИДАЛЕННЯ (DELETE)</span>;
      default: return <span className={`nm-inset-sm ${styles.badge} ${styles.badgeDefault}`}>{action}</span>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Shield className={styles.titleIcon} /> Журнал аудиту
          </h1>
          <p className={`ui-muted ${styles.subtitle}`}>Фіксація дій адміністраторів в системі</p>
        </div>
        
        <div className={styles.filterContainer}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className={`ui-input ${styles.select}`}
            >
              <option value="">Всі дії</option>
              <option value="POST">Створення</option>
              <option value="PATCH">Оновлення</option>
              <option value="DELETE">Видалення</option>
            </select>
          </div>
        </div>
      </div>

      <div className={`ui-card ${styles.card}`}>
        <div className={`nm-inset-sm ${styles.tableWrapper}`}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Дата / Час</th>
                <th className={styles.th}>Адміністратор</th>
                <th className={styles.th}>Дія</th>
                <th className={styles.th}>Ендпоінт</th>
                <th className={styles.th}>Деталі</th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className={styles.td}><Skeleton width={120} /></td>
                    <td className={styles.td}><Skeleton width={150} /></td>
                    <td className={styles.td}><Skeleton width={80} /></td>
                    <td className={styles.td}><Skeleton width={180} /></td>
                    <td className={styles.td}><Skeleton width={50} /></td>
                  </tr>
                ))
              ) : logs?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.tdEmpty}>
                    <FileText className={styles.emptyIcon} />
                    Записів не знайдено
                  </td>
                </tr>
              ) : (
                logs?.data.map((log) => (
                  <tr key={log.id} className={styles.tr}>
                    <td className={styles.tdDate}>
                      <div className={styles.dateFlex}>
                        <Clock className={styles.clockIcon} />
                        {new Date(log.createdAt).toLocaleString('uk-UA')}
                      </div>
                    </td>
                    <td className={styles.tdAdmin}>
                      <div className={styles.adminName}>{log.admin.lastName} {log.admin.firstName}</div>
                      <div className={styles.adminRole}>{log.admin.email} ({log.admin.role})</div>
                    </td>
                    <td className={styles.tdAction}>
                      {getActionBadge(log.action)}
                    </td>
                    <td className={styles.tdEndpoint}>
                      <span className={`nm-raised-xs ${styles.endpointBadge}`}>{log.entity}</span>
                    </td>
                    <td className={styles.tdDetails}>
                      <details className={styles.details}>
                        <summary className={styles.summary}>Переглянути деталі</summary>
                        <div className={`nm-inset-sm ${styles.detailsContent} ${styles.customScrollbar}`}>
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {logs && logs.meta.totalPages > 1 && !loading && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Сторінка <span className={styles.pageCurrent}>{logs.meta.page}</span> з <span className={styles.pageTotal}>{logs.meta.totalPages}</span>
            </span>
            <div className={styles.pageControls}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`ui-button ui-button-outline ${styles.pageButton}`}
              >
                Попередня
              </button>
              <button
                onClick={() => setPage(p => Math.min(logs.meta.totalPages, p + 1))}
                disabled={page === logs.meta.totalPages}
                className={`ui-button ui-button-outline ${styles.pageButton}`}
              >
                Наступна
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;