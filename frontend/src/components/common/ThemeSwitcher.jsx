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
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#121d33] hover:bg-[#182744] text-slate-300 hover:text-white border border-[#1c2b48] text-xs font-mono font-medium transition-colors"
        title={`Theme: ${currentOption.label} (${resolvedTheme})`}
        aria-label="Switch Appearance Theme"
      >
        <CurrentIcon className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline font-mono">{currentOption.label}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-32 rounded-xl bg-[#0d1527] border border-[#1c2b48] shadow-2xl p-1 z-50 animate-in fade-in"
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
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between font-mono transition-colors ${
                  isSelected
                    ? 'bg-[#16243d] text-cyan-300 font-bold'
                    : 'text-slate-300 hover:bg-[#121d33]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${opt.mode === 'light' ? 'text-amber-400' : opt.mode === 'dark' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
