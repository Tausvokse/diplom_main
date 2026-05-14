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
      default: return role;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Управління доступом</h1>
        <p className="text-gray-500">Створення нових облікових записів та перегляд існуючих адміністраторів</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
          <div className="flex items-center mb-6 text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
            <ShieldAlert className="w-6 h-6 mr-3 flex-shrink-0" />
            <p className="text-sm">
              <strong>Увага:</strong> Створення нового адміністратора надає йому відповідний рівень доступу до системи.
            </p>
          </div>

          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ім'я</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Прізвище</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Робочий Email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="ADMIN_COMMANDANT">Комендант</option>
                  <option value="ADMIN_CAMPUS">Директор Студмістечка</option>
                </select>
              </div>
              
              {formData.role === 'ADMIN_COMMANDANT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Гуртожиток</label>
                  <select 
                    name="dormitoryId"
                    value={formData.dormitoryId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {dormitories.map(dorm => (
                      <option key={dorm.id} value={dorm.id}>{dorm.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Первинний пароль</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Новий користувач зможе змінити його після входу.</p>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <UserPlus className="w-5 h-5 mr-2" />
              )}
              Додати адміністратора
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center bg-gray-50">
            <Users className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="font-semibold text-gray-900">Існуючі адміністратори</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {admins.map(admin => (
              <div key={admin.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{admin.firstName} {admin.lastName}</h3>
                    <p className="text-sm text-gray-500">{admin.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getRoleLabel(admin.role)}
                      </span>
                      {admin.dormitory && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {admin.dormitory.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {admins.length === 0 && (
              <div className="p-8 text-center text-gray-500">
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
