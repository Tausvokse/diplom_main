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
      <div className="nm-modal-backdrop">
        <div className="nm-modal-content w-full max-w-3xl p-6">
          <div className="space-y-4">
            <Skeleton height={28} borderRadius={14} />
            <Skeleton height={16} width="60%" borderRadius={14} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Skeleton height={160} borderRadius={20} />
              <Skeleton height={160} borderRadius={20} />
            </div>
            <Skeleton height={220} borderRadius={20} />
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
      SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    };
    return map[status] || 'bg-[rgb(var(--surface-3))] text-[rgb(var(--text))]';
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
    <div className="nm-modal-backdrop p-4">
      <div className="nm-modal-content w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 md:p-6 bg-[rgb(var(--surface))] nm-raised-sm rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-semibold text-[rgb(var(--text))]">{data.user.lastName} {data.user.firstName}</h2>
            <p className="text-sm text-[rgb(var(--muted))] mt-1">{data.studentIdNumber} • {data.faculty}, {data.course} курс</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] nm-raised-sm hover:nm-raised rounded-full transition-all active:nm-inset-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex px-4 md:px-6 pt-4 pb-2 overflow-x-auto bg-[rgb(var(--surface-2))] nm-inset-sm gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2.5 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id ? 'nm-raised text-[rgb(var(--accent))] bg-[rgb(var(--surface))]' : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] hover:nm-raised-xs'
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
              <div className="ui-card p-6">
                <h3 className="font-semibold text-[rgb(var(--text))] mb-5 flex items-center"><User className="w-5 h-5 mr-2 text-[rgb(var(--accent))]" /> Особисті дані</h3>
                <div className="space-y-4 text-sm text-[rgb(var(--text))]">
                  <p className="flex items-center"><span className="ui-muted w-24 inline-block">Email:</span> <span className="nm-inset-sm px-3 py-1.5 rounded-lg bg-[rgb(var(--surface))]">{data.user.email}</span></p>
                  <p className="flex items-center"><span className="ui-muted w-24 inline-block">Телефон:</span> <span className="nm-inset-sm px-3 py-1.5 rounded-lg bg-[rgb(var(--surface))]">{data.phone}</span></p>
                  <p className="flex items-center"><span className="ui-muted w-24 inline-block">Пільга:</span> <span className="nm-inset-sm px-3 py-1.5 rounded-lg bg-[rgb(var(--surface))]">{data.privilege?.name || '-'}</span></p>
                  <p className="flex items-center"><span className="ui-muted w-24 inline-block">Рейтинг:</span> <span className="nm-inset-sm px-3 py-1.5 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--accent))] font-bold">{data.priorityScore.toFixed(2)}</span></p>
                </div>
              </div>
              <div className="ui-card p-6">
                <h3 className="font-semibold text-[rgb(var(--text))] mb-5 flex items-center"><Home className="w-5 h-5 mr-2 text-[rgb(var(--accent))]" /> Поселення</h3>
                {data.room ? (
                  <div className="space-y-4 text-sm text-[rgb(var(--text))]">
                    <p className="flex items-center"><span className="ui-muted w-32 inline-block">Гуртожиток:</span> <span className="nm-inset-sm px-3 py-1.5 rounded-lg bg-[rgb(var(--surface))]">{data.dormitory?.name}</span></p>
                    <p className="flex items-start"><span className="ui-muted w-32 inline-block pt-1.5">Адреса:</span> <span className="nm-inset-sm px-3 py-1.5 rounded-lg bg-[rgb(var(--surface))] flex-1">{data.dormitory?.address}</span></p>
                    <p className="flex items-center"><span className="ui-muted w-32 inline-block">Кімната:</span> <span className="nm-inset-sm px-3 py-1.5 rounded-lg bg-[rgb(var(--surface))] font-medium">{data.room?.roomNumber}</span></p>
                    <p className="flex items-center"><span className="ui-muted w-32 inline-block">Заповненість:</span> <span className="nm-inset-sm px-3 py-1.5 rounded-lg bg-[rgb(var(--surface))]">{data.room?.currentOccupancy} / {data.room?.capacity}</span></p>
                  </div>
                ) : (
                  <div className="py-10 text-center text-[rgb(var(--muted))] nm-inset-sm rounded-xl bg-[rgb(var(--surface))]">
                    <Home className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Студент наразі не поселений у гуртожиток</p>
                  </div>
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
                      <tr className="nm-table-head text-xs font-semibold ui-muted uppercase">
                      <th className="px-5 py-4">Дата подачі</th>
                      <th className="px-5 py-4">Тип</th>
                      <th className="px-5 py-4">Статус</th>
                      <th className="px-5 py-4">Дата розгляду</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-[rgb(var(--text))]">
                    {data.applications.map((app: any) => (
                      <tr key={app.id} className="nm-table-row">
                        <td className="px-5 py-4">{new Date(app.submittedAt).toLocaleDateString()}</td>
                        <td className="px-5 py-4 font-medium">{getAppTypeLabel(app.type)}</td>
                        <td className="px-5 py-4">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ui-pill ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                          {app.status === 'REJECTED' && app.rejectionReason && (
                            <p className="text-xs text-red-500 mt-2 nm-inset-sm p-2 rounded-md bg-[rgb(var(--surface))]">{app.rejectionReason}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[rgb(var(--muted))]">{app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-[rgb(var(--muted))]">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Немає поданих заяв</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {(data?.applications || []).map((app: any) => (
                <div key={app.id} className="ui-card p-6">
                  <h4 className="font-semibold text-[rgb(var(--text))] mb-4 flex items-center">
                    <File className="w-4 h-4 mr-2 text-[rgb(var(--accent))]" />
                    Заява на {getAppTypeLabel(app.type).toLowerCase()} <span className="text-[rgb(var(--muted))] font-normal ml-2">({new Date(app.submittedAt).toLocaleDateString()})</span>
                  </h4>
                  {app.scanDocumentsUrl && app.scanDocumentsUrl.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(Array.isArray(app.scanDocumentsUrl) ? app.scanDocumentsUrl : typeof app.scanDocumentsUrl === 'string' ? app.scanDocumentsUrl.split(',') : []).map((doc: string, idx: number) => {
                        const fullUrl = import.meta.env.PROD ? doc : `http://localhost:3000${doc}`;
                        const fileName = doc.split('/').pop() || `Документ ${idx + 1}`;
                        
                        return (
                          <div key={idx} className="flex flex-col items-center justify-between p-5 ui-panel bg-[rgb(var(--surface))] gap-3 transition-transform hover:-translate-y-1">
                            <div className="w-12 h-12 rounded-xl nm-inset-sm flex items-center justify-center bg-[rgb(var(--surface-2))]">
                              <FileText className="w-6 h-6 text-[rgb(var(--accent))]" />
                            </div>
                            <span className="text-xs text-center text-[rgb(var(--text))] font-medium truncate w-full" title={fileName}>
                              {fileName}
                            </span>
                            <div className="flex gap-2 w-full mt-2">
                              <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-medium ui-button ui-button-outline py-1.5 px-0">
                                Відкрити
                              </a>
                              <a href={fullUrl} download target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-medium ui-button ui-button-primary py-1.5 px-0">
                                Завантажити
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="nm-inset-sm p-4 rounded-xl text-sm text-[rgb(var(--muted))] text-center">Немає завантажених документів</div>
                  )}
                </div>
              ))}
              {data.applications.length === 0 && (
                <div className="ui-card p-12 text-center text-[rgb(var(--muted))]">
                  <File className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Немає заяв з документами</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="ui-card p-6">
                <h4 className="font-semibold text-[rgb(var(--text))] mb-5 flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" /> Подані скарги</h4>
                {data.complaintsFiled.length > 0 ? (
                  <div className="space-y-4">
                    {data.complaintsFiled.map((c: any) => (
                      <div key={c.id} className="p-4 nm-inset-sm bg-[rgb(var(--surface))] rounded-xl">
                        <p className="text-sm text-[rgb(var(--text))] mb-1 font-semibold">На: {c.accused?.fullName}</p>
                        <p className="text-sm text-[rgb(var(--muted))] italic mb-3 p-3 bg-[rgb(var(--surface-2))] rounded-lg">"{c.content}"</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[rgb(var(--muted))]">{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span className="ui-pill bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-[rgb(var(--muted))] text-center p-6">Немає поданих скарг</p>}
              </div>
              
              <div className="ui-card p-6">
                <h4 className="font-semibold text-[rgb(var(--text))] mb-5 flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-red-500" /> Отримані скарги</h4>
                {data?.complaintsAgainst?.length > 0 ? (
                  <div className="space-y-4">
                    {data.complaintsAgainst.map((c: any) => (
                      <div key={c.id} className="p-4 nm-inset-sm bg-[rgb(var(--surface))] rounded-xl border-l-4 border-red-500">
                        <p className="text-sm text-[rgb(var(--text))] mb-1 font-semibold">Від: {c.accuser?.fullName}</p>
                        <p className="text-sm text-[rgb(var(--muted))] italic mb-3 p-3 bg-[rgb(var(--surface-2))] rounded-lg">"{c.content}"</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[rgb(var(--muted))]">{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span className="ui-pill bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-[rgb(var(--muted))] text-center p-6">Немає отриманих скарг</p>}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="ui-card p-6">
                <h4 className="font-semibold text-[rgb(var(--text))] mb-5 flex items-center"><CreditCard className="w-5 h-5 mr-2 text-[rgb(var(--accent))]" /> Виставити рахунок</h4>
                <form onSubmit={handleIssueInvoice} className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end bg-[rgb(var(--surface-2))] p-5 rounded-2xl nm-inset-sm">
                  <div>
                    <label className="block text-sm font-medium ui-muted mb-1.5">Сума (грн)</label>
                    <input type="number" inputMode="numeric" required value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} className="ui-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium ui-muted mb-1.5">Дедлайн</label>
                    <input type="date" required value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} className="ui-input" />
                  </div>
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-5 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium ui-muted mb-1.5">Опис</label>
                      <input type="text" required value={invoiceDesc} onChange={(e) => setInvoiceDesc(e.target.value)} className="ui-input" placeholder="Оплата за проживання..." />
                    </div>
                    <button disabled={isSubmittingInvoice} type="submit" className="ui-button ui-button-primary w-full sm:w-auto">
                      {isSubmittingInvoice ? 'Виставлення...' : 'Виставити'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="ui-card overflow-hidden">
                {data?.payments?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[640px]">
                      <thead>
                        <tr className="nm-table-head text-xs font-semibold ui-muted uppercase">
                        <th className="px-5 py-4">Опис</th>
                        <th className="px-5 py-4">Сума</th>
                        <th className="px-5 py-4">Дедлайн</th>
                        <th className="px-5 py-4">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-[rgb(var(--text))]">
                      {data.payments.map((p: any) => (
                        <tr key={p.id} className="nm-table-row">
                          <td className="px-5 py-4">{p.description}</td>
                          <td className="px-5 py-4 font-semibold text-[rgb(var(--accent))]">{p.amount} ₴</td>
                          <td className="px-5 py-4 text-[rgb(var(--muted))]">{new Date(p.dueDate).toLocaleDateString()}</td>
                          <td className="px-5 py-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ui-pill ${
                              p.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                              p.status === 'OVERDUE' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
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
                  <div className="p-12 text-center text-[rgb(var(--muted))]">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Немає виставлених платежів</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
