import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Megaphone, PiggyBank, Send } from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMsg, setNotificationMsg] = useState('');
  const [jarTitle, setJarTitle] = useState('');
  const [jarGoal, setJarGoal] = useState('');
  const [jarDesc, setJarDesc] = useState('');
  const [monobankUrl, setMonobankUrl] = useState('');
  const [dormitoryId, setDormitoryId] = useState('');
  const [dormitories, setDormitories] = useState<any[]>([]);

  useEffect(() => {
    const fetchDormitories = async () => {
      try {
        const res = await api.get('/admin/dormitories');
        setDormitories(res.data);
      } catch (err) {
        console.error('Error fetching dormitories:', err);
      }
    };
    fetchDormitories();
  }, []);

  const handleSendMassNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/notifications/mass', { title: notificationTitle, message: notificationMsg });
      toast.success('Повідомлення надіслано успішно');
      setNotificationTitle('');
      setNotificationMsg('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка при надсиланні повідомлення');
    }
  };

  const handleCreateJar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/jars', {
        title: jarTitle,
        goalAmount: Number(jarGoal),
        description: jarDesc,
        dormitoryId,
        monobankUrl
      });
      toast.success('Банку створено успішно');
      setJarTitle('');
      setJarGoal('');
      setJarDesc('');
      setMonobankUrl('');
      setDormitoryId('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка при створенні банки');
    }
  };
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2">Оголошення та збори</h1>
        <p className="ui-muted text-sm">Керування масовими розсилками та благодійними зборами</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="ui-card p-6 md:p-8 flex flex-col h-full">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 rounded-2xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))] text-blue-500">
              <Megaphone className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[rgb(var(--text))]">Масове повідомлення</h2>
          </div>
          
          <form onSubmit={handleSendMassNotification} className="space-y-6 flex-1 flex flex-col">
            <div className="nm-inset-sm bg-[rgb(var(--surface-2))] p-6 rounded-3xl space-y-5 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Заголовок</label>
                <input
                  type="text"
                  required
                  className="ui-input w-full bg-[rgb(var(--surface))]"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Увага, студенти..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Текст повідомлення</label>
                <textarea
                  required
                  rows={6}
                  className="ui-input w-full bg-[rgb(var(--surface))] resize-none"
                  value={notificationMsg}
                  onChange={(e) => setNotificationMsg(e.target.value)}
                  placeholder="Введіть текст повідомлення для всіх студентів..."
                />
              </div>
            </div>
            <button
              type="submit"
              className="ui-button ui-button-primary w-full h-14 mt-4"
            >
              <Send className="w-5 h-5 mr-3" />
              НАДІСЛАТИ ВСІМ
            </button>
          </form>
        </div>

        <div className="ui-card p-6 md:p-8 flex flex-col h-full">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 rounded-2xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))] text-pink-500">
              <PiggyBank className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[rgb(var(--text))]">Створити банку (Збір)</h2>
          </div>
          
          <form onSubmit={handleCreateJar} className="space-y-6 flex-1 flex flex-col">
            <div className="nm-inset-sm bg-[rgb(var(--surface-2))] p-6 rounded-3xl space-y-5 flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Назва збору</label>
                <input
                  type="text"
                  required
                  className="ui-input w-full bg-[rgb(var(--surface))]"
                  value={jarTitle}
                  onChange={(e) => setJarTitle(e.target.value)}
                  placeholder="На дрони..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Цільова сума (₴)</label>
                <input
                  type="number"
                  required
                  className="ui-input w-full bg-[rgb(var(--surface))]"
                  value={jarGoal}
                  onChange={(e) => setJarGoal(e.target.value)}
                  placeholder="10000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Опис збору</label>
                <textarea
                  required
                  rows={3}
                  className="ui-input w-full bg-[rgb(var(--surface))] resize-none"
                  value={jarDesc}
                  onChange={(e) => setJarDesc(e.target.value)}
                  placeholder="Опишіть мету збору..."
                ></textarea>
                </div>
                <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Посилання на Monobank (необов'язково)</label>
                <input
                  type="text"
                  className="ui-input w-full bg-[rgb(var(--surface))]"
                  value={monobankUrl}
                  onChange={(e) => setMonobankUrl(e.target.value)}
                  placeholder="https://send.monobank.ua/jar/..."
                />
                <p className="text-[10px] ui-muted mt-2">Якщо вказано, сума та транзакції будуть синхронізуватися автоматично</p>
                </div>
                <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Для кого цей збір?</label>
                <select
                  required
                  className="ui-input w-full bg-[rgb(var(--surface))]"
                  value={dormitoryId}
                  onChange={(e) => setDormitoryId(e.target.value)}
                >
                  <option value="">Глобальний збір (всім гуртожиткам)</option>
                  {dormitories.map((dorm: any) => (
                    <option key={dorm.id} value={dorm.id}>
                      Гуртожиток: {dorm.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] ui-muted mt-2">Глобальні збори бачать всі студенти системи</p>
                </div>            </div>
            <button
              type="submit"
              className="w-full h-14 mt-4 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-2xl font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-[0_4px_20px_rgba(236,72,153,0.3)] flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0"
            >
              ОПУБЛІКУВАТИ ЗБІР
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
