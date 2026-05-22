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
        className="w-10 h-10 flex items-center justify-center rounded-xl text-[rgb(var(--muted))] relative transition-colors hover:text-[rgb(var(--text))] nm-raised-xs hover:nm-raised-sm active:nm-inset-sm"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full nm-raised-xs border border-white/20 dark:border-black/20"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 ui-card overflow-hidden z-50 p-1">
          <div className="flex justify-between items-center p-3 px-4 nm-inset-sm rounded-xl mb-1 bg-[rgb(var(--surface-2))]">
            <h3 className="font-semibold text-sm text-[rgb(var(--text))]">Сповіщення</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-[11px] text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))] flex items-center">
                <Check className="w-3 h-3 mr-1" />
                Прочитано всі
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((n, index) => (
                <div 
                  key={n.id} 
                  className={`p-3 mx-1 mb-1 rounded-lg transition-all cursor-pointer ${!n.isRead ? 'nm-inset-sm bg-[rgb(var(--surface))]' : 'hover:bg-[rgb(var(--surface-2))] nm-flat'}`}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm ${!n.isRead ? 'font-semibold text-[rgb(var(--accent))]' : 'font-medium text-[rgb(var(--text))]'}`}>{n.title}</h4>
                    {!n.isRead && <span className="w-2 h-2 bg-[rgb(var(--accent))] rounded-full mt-1.5 flex-shrink-0 nm-raised-xs"></span>}
                  </div>
                  <p className="text-xs text-[rgb(var(--muted))] line-clamp-2 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-[rgb(var(--muted))/0.8] mt-2 block">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[rgb(var(--muted))]">
                <Bell className="w-8 h-8 mx-auto text-[rgb(var(--muted))/0.5] mb-2" />
                <p className="text-sm">Немає сповіщень</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
