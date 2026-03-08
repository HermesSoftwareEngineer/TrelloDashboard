import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'trellodashboard-theme';

const ThemeContext = createContext(null);

const resolveInitialDarkMode = () => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'dark') {
    return true;
  }

  if (storedTheme === 'light') {
    return false;
  }

  return true;
};

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(resolveInitialDarkMode);

  useEffect(() => {
    const themeName = dark ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, themeName);

    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(dark ? 'theme-dark' : 'theme-light');
  }, [dark]);

  const value = useMemo(() => ({
    dark,
    theme: dark ? 'dark' : 'light',
    setDark,
    toggleTheme: () => setDark((previous) => !previous),
  }), [dark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
};
