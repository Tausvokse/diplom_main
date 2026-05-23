import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Eye, AlertTriangle, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Application } from '../../types';
import { api } from '../../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './ApplicationsReview.module.css';

export const ApplicationsReview: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [documentsApp, setDocumentsApp] = useState<Application | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/admin/applications');
      setApplications(res.data);
    } catch (error) {
      toast.error('Помилка завантаження заяв');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      await api.post(`/admin/applications/${id}/approve`);
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status: 'APPROVED' } : app));
      toast.success('Заяву схвалено та додано до пулу розподілу');
    } catch (error) {
      toast.error('Помилка при схваленні заяви');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetUnderReview = async (id: string) => {
    setIsProcessing(true);
    try {
      await api.patch(`/admin/applications/${id}/status`, { status: 'UNDER_REVIEW' });
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status: 'UNDER_REVIEW' } : app));
      toast.success('Заяву переведено в статус "На розгляді"');
    } catch (error) {
      toast.error('Помилка при оновленні статусу');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = (app: Application) => {
    setSelectedApp(app);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Будь ласка, вкажіть причину відмови');
      return;
    }
    
    setIsProcessing(true);
    try {
      await api.post(`/admin/applications/${selectedApp?.id}/reject`, { reason: rejectionReason });
      setApplications(prev => prev.map(app => 
        app.id === selectedApp?.id ? { ...app, status: 'REJECTED', rejectionReason } : app
      ));
      toast.success('Заяву відхилено. Студент отримає сповіщення.');
      setIsRejectModalOpen(false);
    } catch (error) {
      toast.error('Помилка при відхиленні заяви');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <span className={`${styles.statusBadge} ${styles.statusBlue}`}>Нова</span>;
      case 'UNDER_REVIEW': return <span className={`${styles.statusBadge} ${styles.statusYellow}`}>На розгляді</span>;
      case 'APPROVED': return <span className={`${styles.statusBadge} ${styles.statusGreen}`}>Схвалено</span>;
      case 'REJECTED': return <span className={`${styles.statusBadge} ${styles.statusRed}`}>Відхилено</span>;
      default: return null;
    }
  };

  const getDocumentUrl = (url: string) => {
    if (/^https?:\/\//.test(url)) return url;
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
    const origin = apiBase.replace(/\/api\/?$/, '');
    return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
  };

  const isImageDocument = (url: string) => /\.(png|jpe?g|gif|webp)$/i.test(url);
  const isPdfDocument = (url: string) => /\.pdf($|\?)/i.test(url);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Skeleton height={28} width={260} />
        <Skeleton height={260} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Розгляд заяв на поселення</h1>
        <p className={styles.pageSubtitle}>Перевірка документів та валідація пільгових категорій</p>
      </header>

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.thRow}>
                <th className={styles.th}>Студент</th>
                <th className={styles.th}>Факультет / Курс</th>
                <th className={styles.th}>Пільги</th>
                <th className={styles.th}>Тип</th>
                <th className={styles.th}>Статус</th>
                <th className={styles.thRight}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.flexCenter}>
                      <div className={styles.avatar}>
                        {app.student?.user?.firstName[0]}{app.student?.user?.lastName[0]}
                      </div>
                      <div>
                        <p className={styles.primaryText}>{app.student?.user?.lastName} {app.student?.user?.firstName}</p>
                        <p className={styles.secondaryText}>{app.student?.studentIdNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <p className={styles.primaryText}>{app.student?.faculty}</p>
                    <p className={styles.secondaryText}>{app.student?.course} курс</p>
                  </td>
                  <td className={styles.td}>
                    {app.student?.privilege ? (
                      <div className={styles.privilegeBadge}>
                        <AlertTriangle className={styles.privilegeIcon} />
                        <span>{app.student.privilege.name}</span>
                      </div>
                    ) : (
                      <span className={styles.emptyText}>-</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={styles.typeBadge}>
                      {{ CHECK_IN: 'Поселення', CHECK_OUT: 'Виселення' }[app.type as string] || app.type}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {getStatusBadge(app.status)}
                  </td>
                  <td className={styles.tdRight}>
                    <div className={styles.actions}>
                      <button 
                        onClick={() => setDocumentsApp(app)}
                        title="Переглянути документи"
                        className={styles.actionBtn}
                      >
                        <Eye className={styles.actionIcon} />
                      </button>
                      {app.status === 'SUBMITTED' && (
                        <button 
                          onClick={() => handleSetUnderReview(app.id)}
                          disabled={isProcessing}
                          title="На розгляд"
                          className={`${styles.actionBtn} ${styles.actionBtnYellow}`}
                        >
                          <Clock className={styles.actionIcon} />
                        </button>
                      )}
                      {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') && (
                        <>
                          <button 
                            onClick={() => handleApprove(app.id)}
                            disabled={isProcessing}
                            title="Схвалити"
                            className={`${styles.actionBtn} ${styles.actionBtnGreen}`}
                          >
                            <CheckCircle className={styles.actionIcon} />
                          </button>
                          <button 
                            onClick={() => handleRejectClick(app)}
                            disabled={isProcessing}
                            title="Відхилити"
                            className={`${styles.actionBtn} ${styles.actionBtnRed}`}
                          >
                            <XCircle className={styles.actionIcon} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <FileText className={styles.emptyStateIcon} />
                    Немає заяв для розгляду
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {documentsApp && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Документи заявки</h3>
                <p className={styles.modalSubtitle}>
                  {documentsApp.student?.user?.lastName} {documentsApp.student?.user?.firstName} • {documentsApp.student?.studentIdNumber}
                </p>
              </div>
              <button
                onClick={() => setDocumentsApp(null)}
                className={styles.closeBtn}
              >
                <X className={styles.closeIcon} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {(!documentsApp.scanDocumentsUrl || documentsApp.scanDocumentsUrl.length === 0) ? (
                <div className={styles.emptyDocs}>
                  До цієї заявки не прикріплено документів.
                </div>
              ) : (
                documentsApp.scanDocumentsUrl.map((documentUrl: string, index: number) => {
                  const fullUrl = getDocumentUrl(documentUrl);
                  return (
                    <div key={`${documentUrl}-${index}`} className={styles.docItem}>
                      <div className={styles.docItemHeader}>
                        <div className={styles.docItemTitle}>
                          <div className={styles.docIconWrapper}>
                            <FileText className={styles.docIcon} />
                          </div>
                          <span className={styles.docName} title={documentUrl.split('/').pop()}>
                            {documentUrl.split('/').pop() || `Документ ${index + 1}`}
                          </span>
                        </div>
                        <a
                          href={fullUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className={styles.downloadBtn}
                        >
                          Завантажити
                        </a>
                      </div>
                      <div className={styles.docPreview}>
                        {isImageDocument(documentUrl) ? (
                          <img src={fullUrl} alt={`Документ ${index + 1}`} className={styles.imgPreview} />
                        ) : isPdfDocument(documentUrl) ? (
                          <iframe title={`Документ ${index + 1}`} src={fullUrl} className={styles.pdfPreview} />
                        ) : (
                          <div className={styles.noPreview}>
                            Попередній перегляд для цього типу файлу недоступний. Відкрийте документ в окремій вкладці.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal Overlay */}
      {isRejectModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.rejectModalContent}>
            <div className={styles.rejectModalHeader}>
              <h3 className={styles.rejectModalTitle}>Відхилення заяви</h3>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className={styles.closeBtn}
              >
                <X className={styles.closeIcon} />
              </button>
            </div>
            
            <div className={styles.rejectInfo}>
              Вкажіть причину відхилення заяви студента 
              <span className={styles.rejectName}> {selectedApp?.student?.user?.firstName} {selectedApp?.student?.user?.lastName}</span>. 
              Це повідомлення буде надіслано на пошту.
            </div>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Наприклад: Неякісна скан-копія..."
              className={styles.rejectTextarea}
            />

            <div className={styles.rejectActions}>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className={styles.btnCancel}
              >
                Скасувати
              </button>
              <button
                onClick={submitRejection}
                disabled={isProcessing || !rejectionReason.trim()}
                className={styles.btnReject}
              >
                {isProcessing ? 'Обробка...' : 'Відхилити заяву'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsReview;
