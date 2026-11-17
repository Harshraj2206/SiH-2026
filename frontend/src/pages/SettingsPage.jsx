import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export const SettingsPage = () => {
  const { themeMode, setTheme } = useTheme();

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="bg-surface p-5 rounded-card">
        <h1 className="text-lg font-semibold text-label">Settings</h1>
        <p className="text-xs text-label-2 mt-0.5">Choose how LandSafe looks. Changes apply right away.</p>
      </div>

      <div className="bg-surface rounded-card p-6 space-y-3.5">
        <h2 className="text-xs font-semibold text-label">Appearance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { mode: 'dark', label: 'Dark', icon: Moon },
            { mode: 'light', label: 'Light', icon: Sun },
            { mode: 'system', label: 'Same as device', icon: Laptop }
          ].map(({ mode, label, icon: Icon }) => (
            <button
              type="button"
              key={mode}
              onClick={() => setTheme(mode)}
              className={`p-4 rounded-tile border text-left flex items-center gap-2 text-xs ${
                themeMode === mode ? 'bg-surface-2 border-label/40 text-label font-semibold' : 'bg-surface-2 border-transparent text-label-2'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
