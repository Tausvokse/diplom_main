import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldAlert, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';


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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2">Управління доступом</h1>
        <p className="ui-muted text-sm">Створення нових облікових записів та перегляд існуючих співробітників</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="ui-card p-6 md:p-8 h-fit">
          <div className="flex items-center mb-8 text-red-500 bg-red-500/10 nm-inset-sm p-5 rounded-2xl">
            <ShieldAlert className="w-6 h-6 mr-4 flex-shrink-0" />
            <p className="text-sm font-medium leading-relaxed">
              <strong>Увага:</strong> Створення нового акаунту надає йому відповідний рівень доступу до системи.
            </p>
          </div>

          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Ім'я</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="ui-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Прізвище</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="ui-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Робочий Email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="ui-input w-full"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Роль</label>
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="ui-input w-full"
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
                  <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Гуртожиток</label>
                  <select 
                    name="dormitoryId"
                    value={formData.dormitoryId}
                    onChange={handleChange}
                    className="ui-input w-full"
                  >
                    {dormitories.map(dorm => (
                      <option key={dorm.id} value={dorm.id}>{dorm.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Первинний пароль</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="ui-input w-full"
              />
              <p className="text-xs ui-muted mt-2 font-medium">* Новий користувач зможе змінити його після входу.</p>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="ui-button ui-button-primary w-full h-14 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[rgb(var(--surface))] border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <UserPlus className="w-5 h-5 mr-3" />
              )}
              ДОДАТИ АДМІНІСТРАТОРА
            </button>
          </form>
        </div>

        <div className="ui-card overflow-hidden flex flex-col max-h-[800px]">
          <div className="px-6 py-6 border-b border-[rgb(var(--border)/0.2)] flex items-center bg-[rgb(var(--surface-2))] nm-inset-sm m-1 rounded-t-[31px]">
            <Users className="w-6 h-6 text-[rgb(var(--accent))] mr-3" />
            <h2 className="font-bold text-lg text-[rgb(var(--text))]">Існуючі адміністратори</h2>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-4">
            {admins.map(admin => (
              <div key={admin.id} className="p-5 nm-flat bg-[rgb(var(--surface))] rounded-2xl hover:nm-raised-sm transition-all flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-[rgb(var(--text))]">{admin.lastName} {admin.firstName}</h3>
                    <p className="text-xs font-medium text-[rgb(var(--muted))] mt-1">{admin.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 nm-inset-sm">
                    {getRoleLabel(admin.role)}
                  </span>
                  {admin.dormitory && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 nm-inset-sm">
                      {admin.dormitory.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {admins.length === 0 && (
              <div className="p-10 text-center text-[rgb(var(--muted))] nm-inset-sm bg-[rgb(var(--surface-2))] rounded-2xl font-medium">
                Не знайдено жодного адміністратора
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgb(var(--border)); border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default AdminUsers;
