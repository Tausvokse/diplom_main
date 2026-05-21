import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Plus, Users, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Application, GroupReferral } from '../../types';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import InputMask from 'react-input-mask';

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
      const res = await api.get('/student/dashboard', { _silent: true } as any);
      if (res.data.application) setApplication(res.data.application);
      if (res.data.group) setGroup(res.data.group);
    } catch (error) {
      console.warn('Дані дашборду не знайдено або помилка', error);
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
        <div className="ui-card p-5 flex flex-col items-center text-center transition-colors">
          <AlertCircle className="w-12 h-12 text-[rgb(var(--muted))] mb-4" />
          <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-2">Заява не подана</h3>
          <p className="text-sm ui-muted mb-6">Ви ще не подали заяву на поселення в гуртожиток. Зробіть це зараз, щоб забронювати місце.</p>
          <button
            onClick={() => navigate('/student/application')}
            className="ui-button ui-button-primary px-6"
          >
            Подати заяву
          </button>
        </div>
      );
    }

    const statusConfig = {
      DRAFT: { icon: Clock, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700', text: 'Чернетка' },
      SUBMITTED: { icon: Clock, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'Подано' },
      UNDER_REVIEW: { icon: Clock, color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'На розгляді' },
      APPROVED: { icon: CheckCircle, color: 'text-green-500 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', text: 'Схвалено' },
      REJECTED: { icon: XCircle, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', text: 'Відхилено' },
    };

    const config = statusConfig[application.status];
    const StatusIcon = config.icon;

    const appTypeLabel = {
      CHECK_IN: 'на поселення',
      TRANSFER: 'на переселення',
      CHECK_OUT: 'на виселення'
    }[application.type as string] || '';

    return (
      <div className="ui-card p-5 transition-colors">
        <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-4">Статус вашої заяви {appTypeLabel}</h3>
        <div className={`flex items-center p-4 rounded-lg ${config.bg}`}>
          <StatusIcon className={`w-8 h-8 ${config.color} mr-4`} />
          <div>
            <p className="text-sm ui-muted mb-1">Поточний статус</p>
            <p className={`font-bold ${config.color}`}>{config.text}</p>
          </div>
        </div>
        {application.status === 'REJECTED' && application.rejectionReason && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-1">Причина відхилення:</p>
            <p className="text-sm text-red-600 dark:text-red-400">{application.rejectionReason}</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-5 space-y-6">
        <Skeleton height={80} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Skeleton height={200} />
          <Skeleton height={200} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[rgb(var(--text))]">Особистий кабінет студента</h1>
        <p className="text-sm ui-muted">Керуйте своїми заявами та налаштуваннями поселення</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Application Status Widget */}
        {renderApplicationStatus()}

        {/* Co-living Widget */}
        <div className="ui-card p-5 transition-colors">
          <div className="flex items-center mb-4">
            <Users className="w-6 h-6 text-[rgb(var(--accent))] mr-2" />
            <h3 className="text-lg font-semibold text-[rgb(var(--text))]">Co-living (Мікро-групи)</h3>
          </div>
          <p className="text-sm ui-muted mb-6">
            Бажаєте жити з друзями? Створіть групу або приєднайтеся до існуючої за допомогою реферального коду. Система врахує це під час розподілу кімнат.
          </p>

          {group ? (
            <div className="space-y-4">
              <div className="p-4 bg-[rgb(var(--accent-soft))] rounded-lg border border-[rgb(var(--accent))]">
                <p className="text-xs text-[rgb(var(--accent))] font-bold uppercase tracking-wider mb-2">Ваша група</p>
                <div className="flex items-center justify-between bg-[rgb(var(--surface))] p-3 rounded border border-[rgb(var(--border))]">
                  <span className="font-mono text-lg tracking-widest text-[rgb(var(--text))]">{group.code}</span>
                  <button
                    onClick={() => copyToClipboard(group.code)}
                    className="p-2 text-[rgb(var(--accent))] hover:bg-[rgb(var(--surface-2))] rounded transition-colors"
                    title="Скопіювати код"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-[rgb(var(--text))] mb-2">Учасники ({group.currentMembers}/{group.maxMembers}):</p>
                  <ul className="space-y-1">
                    {group.members.map(member => (
                      <li key={member.id} className="text-sm ui-muted flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 mr-2" />
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
                  className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-[rgb(var(--border))] text-[rgb(var(--text))] rounded-lg hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] transition-colors disabled:opacity-50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {isGeneratingGroup ? 'Генерація...' : 'Створити нову групу'}
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[rgb(var(--border))]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[rgb(var(--surface))] ui-muted">АБО</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium ui-muted mb-2">Приєднатися до групи</label>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <InputMask
                    mask="******"
                    maskChar=""
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Код групи (6 символів)"
                    className="flex-1 ui-input uppercase font-mono"
                  />
                  <button
                    onClick={handleJoinGroup}
                    disabled={isJoiningGroup || !joinCode.trim()}
                    className="px-6 ui-button ui-button-primary disabled:opacity-50"
                  >
                    {isJoiningGroup ? 'Приєднання...' : 'Приєднатися'}
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
