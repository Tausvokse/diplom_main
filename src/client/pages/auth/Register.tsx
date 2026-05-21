import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AuthResponse } from '../../types';
import InputMask from 'react-input-mask';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentIdNumber: '',
    course: '1',
    faculty: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.phone || !formData.studentIdNumber || !formData.faculty) {
      toast.error('Заповніть всі обов\'язкові поля');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Паролі не співпадають');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/register', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        studentIdNumber: formData.studentIdNumber,
        course: parseInt(formData.course, 10),
        faculty: formData.faculty
      });
      
      const { user, accessToken, refreshToken } = response.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Реєстрація успішна!');
      navigate('/student/dashboard');
    } catch (error: any) {
      // Handled by api
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen ui-shell px-6">
      <div className="ui-card p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[rgb(var(--text))] mb-2">Реєстрація</h1>
          <p className="text-sm ui-muted">Створіть кабінет студента</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium ui-muted mb-1">Ім'я</label>
              <input 
                type="text" 
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Іван"
                className="ui-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium ui-muted mb-1">Прізвище</label>
              <input 
                type="text" 
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Студент"
                className="ui-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium ui-muted mb-1">Телефон</label>
            <InputMask
              mask="+380 (99) 999-99-99"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+380 (__) ___-__-__"
              className="ui-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium ui-muted mb-1">Номер студентського/залікової</label>
              <input 
                type="text" 
                name="studentIdNumber"
                value={formData.studentIdNumber}
                onChange={handleChange}
                placeholder="КВ12345678"
                className="ui-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium ui-muted mb-1">Курс</label>
                <select 
                  name="course"
                  value={formData.course}
                  onChange={(e: any) => handleChange(e)}
                  className="ui-input"
                >
                  {[1,2,3,4,5,6].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium ui-muted mb-1">Факультет</label>
                <input 
                  type="text" 
                  name="faculty"
                  value={formData.faculty}
                  onChange={handleChange}
                  placeholder="ФІОТ"
                  className="ui-input"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium ui-muted mb-1">Email</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@uni.edu"
              className="ui-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium ui-muted mb-1">Пароль</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="ui-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium ui-muted mb-1">Підтвердіть пароль</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="ui-input"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full ui-button ui-button-primary mt-2 disabled:opacity-50"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Створити акаунт'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm ui-muted">
          Вже маєте акаунт?{' '}
          <Link to="/login" className="text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))] font-medium hover:underline">
            Увійти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
