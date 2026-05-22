import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { AuthResponse, ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

type ApiRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _retry429?: boolean;
  _silent?: boolean;
};

let lastRateLimitToastAt = 0;

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Optional: show success toasts for specific methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(response.config.method?.toUpperCase() || '')) {
      // You can add custom headers or flags to disable this default toast if needed
      // toast.success('Операцію виконано успішно');
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as ApiRequestConfig;
    const isSilent = Boolean(originalRequest?._silent);

    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        toast.error('Сесія закінчилась. Будь ласка, увійдіть знову.');
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;

        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        useAuthStore.getState().logout();
        toast.error('Помилка авторизації. Будь ласка, увійдіть знову.');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 429 && originalRequest && !originalRequest._retry429) {
      originalRequest._retry429 = true;
      const retryAfterHeader = error.response.headers['retry-after'] || error.response.headers['ratelimit-reset'];
      const retryAfterSeconds = Number(retryAfterHeader);
      const delayMs = Number.isFinite(retryAfterSeconds) ? Math.min(5000, Math.max(1000, retryAfterSeconds * 1000)) : 1500;

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(originalRequest);
    }

    if (!isSilent) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Сталася невідома помилка сервера';
      if (error.response?.status === 429) {
        const now = Date.now();
        if (now - lastRateLimitToastAt > 3000) {
          lastRateLimitToastAt = now;
          toast.error('Забагато запитів. Спробуйте ще раз трохи пізніше.');
        }
      } else {
        toast.error(errorMessage);
      }
    }
    return Promise.reject(error);
  }
);
