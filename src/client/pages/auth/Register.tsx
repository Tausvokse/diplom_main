import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AuthResponse } from '../../types';
import InputMask from 'react-input-mask';
import { AuthBackground } from '../../components/AuthBackground';
import { ShieldCheck } from 'lucide-react';
import styles from './Register.module.css';

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
    faculty: '',
    gender: 'MALE'
  });

  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1 = form, 2 = code verification
  const [isLoading, setIsLoading] = useState(false);

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
        gender: formData.gender,
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
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.logoBadge}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="24" height="20" rx="3" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.8" />
                <rect x="4" y="8" width="24" height="6" rx="3" fill="rgb(var(--accent))" fillOpacity="0.15" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.6" />
                <rect x="9" y="18" width="5" height="5" rx="1" stroke="rgb(var(--accent))" strokeWidth="1.5" opacity="0.6" />
                <rect x="18" y="18" width="5" height="5" rx="1" stroke="rgb(var(--accent))" strokeWidth="1.5" opacity="0.6" />
              </svg>
            </div>
            <h1 className={styles.title}>
              {step === 1 ? 'Реєстрація' : 'Підтвердження Email'}
            </h1>
            <p className={styles.subtitle}>
              {step === 1 ? 'Створіть свій кабінет' : `Код надіслано на ${formData.email}`}
            </p>
          </div>
          
          {step === 1 ? (
            <form onSubmit={handleSendCode} className={styles.form}>
              <div className={styles.grid}>
                <div>
                  <label className={styles.label}>Ім'я</label>
                  <input 
                    type="text" 
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Іван"
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Прізвище</label>
                  <input 
                    type="text" 
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Студент"
                    className={styles.input}
                  />
                </div>
              </div>

              <div>
                <label className={styles.label}>Телефон</label>
                <InputMask
                  mask="+380 (99) 999-99-99"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+380 (__) ___-__-__"
                  className={styles.input}
                />
              </div>

              <div className={styles.grid}>
                <div>
                  <label className={styles.label}>Номер студентського/залікової</label>
                  <input 
                    type="text" 
                    name="studentIdNumber"
                    value={formData.studentIdNumber}
                    onChange={handleChange}
                    placeholder="КВ12345678"
                    className={styles.input}
                  />
                </div>
                <div className={styles.grid}>
                  <div>
                    <label className={styles.label}>Курс</label>
                    <select 
                      name="course"
                      value={formData.course}
                      onChange={(e: any) => handleChange(e)}
                      className={styles.input}
                    >
                      {[1,2,3,4,5,6].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={styles.label}>Факультет</label>
                    <input 
                      type="text" 
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleChange}
                      placeholder="АКФ"
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={styles.label}>Стать</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="gender" 
                      value="MALE" 
                      checked={formData.gender === 'MALE'} 
                      onChange={handleChange} 
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>Чоловіча</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="gender" 
                      value="FEMALE" 
                      checked={formData.gender === 'FEMALE'} 
                      onChange={handleChange} 
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>Жіноча</span>
                  </label>
                </div>
              </div>

              <div>
                <label className={`${styles.label} ${styles.labelWithHint}`}>
                  <span>Email</span>
                  <span className={styles.hint}>Тільки @stud.kai.edu.ua або @npp.kai.edu.ua</span>
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@stud.kai.edu.ua"
                  className={styles.input}
                />
              </div>
              
              <div>
                <label className={styles.label}>Пароль</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>Підтвердіть пароль</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={styles.input}
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className={styles.button}
              >
                {isLoading ? <div className={styles.spinner}></div> : 'Продовжити'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className={styles.formVerify}>
              <div className={styles.verificationContainer}>
                <div className={styles.shieldWrapper}>
                  <div className={styles.shieldIconBg}>
                    <ShieldCheck className={styles.shieldIcon} />
                  </div>
                </div>
                <label className={styles.verificationLabel}>
                  Введіть 6-значний код з листа
                </label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={`${styles.input} ${styles.verificationInput}`}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className={`${styles.button} ${styles.buttonOutline} ${styles.buttonHalf}`}
                >
                  Назад
                </button>
                <button 
                  type="submit"
                  disabled={isLoading || verificationCode.length !== 6}
                  className={`${styles.button} ${styles.buttonTwoThirds}`}
                >
                  {isLoading ? <div className={`${styles.spinner} ${styles.spinnerCenter}`}></div> : 'Підтвердити'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.footer}>
            Вже маєте акаунт?{' '}
            <Link to="/login" className={styles.link}>
              Увійти
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Register;
