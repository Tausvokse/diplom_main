import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AuthResponse } from '../../types';
import { AuthBackground } from '../../components/AuthBackground';
import styles from './Login.module.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user, _hasHydrated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (_hasHydrated && isAuthenticated && user) {
      if (['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT'].includes(user.role)) {
        navigate('/admin/dormitories');
      } else if (['MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC'].includes(user.role)) {
        navigate('/master/repairs');
      } else {
        navigate('/student/dashboard');
      }
    }
  }, [_hasHydrated, isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Будь ласка, введіть email та пароль');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      setAuth(user, accessToken, refreshToken);
      toast.success(`Вітаємо, ${user.firstName}!`);
      
      if (['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT'].includes(user.role)) {
        navigate('/admin/dormitories');
      } else if (['MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC'].includes(user.role)) {
        navigate('/master/repairs');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      // toast is handled by api interceptor mostly
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            {/* Neumorphic logo badge */}
            <div className={styles.logoBadge}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="24" height="20" rx="3" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.8" />
                <rect x="4" y="8" width="24" height="6" rx="3" fill="rgb(var(--accent))" fillOpacity="0.15" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.6" />
                <rect x="9" y="18" width="5" height="5" rx="1" stroke="rgb(var(--accent))" strokeWidth="1.5" opacity="0.6" />
                <rect x="18" y="18" width="5" height="5" rx="1" stroke="rgb(var(--accent))" strokeWidth="1.5" opacity="0.6" />
              </svg>
            </div>
            <h1 className={styles.title}>Вхід до системи</h1>
            <p className={styles.subtitle}>Авторизуйтеся для доступу до кабінету</p>
          </div>
          
          <form onSubmit={handleLogin} className={styles.form}>
            <div>
              <label className={styles.label}>Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@uni.edu"
                className={styles.input}
              />
            </div>
            
            <div>
              <label className={styles.label}>Пароль</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={styles.button}
            >
              {isLoading ? <div className={styles.spinner}></div> : 'Увійти'}
            </button>
          </form>

          <div className={styles.footer}>
            Ще не маєте акаунту?{' '}
            <Link to="/register" className={styles.link}>
              Зареєструватися
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Login;
