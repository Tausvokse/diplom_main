import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { api } from '../services/api';
import { Notification } from '../types';

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
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="ui-button ui-button-ghost rounded-full p-2 text-[rgb(var(--muted))] relative"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[rgb(var(--surface))]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 ui-card overflow-hidden z-50">
          <div className="flex justify-between items-center p-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-2))]">
            <h3 className="font-semibold text-[rgb(var(--text))]">Сповіщення</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))] flex items-center">
                <Check className="w-3 h-3 mr-1" />
                Прочитано всі
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-4 border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-2))] transition-colors cursor-pointer ${!n.isRead ? 'bg-[rgb(var(--accent-soft))]' : ''}`}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm ${!n.isRead ? 'font-semibold text-[rgb(var(--text))]' : 'font-medium text-[rgb(var(--muted))]'}`}>{n.title}</h4>
                    {!n.isRead && <span className="w-2 h-2 bg-[rgb(var(--accent))] rounded-full mt-1.5 flex-shrink-0"></span>}
                  </div>
                  <p className="text-xs text-[rgb(var(--muted))] line-clamp-2">{n.message}</p>
                  <span className="text-[10px] text-[rgb(var(--muted))] mt-2 block">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[rgb(var(--muted))]">
                <Bell className="w-8 h-8 mx-auto text-[rgb(var(--muted))] mb-2" />
                <p className="text-sm">Немає сповіщень</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
