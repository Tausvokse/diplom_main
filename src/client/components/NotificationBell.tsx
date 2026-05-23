import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, CreditCard, AlertTriangle, Wrench, FileText, CheckCircle, Clock } from 'lucide-react';
import { api } from '../services/api';
import { Notification } from '../types';
import styles from './NotificationBell.module.css';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'PAYMENT_REMINDER': return <CreditCard className={styles.typeIcon} style={{ color: '#eab308' }} />;
    case 'COMPLAINT_ALERT': return <AlertTriangle className={styles.typeIcon} style={{ color: '#ef4444' }} />;
    case 'REPAIR_UPDATE': return <Wrench className={styles.typeIcon} style={{ color: '#3b82f6' }} />;
    case 'APPLICATION_UPDATE': return <FileText className={styles.typeIcon} style={{ color: '#6366f1' }} />;
    case 'ALLOCATION_RESULT': return <CheckCircle className={styles.typeIcon} style={{ color: '#22c55e' }} />;
    default: return <Info className={styles.typeIcon} style={{ color: 'rgb(var(--muted))' }} />;
  }
};

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/student/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/student/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/student/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={styles.relative} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={styles.bellButton}
        aria-label="Сповіщення"
      >
        <Bell className={styles.icon} />
        {unreadCount > 0 && (
          <span className={styles.badge}></span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3 className={styles.title}>Сповіщення</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className={styles.markReadBtn}>
                <Check className={styles.markReadIcon} />
                Прочитати всі
              </button>
            )}
          </div>
          <div className={styles.list}>
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`${styles.item} ${!n.isRead ? styles.itemUnread : styles.itemRead}`}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div className={styles.itemHeader}>
                    <div className={styles.itemTitleGroup}>
                      {getNotificationIcon(n.type)}
                      <h4 className={`${styles.itemTitle} ${!n.isRead ? styles.itemTitleUnread : styles.itemTitleRead}`}>
                        {n.title}
                      </h4>
                    </div>
                    {!n.isRead && <span className={styles.unreadDot}></span>}
                  </div>
                  <p className={styles.message}>{n.message}</p>
                  <div className={styles.footer}>
                    <Clock className={styles.clockIcon} />
                    <span className={styles.date}>
                      {new Date(n.createdAt).toLocaleString('uk-UA', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <Bell className={styles.emptyIcon} />
                <p className={styles.emptyText}>У вас поки немає сповіщень</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

