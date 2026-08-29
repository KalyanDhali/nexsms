import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexsms_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const setSession = (data) => {
    localStorage.setItem('nexsms_access_token', data.accessToken);
    localStorage.setItem('nexsms_refresh_token', data.refreshToken);
    localStorage.setItem('nexsms_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const clearSession = () => {
    localStorage.removeItem('nexsms_access_token');
    localStorage.removeItem('nexsms_refresh_token');
    localStorage.removeItem('nexsms_user');
    sessionStorage.removeItem('nexsms_ui');
    setUser(null);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.twoFaRequired) {
        return { ok: false, twoFaRequired: true, twoFaToken: data.twoFaToken };
      }
      setSession(data);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const completeTwoFactorLogin = async (twoFaToken, code) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/verify-login', { twoFaToken, code });
      setSession(data);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Invalid code' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name, referralCode) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { email, password, name, referralCode });
      setSession(data);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, setUser, completeTwoFactorLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
