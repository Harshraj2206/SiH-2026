import React, { createContext, useContext, useState, useEffect } from 'react';
import translationsData from '../i18n/translations.json';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', region: 'National' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', region: 'North India' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', region: 'Punjab / HP' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', region: 'Eastern India' }
];

export function LanguageProvider({ children }) {
  // English only: the other languages were only partly translated.
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    localStorage.setItem('landsafe_lang', language);
  }, [language]);

  // Universal translation function with interpolation and safe fallback
  const t = (key, paramsOrFallback) => {
    if (!key) return '';

    let params = null;
    let fallback = null;

    if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      params = paramsOrFallback;
    } else if (typeof paramsOrFallback === 'string') {
      fallback = paramsOrFallback;
    }

    const langDict = translationsData[language];
    const enDict = translationsData.en;

    let result = null;

    // 1. Direct dictionary match in active language
    if (langDict && langDict[key]) {
      result = langDict[key];
    }
    // 2. Lookup by English dictionary value to find key
    else if (enDict) {
      const matchingKey = Object.keys(enDict).find(k => enDict[k] === key);
      if (matchingKey && langDict && langDict[matchingKey]) {
        result = langDict[matchingKey];
      }
    }

    // 3. Fallback to English dictionary
    if (!result && enDict && enDict[key]) {
      result = enDict[key];
    }

    // 4. Fallback string or original key
    if (!result) {
      result = fallback !== null ? fallback : key;
    }

    // 5. Safe linear parameter substitution (immune to ReDoS / dynamic regex injection)
    if (params && typeof result === 'string') {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        result = result.replaceAll(`{${paramKey}}`, String(paramVal));
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
