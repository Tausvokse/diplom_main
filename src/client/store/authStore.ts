import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

// Safe local storage wrapper for Telegram WebView and strict incognito modes
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.warn('localStorage is blocked, returning null');
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn('localStorage is blocked, cannot save', name);
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch (e) {
      console.warn('localStorage is blocked, cannot remove', name);
    }
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      }),

      setTokens: (accessToken, refreshToken) => set({
        accessToken,
        refreshToken,
      }),

      updateUser: (updatedData) => set((state) => ({
        user: state.user ? { ...state.user, ...updatedData } : null,
      })),

      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'dormitory-auth-storage',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ 
        user: state.user, 
        accessToken: state.accessToken, 
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
