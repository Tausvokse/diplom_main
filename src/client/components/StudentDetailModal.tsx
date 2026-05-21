import React, { useEffect, useState } from 'react';
import { X, User, Home, FileText, File, AlertTriangle, CreditCard } from 'lucide-react';
import { api } from '../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface StudentDetailModalProps {
  studentId: string;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ studentId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  // Invoice form state
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/admin/students/${studentId}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [studentId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-[rgb(var(--surface))] p-6 rounded-2xl w-full max-w-3xl shadow-2xl border border-[rgb(var(--border))]">
          <div className="space-y-4">
            <Skeleton height={28} />
            <Skeleton height={16} width="60%" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Skeleton height={160} />
              <Skeleton height={160} />
            </div>
            <Skeleton height={220} />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tabs = [
    { id: 'profile', label: 'Профіль', icon: User },
    { id: 'applications', label: 'Заяви', icon: FileText },
    { id: 'documents', label: 'Документи', icon: File },
    { id: 'complaints', label: 'Скарги', icon: AlertTriangle },
    { id: 'payments', label: 'Платежі', icon: CreditCard },
  ];

  const getAppTypeLabel = (type: string) => {
    const map: any = { CHECK_IN: 'Поселення', TRANSFER: 'Переселення', CHECK_OUT: 'Виселення' };
    return map[type] || type;
  };

  const getStatusColor = (status: string) => {
    const map: any = {
      SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingInvoice(true);
      await api.post(`/admin/students/${studentId}/invoice`, {
        amount: Number(invoiceAmount),
        dueDate: invoiceDueDate,
        description: invoiceDesc
      });
      // Refresh details
      const res = await api.get(`/admin/students/${studentId}`);
      setData(res.data);
      setInvoiceAmount('');
      setInvoiceDueDate('');
      setInvoiceDesc('');
      alert('Рахунок успішно виставлено');
    } catch (err) {
      console.error(err);
      alert('Помилка при виставленні рахунку');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-[rgb(var(--surface))] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[rgb(var(--border))]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 md:p-6 border-b border-[rgb(var(--border))]">
          <div>
            <h2 className="text-2xl font-semibold text-[rgb(var(--text))]">{data.user.lastName} {data.user.firstName}</h2>
            <p className="text-sm text-[rgb(var(--muted))]">{data.studentIdNumber} • {data.faculty}, {data.course} курс</p>
          </div>
          <button onClick={onClose} className="p-2 text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-2))] rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-[rgb(var(--border))] px-4 md:px-6 pt-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center border-b-2 border-transparent whitespace-nowrap ui-tab ${
                activeTab === tab.id ? 'ui-tab-active' : 'hover:text-[rgb(var(--text))]'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-[rgb(var(--surface-2))]">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="ui-card p-5">
                <h3 className="font-semibold text-[rgb(var(--text))] mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-[rgb(var(--accent))]" /> Особисті дані</h3>
                <div className="space-y-3 text-sm text-[rgb(var(--text))]">
                  <p><span className="ui-muted w-24 inline-block">Email:</span> {data.user.email}</p>
                  <p><span className="ui-muted w-24 inline-block">Телефон:</span> {data.phone}</p>
                  <p><span className="ui-muted w-24 inline-block">Пільга:</span> {data.privilege?.name || '-'}</p>
                  <p><span className="ui-muted w-24 inline-block">Рейтинг:</span> {data.priorityScore.toFixed(2)}</p>
                </div>
              </div>
              <div className="ui-card p-5">
                <h3 className="font-semibold text-[rgb(var(--text))] mb-4 flex items-center"><Home className="w-5 h-5 mr-2 text-[rgb(var(--accent))]" /> Поселення</h3>
                {data.room ? (
                  <div className="space-y-3 text-sm text-[rgb(var(--text))]">
                    <p><span className="ui-muted w-32 inline-block">Гуртожиток:</span> {data.dormitory?.name}</p>
                    <p><span className="ui-muted w-32 inline-block">Адреса:</span> {data.dormitory?.address}</p>
                    <p><span className="ui-muted w-32 inline-block">Кімната:</span> {data.room?.roomNumber}</p>
                    <p><span className="ui-muted w-32 inline-block">Заповненість:</span> {data.room?.currentOccupancy} / {data.room?.capacity}</p>
                  </div>
                ) : (
                  <div className="py-4 text-center ui-muted">Студент наразі не поселений у гуртожиток</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="ui-card overflow-hidden">
              {data.applications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-[rgb(var(--surface-2))] border-b border-[rgb(var(--border))] text-xs font-semibold ui-muted uppercase">
                      <th className="px-4 py-3">Дата подачі</th>
                      <th className="px-4 py-3">Тип</th>
                      <th className="px-4 py-3">Статус</th>
                      <th className="px-4 py-3">Дата розгляду</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgb(var(--border))] text-sm text-[rgb(var(--text))]">
                    {data.applications.map((app: any) => (
                      <tr key={app.id}>
                        <td className="px-4 py-3">{new Date(app.submittedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">{getAppTypeLabel(app.type)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                          {app.status === 'REJECTED' && app.rejectionReason && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{app.rejectionReason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">{app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">Немає поданих заяв</div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {(data?.applications || []).map((app: any) => (
                <div key={app.id} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">Документи із заяви на {getAppTypeLabel(app.type).toLowerCase()} ({new Date(app.submittedAt).toLocaleDateString()})</h4>
                  {app.scanDocumentsUrl && app.scanDocumentsUrl.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {app.scanDocumentsUrl.split(',').map((doc: string, idx: number) => {
                        const fullUrl = import.meta.env.PROD ? doc : `http://localhost:3000${doc}`;
                        const fileName = doc.split('/').pop() || `Документ ${idx + 1}`;
                        
                        return (
                          <div key={idx} className="flex flex-col items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-3">
                            <FileText className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                            <span className="text-xs text-center text-gray-700 dark:text-gray-300 font-medium truncate w-full" title={fileName}>
                              {fileName}
                            </span>
                            <div className="flex gap-2 w-full mt-auto">
                              <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 py-1.5 rounded transition-colors">
                                Відкрити
                              </a>
                              <a href={fullUrl} download target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 py-1.5 rounded transition-colors">
                                Завантажити
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Немає завантажених документів</p>
                  )}
                </div>
              ))}
              {data.applications.length === 0 && <div className="text-center text-gray-500 dark:text-gray-400">Немає заяв з документами</div>}
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Подані скарги</h4>
                {data.complaintsFiled.length > 0 ? (
                  <div className="space-y-4">
                    {data.complaintsFiled.map((c: any) => (
                      <div key={c.id} className="p-3 bg-gray-50 dark:bg-gray-700/60 rounded-lg border border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-900 dark:text-white mb-1 font-medium">На: {c.accused?.fullName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 italic mb-2">"{c.content}"</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded">{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-500 dark:text-gray-400">Немає поданих скарг</p>}
              </div>
              <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Отримані скарги</h4>
                {data?.complaintsAgainst?.length > 0 ? (
                  <div className="space-y-4">
                    {data.complaintsAgainst.map((c: any) => (
                      <div key={c.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/50">
                        <p className="text-sm text-gray-900 dark:text-white mb-1 font-medium">Від: {c.accuser?.fullName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 italic mb-2">"{c.content}"</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded">{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-500 dark:text-gray-400">Немає отриманих скарг</p>}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Виставити рахунок</h4>
                <form onSubmit={handleIssueInvoice} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сума (грн)</label>
                    <input type="number" inputMode="numeric" required value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Дедлайн</label>
                    <input type="date" required value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm border p-2" />
                  </div>
                  <div className="md:col-span-2 flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Опис</label>
                      <input type="text" required value={invoiceDesc} onChange={(e) => setInvoiceDesc(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm border p-2" placeholder="Оплата за проживання..." />
                    </div>
                    <button disabled={isSubmittingInvoice} type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50 h-[42px] transition-colors">
                      {isSubmittingInvoice ? 'Виставлення рахунку...' : 'Виставити рахунок'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                {data?.payments?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[640px]">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        <th className="px-4 py-3">Опис</th>
                        <th className="px-4 py-3">Сума</th>
                        <th className="px-4 py-3">Дедлайн</th>
                        <th className="px-4 py-3">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm text-gray-800 dark:text-gray-200">
                      {data.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3">{p.description}</td>
                          <td className="px-4 py-3 font-medium">{p.amount} ₴</td>
                          <td className="px-4 py-3">{new Date(p.dueDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              p.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              p.status === 'OVERDUE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">Немає виставлених платежів</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
