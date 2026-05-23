import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldAlert, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import styles from './AdminUsers.module.css';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  dormitoryId?: string;
  dormitory?: {
    name: string;
  };
  createdAt: string;
}

interface Dormitory {
  id: string;
  name: string;
}

export const AdminUsers: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'ADMIN_COMMANDANT',
    dormitoryId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/admin/users/admin');
      setAdmins(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDormitories = async () => {
    try {
      const response = await api.get('/admin/dormitories');
      setDormitories(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, dormitoryId: response.data[0].id }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchDormitories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast.error('Заповніть всі обов\'язкові поля');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/admin/users/admin', formData);
      toast.success('Нового адміністратора успішно створено!');
      setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'ADMIN_COMMANDANT', dormitoryId: dormitories[0]?.id || '' });
      fetchAdmins();
    } catch (error) {
      // Handled by api interceptor
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'ADMIN_CAMPUS': return 'Директор Студмістечка';
      case 'ADMIN_COMMANDANT': return 'Комендант';
      case 'ADMIN': return 'Адміністратор';
      case 'MASTER_SLESAR': return 'Слюсар';
      case 'MASTER_SANTEKHNIK': return 'Сантехнік';
      case 'MASTER_ELECTRIC': return 'Електрик';
      default: return role;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Управління доступом</h1>
        <p className={`ui-muted ${styles.subtitle}`}>Створення нових облікових записів та перегляд існуючих співробітників</p>
      </header>

      <div className={styles.grid}>
        <div className={`ui-card ${styles.formCard}`}>
          <div className={`nm-inset-sm ${styles.alert}`}>
            <ShieldAlert className={styles.alertIcon} />
            <p className={styles.alertText}>
              <strong>Увага:</strong> Створення нового акаунту надає йому відповідний рівень доступу до системи.
            </p>
          </div>

          <form onSubmit={handleCreateAdmin} className={styles.form}>
            <div className={styles.formGrid}>
              <div>
                <label className={`ui-muted ${styles.label}`}>Ім'я</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`ui-input ${styles.input}`}
                />
              </div>
              <div>
                <label className={`ui-muted ${styles.label}`}>Прізвище</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`ui-input ${styles.input}`}
                />
              </div>
            </div>

            <div>
              <label className={`ui-muted ${styles.label}`}>Робочий Email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`ui-input ${styles.input}`}
              />
            </div>
            
            <div className={styles.formGrid}>
              <div>
                <label className={`ui-muted ${styles.label}`}>Роль</label>
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`ui-input ${styles.input}`}
                >
                  <option value="ADMIN_COMMANDANT">Комендант</option>
                  <option value="ADMIN_CAMPUS">Директор Студмістечка</option>
                  <option value="MASTER_SLESAR">Слюсар</option>
                  <option value="MASTER_SANTEKHNIK">Сантехнік</option>
                  <option value="MASTER_ELECTRIC">Електрик</option>
                </select>
              </div>
              
              {formData.role === 'ADMIN_COMMANDANT' && (
                <div>
                  <label className={`ui-muted ${styles.label}`}>Гуртожиток</label>
                  <select 
                    name="dormitoryId"
                    value={formData.dormitoryId}
                    onChange={handleChange}
                    className={`ui-input ${styles.input}`}
                  >
                    {dormitories.map(dorm => (
                      <option key={dorm.id} value={dorm.id}>{dorm.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className={`ui-muted ${styles.label}`}>Первинний пароль</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`ui-input ${styles.input}`}
              />
              <p className={`ui-muted ${styles.helpText}`}>* Новий користувач зможе змінити його після входу.</p>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`ui-button ui-button-primary ${styles.submitButton}`}
            >
              {isLoading ? (
                <div className={styles.spinner}></div>
              ) : (
                <UserPlus className={styles.buttonIcon} />
              )}
              ДОДАТИ АДМІНІСТРАТОРА
            </button>
          </form>
        </div>

        <div className={`ui-card ${styles.listCard}`}>
          <div className={`nm-inset-sm ${styles.listHeader}`}>
            <Users className={styles.listIcon} />
            <h2 className={styles.listTitle}>Існуючі адміністратори</h2>
          </div>
          <div className={`${styles.listBody} ${styles.customScrollbar}`}>
            {admins.map(admin => (
              <div key={admin.id} className={`nm-flat hover:nm-raised-sm ${styles.adminItem}`}>
                <div className={styles.adminHeader}>
                  <div>
                    <h3 className={styles.adminName}>{admin.lastName} {admin.firstName}</h3>
                    <p className={styles.adminEmail}>{admin.email}</p>
                  </div>
                </div>
                <div className={styles.adminBadges}>
                  <span className={`nm-inset-sm ${styles.badgeRole}`}>
                    {getRoleLabel(admin.role)}
                  </span>
                  {admin.dormitory && (
                    <span className={`nm-inset-sm ${styles.badgeDorm}`}>
                      {admin.dormitory.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {admins.length === 0 && (
              <div className={`nm-inset-sm ${styles.emptyAdmins}`}>
                Не знайдено жодного адміністратора
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
