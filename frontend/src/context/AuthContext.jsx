import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGetMe, apiLogout } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        try {
          const res = await apiGetMe();
          if (res?.success && res?.user) {
            setUser(res.user);
          } else {
            // Token expired or revoked
            localStorage.removeItem('auth_token');
            localStorage.clear();
            sessionStorage.clear();
            setUser(null);
            setToken(null);
          }
        } catch (err) {
          console.error("Auth initialization error:", err);
          localStorage.removeItem('auth_token');
          localStorage.clear();
          sessionStorage.clear();
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = (newToken, newUser) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      // Ignore network errors on logout
    }
    try {
      localStorage.removeItem('auth_token');
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // Browser storage exceptions handled
    }
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser(prev => prev ? { ...prev, ...updatedFields } : prev);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
