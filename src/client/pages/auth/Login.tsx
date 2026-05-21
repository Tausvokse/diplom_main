import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AuthResponse } from '../../types';

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
      // toast is handled by api interceptor mostly, but we can catch local ones
      // Interceptor handles error messages, but we can do extra logic here if needed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen ui-shell px-6">
      <div className="ui-card p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[rgb(var(--text))] mb-2">Вхід до системи</h1>
          <p className="text-sm ui-muted">Авторизуйтеся для доступу до кабінету</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium ui-muted mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@uni.edu"
              className="ui-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium ui-muted mb-1">Пароль</label>
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
            className="w-full ui-button ui-button-primary mt-2 disabled:opacity-50"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Увійти'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm ui-muted">
          Ще не маєте акаунту?{' '}
          <Link to="/register" className="text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))] font-medium hover:underline">
            Зареєструватися
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
