import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Eye, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Application } from '../../types';
import { api } from '../../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
      case 'SUBMITTED': return <span className="ui-pill nm-inset-sm bg-blue-500/10 text-blue-500">Нова</span>;
      case 'UNDER_REVIEW': return <span className="ui-pill nm-inset-sm bg-yellow-500/10 text-yellow-500">На розгляді</span>;
      case 'APPROVED': return <span className="ui-pill nm-inset-sm bg-green-500/10 text-green-500">Схвалено</span>;
      case 'REJECTED': return <span className="ui-pill nm-inset-sm bg-red-500/10 text-red-500">Відхилено</span>;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={260} />
        <Skeleton height={260} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2">Розгляд заяв на поселення</h1>
        <p className="ui-muted text-sm">Перевірка документів та валідація пільгових категорій</p>
      </header>

      <div className="ui-card overflow-hidden transition-colors p-1">
        <div className="overflow-x-auto rounded-3xl bg-[rgb(var(--surface-2))] nm-inset-sm">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[rgb(var(--border)/0.2)]">
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Студент</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Факультет / Курс</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Пільги</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Тип</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Статус</th>
                <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border)/0.1)]">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-[rgb(var(--surface))] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-xl nm-raised bg-[rgb(var(--surface))] flex items-center justify-center text-[rgb(var(--accent))] font-bold mr-4">
                        {app.student?.user?.firstName[0]}{app.student?.user?.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[rgb(var(--text))]">{app.student?.user?.lastName} {app.student?.user?.firstName}</p>
                        <p className="text-xs font-medium text-[rgb(var(--muted))]">{app.student?.studentIdNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[rgb(var(--text))]">{app.student?.faculty}</p>
                    <p className="text-xs font-medium text-[rgb(var(--muted))]">{app.student?.course} курс</p>
                  </td>
                  <td className="px-6 py-4">
                    {app.student?.privilege ? (
                      <div className="flex items-center text-orange-500 font-bold bg-orange-500/10 px-3 py-1 rounded-lg nm-inset-sm w-fit text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        <span>{app.student.privilege.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-[rgb(var(--muted))] font-medium">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-[rgb(var(--text))] uppercase tracking-wider bg-[rgb(var(--surface))] nm-raised-xs px-3 py-1.5 rounded-lg">
                      {{ CHECK_IN: 'Поселення', CHECK_OUT: 'Виселення' }[app.type as string] || app.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(app.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-3">
                      <button 
                        onClick={() => setDocumentsApp(app)}
                        title="Переглянути документи"
                        className="w-9 h-9 flex items-center justify-center text-[rgb(var(--accent))] nm-flat hover:nm-inset-sm bg-[rgb(var(--surface))] rounded-xl transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') && (
                        <>
                          <button 
                            onClick={() => handleApprove(app.id)}
                            disabled={isProcessing}
                            title="Схвалити"
                            className="w-9 h-9 flex items-center justify-center text-green-500 nm-flat hover:nm-inset-sm bg-[rgb(var(--surface))] rounded-xl transition-all disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleRejectClick(app)}
                            disabled={isProcessing}
                            title="Відхилити"
                            className="w-9 h-9 flex items-center justify-center text-red-500 nm-flat hover:nm-inset-sm bg-[rgb(var(--surface))] rounded-xl transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-[rgb(var(--muted))] font-medium">
                    <FileText className="w-12 h-12 mx-auto opacity-30 mb-4" />
                    Немає заяв для розгляду
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {documentsApp && (
        <div className="nm-modal-backdrop p-4">
          <div className="nm-modal-content w-full max-w-4xl max-h-[90vh] animate-slideUp flex flex-col">
            <div className="px-6 py-5 border-b border-[rgb(var(--border)/0.2)] bg-[rgb(var(--surface-2))] flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-[rgb(var(--text))] mb-1">Документи заявки</h3>
                <p className="text-xs font-bold uppercase tracking-wider ui-muted">
                  {documentsApp.student?.user?.lastName} {documentsApp.student?.user?.firstName} • {documentsApp.student?.studentIdNumber}
                </p>
              </div>
              <button
                onClick={() => setDocumentsApp(null)}
                className="w-10 h-10 nm-flat hover:nm-inset-sm rounded-full flex items-center justify-center text-[rgb(var(--muted))] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {(!documentsApp.scanDocumentsUrl || documentsApp.scanDocumentsUrl.length === 0) ? (
                <div className="text-center py-16 nm-inset-sm bg-[rgb(var(--surface-2))] rounded-3xl text-[rgb(var(--muted))] font-medium">
                  До цієї заявки не прикріплено документів.
                </div>
              ) : (
                documentsApp.scanDocumentsUrl.map((documentUrl: string, index: number) => {
                  const fullUrl = getDocumentUrl(documentUrl);
                  return (
                    <div key={`${documentUrl}-${index}`} className="rounded-3xl border border-[rgb(var(--border)/0.3)] overflow-hidden nm-flat bg-[rgb(var(--surface))]">
                      <div className="flex items-center justify-between gap-3 px-6 py-4 bg-[rgb(var(--surface-2))] nm-inset-sm m-2 rounded-2xl">
                        <div className="flex items-center min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[rgb(var(--surface))] nm-raised-xs flex items-center justify-center mr-3 flex-shrink-0">
                            <FileText className="w-4 h-4 text-[rgb(var(--accent))]" />
                          </div>
                          <span className="text-sm font-bold text-[rgb(var(--text))] truncate" title={documentUrl.split('/').pop()}>
                            {documentUrl.split('/').pop() || `Документ ${index + 1}`}
                          </span>
                        </div>
                        <a
                          href={fullUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--accent))] hover:text-[rgb(var(--text))] px-4 py-2 bg-[rgb(var(--surface))] nm-raised hover:nm-inset-sm rounded-lg transition-all"
                        >
                          Завантажити
                        </a>
                      </div>
                      <div className="p-2">
                        {isImageDocument(documentUrl) ? (
                          <img src={fullUrl} alt={`Документ ${index + 1}`} className="w-full max-h-[520px] object-contain rounded-2xl nm-inset" />
                        ) : isPdfDocument(documentUrl) ? (
                          <iframe title={`Документ ${index + 1}`} src={fullUrl} className="w-full h-[520px] rounded-2xl nm-inset" />
                        ) : (
                          <div className="p-10 text-center text-sm font-medium ui-muted nm-inset bg-[rgb(var(--surface-2))] rounded-2xl">
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
        <div className="nm-modal-backdrop p-4">
          <div className="nm-modal-content w-full max-w-lg animate-slideUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[rgb(var(--text))]">Відхилення заяви</h3>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="w-10 h-10 nm-flat hover:nm-inset-sm rounded-full flex items-center justify-center text-[rgb(var(--muted))] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="nm-inset-sm bg-[rgb(var(--surface-2))] p-5 rounded-2xl mb-6 text-sm text-[rgb(var(--text))] leading-relaxed">
              Вкажіть причину відхилення заяви студента 
              <span className="font-bold text-[rgb(var(--accent))]"> {selectedApp?.student?.user?.firstName} {selectedApp?.student?.user?.lastName}</span>. 
              Це повідомлення буде надіслано на пошту.
            </div>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Наприклад: Неякісна скан-копія..."
              className="ui-input w-full h-32 mb-8 resize-none"
            />

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="ui-button ui-button-outline px-6"
              >
                Скасувати
              </button>
              <button
                onClick={submitRejection}
                disabled={isProcessing || !rejectionReason.trim()}
                className="ui-button bg-red-500 text-white hover:bg-red-600 px-6 disabled:opacity-50"
              >
                {isProcessing ? 'Обробка...' : 'Відхилити заяву'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgb(var(--border)); border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default ApplicationsReview;
