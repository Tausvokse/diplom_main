import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Plus, Users, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Application, GroupReferral } from '../../types';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import InputMask from 'react-input-mask';
import styles from './StudentDashboard.module.css';

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
        <div className={`ui-card ${styles.emptyStateCard}`}>
          <div className={`${styles.emptyStateIconBox} nm-inset`}>
            <AlertCircle className={styles.emptyStateIconSvg} />
          </div>
          <h3 className={styles.emptyStateTitle}>Заява не подана</h3>
          <p className={`ui-muted ${styles.emptyStateDesc}`}>Ви ще не подали заяву на поселення в гуртожиток. Зробіть це зараз, щоб забронювати місце.</p>
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
      CHECK_OUT: 'на виселення'
    }[application.type as string] || '';

    return (
      <div className={`ui-card ${styles.statusCard}`}>
        <h3 className={styles.statusTitle}>Статус вашої заяви {appTypeLabel}</h3>
        <div className={`${styles.statusBox} nm-inset-sm ${config.bg}`}>
          <div className={`${styles.statusIconBox} nm-raised-xs`}>
            <StatusIcon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div>
            <p className={styles.statusLabel}>Поточний статус</p>
            <p className={`${styles.statusValue} ${config.color}`}>{config.text}</p>
          </div>
        </div>
        {application.status === 'REJECTED' && application.rejectionReason && (
          <div className={`${styles.rejectionBox} nm-inset-sm`}>
            <p className={styles.rejectionLabel}>Причина відхилення:</p>
            <p className={styles.rejectionText}>{application.rejectionReason}</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton height={80} borderRadius={16} />
        <div className={styles.grid}>
          <Skeleton height={300} borderRadius={24} />
          <Skeleton height={300} borderRadius={24} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Особистий кабінет студента</h1>
        <p className={styles.pageSubtitle}>Керуйте своїми заявами та налаштуваннями поселення</p>
      </header>

      <div className={styles.grid}>
        {/* Application Status Widget */}
        {renderApplicationStatus()}

        {/* Co-living Widget */}
        <div className={`ui-card ${styles.colivingCard}`}>
          <div className={styles.colivingHeader}>
            <div className={`${styles.colivingIconBox} nm-raised`}>
              <Users className={styles.colivingIconSvg} />
            </div>
            <h3 className={styles.colivingTitle}>Co-living (Мікро-групи)</h3>
          </div>
          <p className={`ui-muted ${styles.colivingDesc}`}>
            Бажаєте жити з друзями? Створіть групу або приєднайтеся до існуючої за допомогою реферального коду. Система врахує це під час розподілу кімнат.
          </p>

          <div className={styles.colivingContent}>
            {group ? (
              <div className={styles.groupInfo}>
                <div className={`${styles.groupCodeBox} nm-inset-sm`}>
                  <p className={styles.groupCodeLabel}>Ваша група</p>
                  <div className={`${styles.groupCodeDisplay} nm-raised-xs`}>
                    <span className={styles.groupCodeText}>{group.code}</span>
                    <button
                      onClick={() => copyToClipboard(group.code)}
                      className={`${styles.copyButton} nm-flat hover:nm-raised active:nm-inset-sm`}
                      title="Скопіювати код"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <div>
                    <p className={styles.membersLabel}>Учасники ({group.currentMembers}/{group.maxMembers}):</p>
                    <ul className={styles.membersList}>
                      {group.members.map(member => (
                        <li key={member.id} className={`${styles.memberItem} nm-flat`}>
                          <CheckCircle className={styles.memberIconSvg} />
                          {member.user?.firstName} {member.user?.lastName} <span className={styles.memberId}>({member.studentIdNumber})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.groupActions}>
                <div>
                  <button
                    onClick={handleGenerateGroup}
                    disabled={isGeneratingGroup}
                    className={`${styles.generateButton} nm-flat hover:nm-inset-sm`}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {isGeneratingGroup ? 'Генерація...' : 'Створити нову групу'}
                  </button>
                </div>
                
                <div className={styles.divider}>
                  <div className={styles.dividerLineWrapper}>
                    <div className={styles.dividerLine}></div>
                  </div>
                  <div className={styles.dividerTextWrapper}>
                    <span className={`${styles.dividerText} nm-flat`}>АБО</span>
                  </div>
                </div>

                <div className={`${styles.joinBox} nm-inset-sm`}>
                  <label className={`ui-muted ${styles.joinLabel}`}>Приєднатися до групи</label>
                  <div className={styles.joinInputWrapper}>
                    <InputMask
                      mask="******"
                      maskChar=""
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ВВЕДІТЬ КОД"
                      className={`ui-input ${styles.joinInput}`}
                    />
                    <button
                      onClick={handleJoinGroup}
                      disabled={isJoiningGroup || !joinCode.trim()}
                      className={`ui-button ui-button-primary ${styles.joinButton}`}
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
