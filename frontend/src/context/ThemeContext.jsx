import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState({
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED',
    font: 'Inter',
    logo: '',
    siteName: 'NexSMS',
  });

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { data } = await axios.get('/api/settings/public');
        if (data?.theme) {
          setTheme(data.theme);
        }
        if (data?.siteName) {
          setTheme((prev) => ({ ...prev, siteName: data.siteName }));
        }
      } catch {
        // use defaults if API not reachable
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const hexToRgb = (hex) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
      return `${(bigint >> 16) & 255} ${(bigint >> 8) & 255} ${bigint & 255}`;
    };
    document.documentElement.style.setProperty('--color-primary', hexToRgb(theme.primaryColor));
    document.documentElement.style.setProperty('--color-secondary', hexToRgb(theme.secondaryColor));
    document.documentElement.style.setProperty('--font-family', `'${theme.font}', system-ui, sans-serif`);
    document.title = theme.siteName;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
