import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AuthResponse } from '../../types';
import InputMask from 'react-input-mask';
import { AuthBackground } from '../../components/AuthBackground';
import { ShieldCheck } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user, _hasHydrated } = useAuthStore();
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

  React.useEffect(() => {
    if (_hasHydrated && isAuthenticated && user) {
      if (['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT'].includes(user.role)) {
        navigate('/admin/dormitories');
      } else {
        navigate('/student/dashboard');
      }
    }
  }, [_hasHydrated, isAuthenticated, user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.phone || !formData.studentIdNumber || !formData.faculty) {
      toast.error('Заповніть всі обов\'язкові поля');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Паролі не співпадають');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@(stud\.kai\.edu\.ua|npp\.kai\.edu\.ua)$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email повинен бути корпоративним (@stud.kai.edu.ua або @npp.kai.edu.ua)');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/send-verification-code', { email: formData.email });
      toast.success('Код підтвердження надіслано на вашу пошту!');
      setStep(2);
    } catch (error: any) {
      // API interceptor usually handles toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      toast.error('Введіть 6-значний код');
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
        faculty: formData.faculty,
        verificationCode
      });
      
      const { user, accessToken, refreshToken } = response.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Реєстрація успішна!');
      
      if (user.role === 'ADMIN') {
        navigate('/admin/dormitories');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      // Handled by api interceptor
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="flex items-center justify-center min-h-screen px-6 py-8">
        <div className="ui-card p-8 w-full max-w-md animate-fadeIn">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgb(var(--surface))] nm-raised mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="24" height="20" rx="3" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.8" />
                <rect x="4" y="8" width="24" height="6" rx="3" fill="rgb(var(--accent))" fillOpacity="0.15" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.6" />
                <rect x="9" y="18" width="5" height="5" rx="1" stroke="rgb(var(--accent))" strokeWidth="1.5" opacity="0.6" />
                <rect x="18" y="18" width="5" height="5" rx="1" stroke="rgb(var(--accent))" strokeWidth="1.5" opacity="0.6" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--text))] mb-2">
              {step === 1 ? 'Реєстрація' : 'Підтвердження Email'}
            </h1>
            <p className="text-sm ui-muted">
              {step === 1 ? 'Створіть свій кабінет' : `Код надіслано на ${formData.email}`}
            </p>
          </div>
          
          {step === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium ui-muted mb-1.5">Ім'я</label>
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
                  <label className="block text-sm font-medium ui-muted mb-1.5">Прізвище</label>
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
                <label className="block text-sm font-medium ui-muted mb-1.5">Телефон</label>
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
                  <label className="block text-sm font-medium ui-muted mb-1.5">Номер студентського/залікової</label>
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
                    <label className="block text-sm font-medium ui-muted mb-1.5">Курс</label>
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
                    <label className="block text-sm font-medium ui-muted mb-1.5">Факультет</label>
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
                <label className="block text-sm font-medium ui-muted mb-1.5 flex items-center justify-between">
                  <span>Email</span>
                  <span className="text-xs text-[rgb(var(--accent))]">Тільки @stud.kai.edu.ua або @npp.kai.edu.ua</span>
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@stud.kai.edu.ua"
                  className="ui-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium ui-muted mb-1.5">Пароль</label>
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
                <label className="block text-sm font-medium ui-muted mb-1.5">Підтвердіть пароль</label>
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
                className="w-full ui-button ui-button-primary py-3 mt-2"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Продовжити'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="nm-inset-sm p-6 rounded-2xl bg-[rgb(var(--surface))]">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full nm-flat flex items-center justify-center text-[rgb(var(--accent))]">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                </div>
                <label className="block text-sm font-medium text-center text-[rgb(var(--text))] mb-4">
                  Введіть 6-значний код з листа
                </label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="ui-input text-center text-2xl tracking-[0.5em] font-bold h-16"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="w-1/3 ui-button ui-button-outline py-3"
                >
                  Назад
                </button>
                <button 
                  type="submit"
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-2/3 ui-button ui-button-primary py-3"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : 'Підтвердити'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center text-sm ui-muted">
            Вже маєте акаунт?{' '}
            <Link to="/login" className="text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))] font-medium hover:underline">
              Увійти
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Register;
