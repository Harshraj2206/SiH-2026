import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';

export const ThemeSwitcher = () => {
  const { themeMode, resolvedTheme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const options = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'System', icon: Laptop },
  ];

  const currentOption = options.find((o) => o.mode === themeMode) || options[1];
  const CurrentIcon = currentOption.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 hover:bg-[#182744] text-label-2 hover:text-label border border-line text-xs tabular-nums font-medium transition-colors"
        title={`Theme: ${currentOption.label} (${resolvedTheme})`}
        aria-label="Switch Appearance Theme"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-risk-moderate" />
        <span className="hidden sm:inline tabular-nums">{currentOption.label}</span>
        <ChevronDown className="w-3 h-3 text-label-2" />
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-32 rounded-tile bg-surface-2 border border-line p-1 z-50 animate-in fade-in"
          onMouseLeave={() => setDropdownOpen(false)}
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => {
                  setTheme(opt.mode);
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between tabular-nums transition-colors ${
                  isSelected
                    ? 'bg-surface-2 text-label-2 font-semibold'
                    : 'text-label-2 hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${opt.mode === 'light' ? 'text-risk-moderate' : opt.mode === 'dark' ? 'text-label-2' : 'text-label-2'}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
