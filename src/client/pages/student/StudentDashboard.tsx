import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Plus, Users, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Application, GroupReferral } from '../../types';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [group, setGroup] = useState<GroupReferral | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingGroup, setIsGeneratingGroup] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      // In a real app, these endpoints would return the active application and group
      const [appRes, groupRes] = await Promise.all([
        api.get<Application>('/student/application').catch(() => null),
        api.get<GroupReferral>('/student/group').catch(() => null)
      ]);
      
      if (appRes && appRes.data) setApplication(appRes.data);
      if (groupRes && groupRes.data) setGroup(groupRes.data);
    } catch (error) {
      toast.error('Помилка завантаження даних дашборду');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleGenerateGroup = async () => {
    setIsGeneratingGroup(true);
    try {
      const res = await api.post<GroupReferral>('/student/group/create');
      setGroup(res.data);
      toast.success('Групу успішно створено!');
    } catch (error) {
      // Handled by interceptor, but we can catch to reset state
    } finally {
      setIsGeneratingGroup(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      toast.error('Введіть код групи');
      return;
    }
    setIsJoiningGroup(true);
    try {
      const res = await api.post<GroupReferral>('/student/group/join', { code: joinCode });
      setGroup(res.data);
      setJoinCode('');
      toast.success('Ви успішно приєдналися до групи!');
    } catch (error) {
      // Handled by interceptor
    } finally {
      setIsJoiningGroup(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Код скопійовано в буфер обміну!');
  };

  const renderApplicationStatus = () => {
    if (!application) {
      return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Заява не подана</h3>
          <p className="text-gray-500 mb-6">Ви ще не подали заяву на поселення в гуртожиток. Зробіть це зараз, щоб забронювати місце.</p>
          <button
            onClick={() => navigate('/student/application')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Подати заяву
          </button>
        </div>
      );
    }

    const statusConfig = {
      DRAFT: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50', text: 'Чернетка' },
      SUBMITTED: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', text: 'Подано' },
      UNDER_REVIEW: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', text: 'На розгляді' },
      APPROVED: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', text: 'Схвалено' },
      REJECTED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', text: 'Відхилено' },
    };

    const config = statusConfig[application.status];
    const StatusIcon = config.icon;

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статус вашої заяви</h3>
        <div className={`flex items-center p-4 rounded-lg ${config.bg}`}>
          <StatusIcon className={`w-8 h-8 ${config.color} mr-4`} />
          <div>
            <p className="text-sm text-gray-600 mb-1">Поточний статус</p>
            <p className={`font-bold ${config.color}`}>{config.text}</p>
          </div>
        </div>
        {application.status === 'REJECTED' && application.rejectionReason && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-800 font-medium mb-1">Причина відхилення:</p>
            <p className="text-sm text-red-600">{application.rejectionReason}</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Завантаження даних...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Особистий кабінет студента</h1>
        <p className="text-gray-500">Керуйте своїми заявами та налаштуваннями поселення</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Status Widget */}
        {renderApplicationStatus()}

        {/* Co-living Widget */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <Users className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Co-living (Мікро-групи)</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Бажаєте жити з друзями? Створіть групу або приєднайтеся до існуючої за допомогою реферального коду. Система врахує це під час розподілу кімнат.
          </p>

          {group ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">Ваша група</p>
                <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                  <span className="font-mono text-lg tracking-widest text-gray-800">{group.code}</span>
                  <button
                    onClick={() => copyToClipboard(group.code)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Скопіювати код"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-2">Учасники ({group.currentMembers}/{group.maxMembers}):</p>
                  <ul className="space-y-1">
                    {group.members.map(member => (
                      <li key={member.id} className="text-sm text-gray-600 flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        {member.user?.firstName} {member.user?.lastName} ({member.studentIdNumber})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <button
                  onClick={handleGenerateGroup}
                  disabled={isGeneratingGroup}
                  className="w-full flex items-center justify-center px-4 py-2 bg-white border-2 border-dashed border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {isGeneratingGroup ? 'Генерація...' : 'Створити нову групу'}
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">АБО</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Приєднатися до групи</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Введіть код групи"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase font-mono"
                  />
                  <button
                    onClick={handleJoinGroup}
                    disabled={isJoiningGroup || !joinCode.trim()}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {isJoiningGroup ? 'Вступ...' : 'Вступити'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
