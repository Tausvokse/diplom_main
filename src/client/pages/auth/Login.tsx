import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AuthResponse } from '../../types';
import { AuthBackground } from '../../components/AuthBackground';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="ui-card p-8 w-full max-w-md animate-fadeIn">
          <div className="text-center mb-8">
            {/* Neumorphic logo badge */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgb(var(--surface))] nm-raised mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="24" height="20" rx="3" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.8" />
                <rect x="4" y="8" width="24" height="6" rx="3" fill="rgb(var(--accent))" fillOpacity="0.15" stroke="rgb(var(--accent))" strokeWidth="2" opacity="0.6" />
                <rect x="9" y="18" width="5" height="5" rx="1" stroke="rgb(var(--accent))" strokeWidth="1.5" opacity="0.6" />
                <rect x="18" y="18" width="5" height="5" rx="1" stroke="rgb(var(--accent))" strokeWidth="1.5" opacity="0.6" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--text))] mb-2">Вхід до системи</h1>
            <p className="text-sm ui-muted">Авторизуйтеся для доступу до кабінету</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium ui-muted mb-1.5">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@uni.edu"
                className="ui-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium ui-muted mb-1.5">Пароль</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="ui-input"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full ui-button ui-button-primary py-3 mt-2"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Увійти'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm ui-muted">
            Ще не маєте акаунту?{' '}
            <Link to="/register" className="text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))] font-medium hover:underline">
              Зареєструватися
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default Login;
