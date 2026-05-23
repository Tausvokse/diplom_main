import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Megaphone, PiggyBank, Send } from 'lucide-react';
import styles from './AdminAnnouncementsPage.module.css';

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
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Оголошення та збори</h1>
        <p className={`ui-muted ${styles.subtitle}`}>Керування масовими розсилками та благодійними зборами</p>
      </header>

      <div className={styles.grid}>
        <div className={`ui-card ${styles.card}`}>
          <div className={styles.cardHeader}>
            <div className={`nm-raised ${styles.iconWrapperMegaphone}`}>
              <Megaphone className={styles.icon} />
            </div>
            <h2 className={styles.cardTitle}>Масове повідомлення</h2>
          </div>
          
          <form onSubmit={handleSendMassNotification} className={styles.form}>
            <div className={`nm-inset-sm ${styles.formContainer}`}>
              <div>
                <label className={`ui-muted ${styles.label}`}>Заголовок</label>
                <input
                  type="text"
                  required
                  className={`ui-input ${styles.input}`}
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Увага, студенти..."
                />
              </div>
              <div>
                <label className={`ui-muted ${styles.label}`}>Текст повідомлення</label>
                <textarea
                  required
                  rows={6}
                  className={`ui-input ${styles.textarea}`}
                  value={notificationMsg}
                  onChange={(e) => setNotificationMsg(e.target.value)}
                  placeholder="Введіть текст повідомлення для всіх студентів..."
                />
              </div>
            </div>
            <button
              type="submit"
              className={`ui-button ui-button-primary ${styles.submitButton}`}
            >
              <Send className={styles.buttonIcon} />
              НАДІСЛАТИ ВСІМ
            </button>
          </form>
        </div>

        <div className={`ui-card ${styles.card}`}>
          <div className={styles.cardHeader}>
            <div className={`nm-raised ${styles.iconWrapperPiggyBank}`}>
              <PiggyBank className={styles.icon} />
            </div>
            <h2 className={styles.cardTitle}>Створити банку (Збір)</h2>
          </div>
          
          <form onSubmit={handleCreateJar} className={styles.form}>
            <div className={`nm-inset-sm ${styles.formContainer}`}>
              <div>
                <label className={`ui-muted ${styles.label}`}>Назва збору</label>
                <input
                  type="text"
                  required
                  className={`ui-input ${styles.input}`}
                  value={jarTitle}
                  onChange={(e) => setJarTitle(e.target.value)}
                  placeholder="На дрони..."
                />
              </div>
              <div>
                <label className={`ui-muted ${styles.label}`}>Цільова сума (₴)</label>
                <input
                  type="number"
                  required
                  className={`ui-input ${styles.input}`}
                  value={jarGoal}
                  onChange={(e) => setJarGoal(e.target.value)}
                  placeholder="10000"
                />
              </div>
              <div>
                <label className={`ui-muted ${styles.label}`}>Опис збору</label>
                <textarea
                  required
                  rows={3}
                  className={`ui-input ${styles.textarea}`}
                  value={jarDesc}
                  onChange={(e) => setJarDesc(e.target.value)}
                  placeholder="Опишіть мету збору..."
                ></textarea>
                </div>
                <div>
                <label className={`ui-muted ${styles.label}`}>Посилання на Monobank (необов'язково)</label>
                <input
                  type="text"
                  className={`ui-input ${styles.input}`}
                  value={monobankUrl}
                  onChange={(e) => setMonobankUrl(e.target.value)}
                  placeholder="https://send.monobank.ua/jar/..."
                />
                <p className={`ui-muted ${styles.helpText}`}>Якщо вказано, сума та транзакції будуть синхронізуватися автоматично</p>
                </div>
                <div>
                <label className={`ui-muted ${styles.label}`}>Для кого цей збір?</label>
                <select
                  required
                  className={`ui-input ${styles.input}`}
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
                <p className={`ui-muted ${styles.helpText}`}>Глобальні збори бачать всі студенти системи</p>
                </div>            </div>
            <button
              type="submit"
              className={styles.publishButton}
            >
              ОПУБЛІКУВАТИ ЗБІР
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
