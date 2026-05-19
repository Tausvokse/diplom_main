import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Eye, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Application } from '../../types';
import { api } from '../../services/api';

export const ApplicationsReview: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
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
      case 'SUBMITTED': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Нова</span>;
      case 'UNDER_REVIEW': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">На розгляді</span>;
      case 'APPROVED': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Схвалено</span>;
      case 'REJECTED': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Відхилено</span>;
      default: return null;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Завантаження...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Розгляд заяв на поселення</h1>
        <p className="text-gray-500">Перевірка документів та валідація пільгових категорій</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Студент</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Факультет / Курс</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Пільги</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-3">
                        {app.student?.user?.firstName[0]}{app.student?.user?.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{app.student?.user?.lastName} {app.student?.user?.firstName}</p>
                        <p className="text-xs text-gray-500">{app.student?.studentIdNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{app.student?.faculty}</p>
                    <p className="text-xs text-gray-500">{app.student?.course} курс</p>
                  </td>
                  <td className="px-6 py-4">
                    {app.student?.privilege ? (
                      <div className="flex items-center text-orange-600">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">{app.student.privilege.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(app.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        title="Переглянути документи"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {(app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW') && (
                        <>
                          <button 
                            onClick={() => handleApprove(app.id)}
                            disabled={isProcessing}
                            title="Схвалити"
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleRejectClick(app)}
                            disabled={isProcessing}
                            title="Відхилити"
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    Немає заяв для розгляду
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal Overlay */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Відхилення заяви</h3>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Будь ласка, вкажіть детальну причину відхилення заяви студента 
              <span className="font-semibold text-gray-900"> {selectedApp?.student?.user?.firstName} {selectedApp?.student?.user?.lastName}</span>. 
              Це повідомлення буде надіслано йому на пошту та відображено в особистому кабінеті.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Наприклад: Неякісна скан-копія посвідчення пільговика, будь ласка, завантажте чітке фото."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none mb-6"
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Скасувати
              </button>
              <button
                onClick={submitRejection}
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
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
