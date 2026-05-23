import React, { useEffect, useState } from 'react';
import { X, User, Home, FileText, File, AlertTriangle, CreditCard } from 'lucide-react';
import { api } from '../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './StudentDetailModal.module.css';

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
      <div className={styles.backdrop}>
        <div className={styles.skeletonWrapper}>
          <div className={styles.skeletonSpace}>
            <Skeleton height={28} borderRadius={14} />
            <Skeleton height={16} width="60%" borderRadius={14} />
            <div className={styles.skeletonGrid}>
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
    const map: any = { CHECK_IN: 'Поселення', CHECK_OUT: 'Виселення' };
    return map[type] || type;
  };

  const getStatusColor = (status: string) => {
    const map: any = {
      SUBMITTED: styles.statusSubmitted,
      UNDER_REVIEW: styles.statusReview,
      APPROVED: styles.statusApproved,
      REJECTED: styles.statusRejected,
    };
    return map[status] || styles.statusDefault;
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
    <div className={styles.backdrop}>
      <div className={styles.modalContainer}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{data.user.lastName} {data.user.firstName}</h2>
            <p className={styles.subtitle}>{data.studentIdNumber} • {data.faculty}, {data.course} курс</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X className={styles.icon} />
          </button>
        </div>

        <div className={styles.tabsContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : styles.tabInactive}`}
            >
              <tab.icon className={styles.tabIcon} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {activeTab === 'profile' && (
            <div className={styles.grid2}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}><User className={styles.cardTitleIcon} /> Особисті дані</h3>
                <div className={styles.infoList}>
                  <p className={styles.infoRow}><span className={styles.infoLabel}>Email:</span> <span className={`${styles.infoValue} ${styles.infoValueFlex}`}>{data.user.email}</span></p>
                  <p className={styles.infoRow}><span className={styles.infoLabel}>Телефон:</span> <span className={`${styles.infoValue} ${styles.infoValueFlex}`}>{data.phone}</span></p>
                  <p className={styles.infoRow}><span className={styles.infoLabel}>Пільга:</span> <span className={`${styles.infoValue} ${styles.infoValueFlex}`}>{data.privilege?.name || '-'}</span></p>
                  <p className={styles.infoRow}><span className={styles.infoLabel}>Рейтинг:</span> <span className={`${styles.infoValue} ${styles.infoValueHighlight} ${styles.infoValueFlex}`}>{data.priorityScore.toFixed(2)}</span></p>
                </div>
              </div>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}><Home className={styles.cardTitleIcon} /> Поселення</h3>
                {data.room ? (
                  <div className={styles.infoList}>
                    <p className={styles.infoRow}><span className={styles.infoLabelWide}>Гуртожиток:</span> <span className={`${styles.infoValue} ${styles.infoValueFlex}`}>{data.dormitory?.name}</span></p>
                    <p className={styles.infoRowStart}><span className={`${styles.infoLabelWide} ${styles.infoLabelPt}`}>Адреса:</span> <span className={`${styles.infoValue} ${styles.infoValueFlex}`}>{data.dormitory?.address}</span></p>
                    <p className={styles.infoRow}><span className={styles.infoLabelWide}>Кімната:</span> <span className={`${styles.infoValue} ${styles.infoValueMedium} ${styles.infoValueFlex}`}>{data.room?.roomNumber}</span></p>
                    <p className={styles.infoRow}><span className={styles.infoLabelWide}>Заповненість:</span> <span className={`${styles.infoValue} ${styles.infoValueFlex}`}>{data.room?.currentOccupancy} / {data.room?.capacity}</span></p>
                  </div>
                ) : (
                  <div className={styles.emptyDorm}>
                    <Home className={styles.emptyDormIcon} />
                    <p>Студент наразі не поселений у гуртожиток</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className={styles.cardOverflow}>
              {data.applications.length > 0 ? (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead className={styles.thead}>
                      <tr>
                        <th className={styles.th}>Дата подачі</th>
                        <th className={styles.th}>Тип</th>
                        <th className={styles.th}>Статус</th>
                        <th className={styles.th}>Дата розгляду</th>
                      </tr>
                    </thead>
                    <tbody className={styles.tbody}>
                    {data.applications.map((app: any) => (
                      <tr key={app.id} className={styles.tr}>
                        <td className={styles.td}>{new Date(app.submittedAt).toLocaleDateString()}</td>
                        <td className={`${styles.td} ${styles.tdMedium}`}>{getAppTypeLabel(app.type)}</td>
                        <td className={styles.td}>
                          <span className={`${styles.pill} ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                          {app.status === 'REJECTED' && app.rejectionReason && (
                            <p className={styles.rejectionText}>{app.rejectionReason}</p>
                          )}
                        </td>
                        <td className={`${styles.td} ${styles.tdMuted}`}>{app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyApps}>
                  <FileText className={styles.emptyAppsIcon} />
                  <p>Немає поданих заяв</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className={styles.spaceY6}>
              {(data?.applications || []).map((app: any) => (
                <div key={app.id} className={styles.card}>
                  <h4 className={styles.cardTitle}>
                    <File className={styles.cardTitleIcon} />
                    Заява на {getAppTypeLabel(app.type).toLowerCase()} <span className={styles.docSubtitle}>({new Date(app.submittedAt).toLocaleDateString()})</span>
                  </h4>
                  {app.scanDocumentsUrl && app.scanDocumentsUrl.length > 0 ? (
                    <div className={styles.gridDoc}>
                      {(Array.isArray(app.scanDocumentsUrl) ? app.scanDocumentsUrl : typeof app.scanDocumentsUrl === 'string' ? app.scanDocumentsUrl.split(',') : []).map((doc: string, idx: number) => {
                        const fullUrl = doc;
                        const fileName = doc.split('/').pop() || `Документ ${idx + 1}`;
                        
                        return (
                          <div key={idx} className={styles.docItem}>
                            <div className={styles.docIconBg}>
                              <FileText className={styles.docIcon} />
                            </div>
                            <span className={styles.docName} title={fileName}>
                              {fileName}
                            </span>
                            <div className={styles.docButtons}>
                              <a href={fullUrl} target="_blank" rel="noopener noreferrer" className={`${styles.docBtn} ${styles.docBtnOutline}`}>
                                Відкрити
                              </a>
                              <a href={fullUrl} download target="_blank" rel="noopener noreferrer" className={`${styles.docBtn} ${styles.docBtnPrimary}`}>
                                Завантажити
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.noDocs}>Немає завантажених документів</div>
                  )}
                </div>
              ))}
              {data.applications.length === 0 && (
                <div className={styles.emptyApps}>
                  <File className={styles.emptyAppsIcon} />
                  <p>Немає заяв з документами</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className={styles.grid2}>
              <div className={styles.card}>
                <h4 className={styles.cardTitle}><AlertTriangle className={`${styles.cardTitleIcon} ${styles.cardTitleYellow}`} /> Подані скарги</h4>
                {data.complaintsFiled.length > 0 ? (
                  <div className={styles.spaceY4}>
                    {data.complaintsFiled.map((c: any) => (
                      <div key={c.id} className={styles.complaintItem}>
                        <p className={styles.complaintTarget}>На: {c.accused?.fullName}</p>
                        <p className={styles.complaintText}>"{c.content}"</p>
                        <div className={styles.complaintFooter}>
                          <span className={styles.complaintDate}>{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span className={`${styles.pill} ${styles.statusReview}`}>{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className={styles.noComplaints}>Немає поданих скарг</p>}
              </div>
              
              <div className={styles.card}>
                <h4 className={styles.cardTitle}><AlertTriangle className={`${styles.cardTitleIcon} ${styles.cardTitleRed}`} /> Отримані скарги</h4>
                {data?.complaintsAgainst?.length > 0 ? (
                  <div className={styles.spaceY4}>
                    {data.complaintsAgainst.map((c: any) => (
                      <div key={c.id} className={`${styles.complaintItem} ${styles.complaintItemRedBorder}`}>
                        <p className={styles.complaintTarget}>Від: {c.accuser?.fullName}</p>
                        <p className={styles.complaintText}>"{c.content}"</p>
                        <div className={styles.complaintFooter}>
                          <span className={styles.complaintDate}>{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span className={`${styles.pill} ${styles.statusReview}`}>{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className={styles.noComplaints}>Немає отриманих скарг</p>}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className={styles.spaceY6}>
              <div className={styles.card}>
                <h4 className={styles.cardTitle}><CreditCard className={styles.cardTitleIcon} /> Виставити рахунок</h4>
                <form onSubmit={handleIssueInvoice} className={styles.invoiceForm}>
                  <div>
                    <label className={styles.formLabel}>Сума (грн)</label>
                    <input type="number" inputMode="numeric" required value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} className={styles.formInput} />
                  </div>
                  <div>
                    <label className={styles.formLabel}>Дедлайн</label>
                    <input type="date" required value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} className={styles.formInput} />
                  </div>
                  <div className={styles.formCol2}>
                    <div className={styles.formFlex1}>
                      <label className={styles.formLabel}>Опис</label>
                      <input type="text" required value={invoiceDesc} onChange={(e) => setInvoiceDesc(e.target.value)} className={styles.formInput} placeholder="Оплата за проживання..." />
                    </div>
                    <button disabled={isSubmittingInvoice} type="submit" className={styles.formBtn}>
                      {isSubmittingInvoice ? 'Виставлення...' : 'Виставити'}
                    </button>
                  </div>
                </form>
              </div>

              <div className={styles.cardOverflow}>
                {data?.payments?.length > 0 ? (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead className={styles.thead}>
                        <tr>
                          <th className={styles.th}>Опис</th>
                          <th className={styles.th}>Сума</th>
                          <th className={styles.th}>Дедлайн</th>
                          <th className={styles.th}>Статус</th>
                        </tr>
                      </thead>
                      <tbody className={styles.tbody}>
                      {data.payments.map((p: any) => (
                        <tr key={p.id} className={styles.tr}>
                          <td className={styles.td}>{p.description}</td>
                          <td className={`${styles.td} ${styles.amountText}`}>{p.amount} ₴</td>
                          <td className={`${styles.td} ${styles.tdMuted}`}>{new Date(p.dueDate).toLocaleDateString()}</td>
                          <td className={styles.td}>
                            <span className={`${styles.pill} ${
                              p.status === 'PAID' ? styles.statusPaid :
                              p.status === 'OVERDUE' ? styles.statusOverdue :
                              styles.statusReview
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
                  <div className={styles.emptyApps}>
                    <CreditCard className={styles.emptyAppsIcon} />
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
