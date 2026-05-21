import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Eye, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Application } from '../../types';
import { api } from '../../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../components/ThemeProvider';

export const ApplicationsReview: React.FC = () => {
  const { theme } = useTheme();
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
      case 'SUBMITTED': return <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">Нова</span>;
      case 'UNDER_REVIEW': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs font-medium">На розгляді</span>;
      case 'APPROVED': return <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-medium">Схвалено</span>;
      case 'REJECTED': return <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs font-medium">Відхилено</span>;
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

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={260} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={260} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Розгляд заяв на поселення</h1>
        <p className="text-gray-500 dark:text-gray-400">Перевірка документів та валідація пільгових категорій</p>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Студент</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Факультет / Курс</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Пільги</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Тип</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold mr-3">
                        {app.student?.user?.firstName[0]}{app.student?.user?.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{app.student?.user?.lastName} {app.student?.user?.firstName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{app.student?.studentIdNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{app.student?.faculty}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{app.student?.course} курс</p>
                  </td>
                  <td className="px-6 py-4">
                    {app.student?.privilege ? (
                      <div className="flex items-center text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">{app.student.privilege.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ CHECK_IN: 'Поселення', TRANSFER: 'Переселення', CHECK_OUT: 'Виселення' }[app.type as string] || app.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(app.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => setDocumentsApp(app)}
                        title="Переглянути документи"
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') && (
                        <>
                          <button 
                            onClick={() => handleApprove(app.id)}
                            disabled={isProcessing}
                            title="Схвалити"
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleRejectClick(app)}
                            disabled={isProcessing}
                            title="Відхилити"
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    Немає заяв для розгляду
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {documentsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden animate-slideUp border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Документи заявки</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {documentsApp.student?.user?.lastName} {documentsApp.student?.user?.firstName} • {documentsApp.student?.studentIdNumber}
                </p>
              </div>
              <button
                onClick={() => setDocumentsApp(null)}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)] space-y-4">
              {documentsApp.scanDocumentsUrl.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                  До цієї заявки не прикріплено документів.
                </div>
              ) : (
                documentsApp.scanDocumentsUrl.map((documentUrl, index) => {
                  const fullUrl = getDocumentUrl(documentUrl);
                  return (
                    <div key={`${documentUrl}-${index}`} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={documentUrl.split('/').pop()}>
                            {documentUrl.split('/').pop() || `Документ ${index + 1}`}
                          </span>
                        </div>
                        <a
                          href={fullUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                        >
                          Завантажити
                        </a>
                      </div>
                      {isImageDocument(documentUrl) ? (
                        <img src={fullUrl} alt={`Документ ${index + 1}`} className="w-full max-h-[520px] object-contain bg-white dark:bg-gray-950" />
                      ) : isPdfDocument(documentUrl) ? (
                        <iframe title={`Документ ${index + 1}`} src={fullUrl} className="w-full h-[520px] bg-white" />
                      ) : (
                        <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
                          Попередній перегляд для цього типу файлу недоступний. Відкрийте документ в окремій вкладці.
                        </div>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden animate-slideUp p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Відхилення заяви</h3>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Будь ласка, вкажіть детальну причину відхилення заяви студента 
              <span className="font-semibold text-gray-900 dark:text-white"> {selectedApp?.student?.user?.firstName} {selectedApp?.student?.user?.lastName}</span>. 
              Це повідомлення буде надіслано йому на пошту та відображено в особистому кабінеті.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Наприклад: Неякісна скан-копія посвідчення пільговика, будь ласка, завантажте чітке фото."
              className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none mb-6"
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-5 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
              >
                Скасувати
              </button>
              <button
                onClick={submitRejection}
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 transition-colors font-medium disabled:opacity-50"
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
