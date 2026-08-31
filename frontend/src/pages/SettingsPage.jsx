import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Bell, 
  Globe, 
  CheckCircle2, 
  Mail, 
  MessageSquare, 
  Sun, 
  Moon, 
  Laptop,
  Save
} from 'lucide-react';

export const SettingsPage = () => {
  const { language, setLanguage } = useLanguage();
  const { themeMode, setTheme } = useTheme();
  
  const [channels, setChannels] = useState(['IN_APP', 'EMAIL']);
  const [saved, setSaved] = useState(false);

  const languagesList = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  ];

  const handleChannelToggle = (ch) => {
    if (channels.includes(ch)) {
      setChannels(channels.filter(c => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 w-full select-none pb-10">
      
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl shadow-sm">
        <h1 className="text-lg font-bold text-white">Platform Settings</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Manage appearance, preferred language, and emergency alert notification preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        {/* 1. Appearance (Light / Dark / System) - Full Width */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Appearance & Theme</span>
            </h2>
            <span className="text-[11px] text-neutral-400 capitalize">Active: {themeMode}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { mode: 'dark', label: 'True Black Mode', desc: 'Sleek dark operational UI', icon: Moon },
              { mode: 'light', label: 'Light Mode', desc: 'Daylight operational UI', icon: Sun },
              { mode: 'system', label: 'System Default', desc: 'Match device preference', icon: Laptop },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = themeMode === item.mode;
              return (
                <button
                  type="button"
                  key={item.mode}
                  onClick={() => {
                    setTheme(item.mode);
                    handleSave();
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#141414] border-emerald-500 text-white font-bold shadow-sm'
                      : 'bg-[#0f0f0f] border-[#1e1e1e] text-neutral-400 hover:border-[#2a2a2a]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Icon className={`w-4 h-4 ${item.mode === 'light' ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Language Selector - Full Width */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Preferred Language</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {languagesList.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    handleSave();
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#141414] border-emerald-500 text-white font-bold shadow-sm'
                      : 'bg-[#0f0f0f] border-[#1e1e1e] text-neutral-400 hover:border-[#2a2a2a]'
                  }`}
                >
                  <span className="font-bold text-xs text-white block">{lang.native}</span>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">{lang.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Notification Preferences - Full Width */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-400" />
            <span>Emergency Notification Channels</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'IN_APP', label: 'In-App Live Alerts', icon: Bell },
              { id: 'EMAIL', label: 'Emergency Email Dispatch', icon: Mail },
              { id: 'SMS', label: 'Critical SMS Alerts', icon: MessageSquare },
            ].map((c) => {
              const Icon = c.icon;
              const isChecked = channels.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors text-xs ${
                    isChecked
                      ? 'bg-[#141414] border-emerald-500/50 text-white font-semibold'
                      : 'bg-[#0f0f0f] border-[#1e1e1e] text-neutral-400 hover:border-[#2a2a2a]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      handleChannelToggle(c.id);
                      handleSave();
                    }}
                    className="rounded bg-[#050505] border-[#222222] text-emerald-500 focus:ring-0"
                  />
                  <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{c.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Save Bar & Confirmation */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Preferences saved.</span>
            </div>
          ) : <div />}

          <button
            type="submit"
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.99]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>

      </form>

    </div>
  );
};
