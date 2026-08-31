import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'landsafe_theme';

export const ThemeProvider = ({ children }) => {
  // Read saved preference or default to 'dark'
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch (e) {
      console.warn('LocalStorage theme access denied:', e);
    }
    return 'dark'; // Dark default for professional disaster management GIS
  });

  // Calculate resolved theme based on system or explicit choice
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (themeMode === 'system') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return themeMode;
  });

  // Apply theme to DOM and listen for OS system changes
  useEffect(() => {
    const updateTheme = () => {
      let resolved = themeMode;
      if (themeMode === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      setResolvedTheme(resolved);

      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      root.setAttribute('data-theme', resolved);
      root.style.colorScheme = resolved;

      try {
        localStorage.setItem(THEME_STORAGE_KEY, themeMode);
      } catch (e) {
        console.warn('LocalStorage theme save error:', e);
      }
    };

    updateTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const setTheme = (mode) => {
    if (mode === 'light' || mode === 'dark' || mode === 'system') {
      setThemeMode(mode);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
