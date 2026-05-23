import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Megaphone, PiggyBank, Send, Trash2 } from 'lucide-react';
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
  const [jars, setJars] = useState<any[]>([]);

  const fetchJars = useCallback(async () => {
    try {
      const res = await api.get('/admin/jars');
      setJars(res.data);
    } catch (err) {
      console.error('Error fetching jars:', err);
    }
  }, []);

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
    fetchJars();
  }, [fetchJars]);

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
      fetchJars();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка при створенні банки');
    }
  };

  const handleDeleteJar = async (id: string) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей збір?')) return;
    try {
      await api.delete(`/admin/jars/${id}`);
      toast.success('Збір видалено');
      fetchJars();
    } catch (err: any) {
      toast.error('Помилка при видаленні збору');
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

      <div className={`ui-card ${styles.jarsSection}`}>
        <h2 className={styles.jarsTitle}>Наявні збори</h2>
        <div className={styles.jarsList}>
          {jars.length === 0 ? (
            <p className={`ui-muted ${styles.emptyText}`}>Активних зборів не знайдено</p>
          ) : (
            jars.map((jar) => (
              <div key={jar.id} className={`nm-flat ${styles.jarItem}`}>
                <div className={styles.jarInfo}>
                  <h3 className={styles.jarName}>{jar.title}</h3>
                  <p className={`ui-muted ${styles.jarDesc}`}>{jar.description}</p>
                  <div className={styles.jarMeta}>
                    <span>Ціль: {jar.goalAmount} ₴</span>
                    <span className={styles.jarSeparator}>|</span>
                    <span>{jar.dormitory ? `Гуртожиток: ${jar.dormitory.name}` : 'Глобальний'}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteJar(jar.id)}
                  className={`nm-raised ${styles.deleteButton}`}
                  title="Видалити збір"
                >
                  <Trash2 className={styles.deleteIcon} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
