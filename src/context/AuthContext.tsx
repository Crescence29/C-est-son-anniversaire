import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Notification } from '../types.ts';
import { api } from '../utils/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  notifications: Notification[];
  unreadNotifsCount: number;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, phone: string, pass: string) => Promise<User>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('csa_auth_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const fetchCurrentUser = async () => {
    try {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
      fetchNotifications();
    } catch {
      localStorage.removeItem('csa_auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications);
      setUnreadNotifsCount(data.unreadCount);
    } catch {
      // benign
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', {
      email,
      password: pass,
    });
    localStorage.setItem('csa_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (name: string, email: string, phone: string, pass: string): Promise<User> => {
    const res = await api.post<{ user: User; token: string }>('/auth/register', {
      full_name: name,
      email,
      phone,
      password: pass,
    });
    localStorage.setItem('csa_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('csa_auth_token');
    setToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadNotifsCount(0);
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotifsCount((prev) => Math.max(0, prev - 1));
    } catch {
      // benign
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifsCount(0);
    } catch {
      // benign
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        notifications,
        unreadNotifsCount,
        login,
        register,
        logout,
        refreshUserData: fetchCurrentUser,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
