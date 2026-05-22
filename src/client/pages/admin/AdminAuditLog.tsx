import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Shield, Clock, FileText, Search } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
      case 'POST': return <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-green-500/10 text-green-500 nm-inset-sm">СТВОРЕННЯ (POST)</span>;
      case 'PATCH':
      case 'PUT': return <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-blue-500/10 text-blue-500 nm-inset-sm">ОНОВЛЕННЯ (PATCH)</span>;
      case 'DELETE': return <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-red-500/10 text-red-500 nm-inset-sm">ВИДАЛЕННЯ (DELETE)</span>;
      default: return <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-[rgb(var(--surface-2))] text-[rgb(var(--muted))] nm-inset-sm">{action}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2 flex items-center">
            <Shield className="w-8 h-8 mr-3 text-[rgb(var(--accent))]" /> Журнал аудиту
          </h1>
          <p className="ui-muted text-sm">Фіксація дій адміністраторів в системі</p>
        </div>
        
        <div className="flex items-center">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[rgb(var(--muted))] w-5 h-5" />
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="pl-12 pr-6 ui-input bg-[rgb(var(--surface-2))]"
            >
              <option value="">Всі дії</option>
              <option value="POST">Створення</option>
              <option value="PATCH">Оновлення</option>
              <option value="DELETE">Видалення</option>
            </select>
          </div>
        </div>
      </div>

      <div className="ui-card overflow-hidden flex flex-col p-1">
        <div className="overflow-x-auto bg-[rgb(var(--surface-2))] nm-inset-sm m-1 rounded-3xl">
          <table className="min-w-full text-left border-collapse">
            <thead className="border-b border-[rgb(var(--border)/0.2)]">
              <tr>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Дата / Час</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Адміністратор</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Дія</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Ендпоінт</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Деталі</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border)/0.1)]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton width={120} /></td>
                    <td className="px-6 py-4"><Skeleton width={150} /></td>
                    <td className="px-6 py-4"><Skeleton width={80} /></td>
                    <td className="px-6 py-4"><Skeleton width={180} /></td>
                    <td className="px-6 py-4"><Skeleton width={50} /></td>
                  </tr>
                ))
              ) : logs?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-[rgb(var(--muted))] font-medium text-sm">
                    <FileText className="w-12 h-12 mx-auto opacity-50 mb-4" />
                    Записів не знайдено
                  </td>
                </tr>
              ) : (
                logs?.data.map((log) => (
                  <tr key={log.id} className="hover:bg-[rgb(var(--surface))] transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-[rgb(var(--muted))]">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-[rgb(var(--accent))]" />
                        {new Date(log.createdAt).toLocaleString('uk-UA')}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-[rgb(var(--text))]">{log.admin.lastName} {log.admin.firstName}</div>
                      <div className="text-xs font-medium text-[rgb(var(--muted))] mt-1">{log.admin.email} ({log.admin.role})</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-mono font-bold text-[rgb(var(--text))]">
                      <span className="bg-[rgb(var(--surface))] nm-raised-xs px-2 py-1 rounded-md">{log.entity}</span>
                    </td>
                    <td className="px-6 py-5 text-sm">
                      <details className="group outline-none">
                        <summary className="cursor-pointer text-[rgb(var(--accent))] font-bold uppercase tracking-wider text-xs hover:text-[rgb(var(--text))] transition-colors outline-none list-none">Переглянути деталі</summary>
                        <div className="mt-3 p-4 nm-inset-sm bg-[rgb(var(--surface-2))] rounded-xl text-xs font-mono font-medium text-[rgb(var(--text))] overflow-x-auto custom-scrollbar">
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
          <div className="px-8 py-5 border-t border-[rgb(var(--border)/0.2)] flex items-center justify-between">
            <span className="text-sm font-bold text-[rgb(var(--muted))] uppercase tracking-wider">
              Сторінка <span className="text-[rgb(var(--accent))]">{logs.meta.page}</span> з <span className="text-[rgb(var(--text))]">{logs.meta.totalPages}</span>
            </span>
            <div className="flex space-x-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="ui-button ui-button-outline px-4 py-2 text-xs"
              >
                Попередня
              </button>
              <button
                onClick={() => setPage(p => Math.min(logs.meta.totalPages, p + 1))}
                disabled={page === logs.meta.totalPages}
                className="ui-button ui-button-outline px-4 py-2 text-xs"
              >
                Наступна
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgb(var(--border)); border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default AdminAuditLog;