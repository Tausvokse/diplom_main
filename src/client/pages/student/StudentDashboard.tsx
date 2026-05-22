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
        <div className="ui-card p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full nm-inset flex items-center justify-center mb-5 bg-[rgb(var(--surface-2))]">
            <AlertCircle className="w-10 h-10 text-[rgb(var(--muted))]" />
          </div>
          <h3 className="text-xl font-semibold text-[rgb(var(--text))] mb-3">Заява не подана</h3>
          <p className="text-sm ui-muted mb-8 max-w-sm">Ви ще не подали заяву на поселення в гуртожиток. Зробіть це зараз, щоб забронювати місце.</p>
          <button
            onClick={() => navigate('/student/application')}
            className="ui-button ui-button-primary px-8 py-3"
          >
            Подати заяву
          </button>
        </div>
      );
    }

    const statusConfig = {
      DRAFT: { icon: Clock, color: 'text-[rgb(var(--muted))]', bg: 'bg-[rgb(var(--surface))]', text: 'Чернетка' },
      SUBMITTED: { icon: Clock, color: 'text-[rgb(var(--accent))]', bg: 'bg-[rgb(var(--accent-soft))]', text: 'Подано' },
      UNDER_REVIEW: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'На розгляді' },
      APPROVED: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', text: 'Схвалено' },
      REJECTED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', text: 'Відхилено' },
    };

    const config = statusConfig[application.status];
    const StatusIcon = config.icon;

    const appTypeLabel = {
      CHECK_IN: 'на поселення',
      TRANSFER: 'на переселення',
      CHECK_OUT: 'на виселення'
    }[application.type as string] || '';

    return (
      <div className="ui-card p-6">
        <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-6">Статус вашої заяви {appTypeLabel}</h3>
        <div className={`flex items-center p-5 rounded-2xl nm-inset-sm ${config.bg}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-[rgb(var(--surface))] nm-raised-xs mr-4`}>
            <StatusIcon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase ui-muted mb-1">Поточний статус</p>
            <p className={`text-lg font-bold ${config.color}`}>{config.text}</p>
          </div>
        </div>
        {application.status === 'REJECTED' && application.rejectionReason && (
          <div className="mt-5 p-4 bg-red-50/50 dark:bg-red-900/10 nm-inset-sm rounded-xl border-l-4 border-red-500">
            <p className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300 mb-1.5">Причина відхилення:</p>
            <p className="text-sm text-red-600 dark:text-red-400">{application.rejectionReason}</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <Skeleton height={80} borderRadius={16} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Skeleton height={300} borderRadius={24} />
          <Skeleton height={300} borderRadius={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[rgb(var(--text))] mb-2 tracking-tight">Особистий кабінет студента</h1>
        <p className="text-sm ui-muted">Керуйте своїми заявами та налаштуваннями поселення</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Status Widget */}
        {renderApplicationStatus()}

        {/* Co-living Widget */}
        <div className="ui-card p-6 flex flex-col">
          <div className="flex items-center mb-5">
            <div className="w-10 h-10 rounded-xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))]">
              <Users className="w-5 h-5 text-[rgb(var(--accent))]" />
            </div>
            <h3 className="text-lg font-semibold text-[rgb(var(--text))]">Co-living (Мікро-групи)</h3>
          </div>
          <p className="text-sm ui-muted mb-6 leading-relaxed">
            Бажаєте жити з друзями? Створіть групу або приєднайтеся до існуючої за допомогою реферального коду. Система врахує це під час розподілу кімнат.
          </p>

          <div className="flex-1 flex flex-col justify-end">
            {group ? (
              <div className="space-y-4">
                <div className="p-5 nm-inset-sm bg-[rgb(var(--surface-2))] rounded-2xl">
                  <p className="text-[10px] text-[rgb(var(--accent))] font-bold uppercase tracking-widest mb-3">Ваша група</p>
                  <div className="flex items-center justify-between bg-[rgb(var(--surface))] nm-raised-xs p-2 pl-4 rounded-xl mb-5">
                    <span className="font-mono text-xl font-bold tracking-[0.2em] text-[rgb(var(--text))]">{group.code}</span>
                    <button
                      onClick={() => copyToClipboard(group.code)}
                      className="w-10 h-10 flex items-center justify-center text-[rgb(var(--accent))] nm-flat hover:nm-raised active:nm-inset-sm rounded-lg transition-all"
                      title="Скопіювати код"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[rgb(var(--text))] mb-3 uppercase tracking-wider">Учасники ({group.currentMembers}/{group.maxMembers}):</p>
                    <ul className="space-y-2">
                      {group.members.map(member => (
                        <li key={member.id} className="text-sm text-[rgb(var(--text))] flex items-center p-2.5 rounded-lg nm-flat bg-[rgb(var(--surface))]">
                          <CheckCircle className="w-4 h-4 text-[rgb(var(--accent))] mr-3" />
                          {member.user?.firstName} {member.user?.lastName} <span className="ui-muted ml-2 text-xs">({member.studentIdNumber})</span>
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
                    className="w-full flex items-center justify-center px-4 py-4 border-2 border-dashed border-[rgb(var(--border)/0.5)] text-[rgb(var(--text))] rounded-2xl nm-flat hover:nm-inset-sm hover:text-[rgb(var(--accent))] transition-all disabled:opacity-50 font-semibold"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {isGeneratingGroup ? 'Генерація...' : 'Створити нову групу'}
                  </button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-[rgb(var(--border)/0.5)]"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="px-4 bg-[rgb(var(--surface))] text-[rgb(var(--muted))] rounded-full nm-flat border border-[rgb(var(--surface))]">АБО</span>
                  </div>
                </div>

                <div className="bg-[rgb(var(--surface-2))] nm-inset-sm p-4 rounded-2xl">
                  <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-3">Приєднатися до групи</label>
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <InputMask
                      mask="******"
                      maskChar=""
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ВВЕДІТЬ КОД"
                      className="flex-1 ui-input uppercase font-mono text-center tracking-[0.2em] font-bold h-12"
                    />
                    <button
                      onClick={handleJoinGroup}
                      disabled={isJoiningGroup || !joinCode.trim()}
                      className="px-6 ui-button ui-button-primary h-12 disabled:opacity-50"
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
    </div>
  );
};

export default StudentDashboard;
