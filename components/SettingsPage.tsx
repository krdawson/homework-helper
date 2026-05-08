
import React from 'react';
import { UserProfile } from '../types';

interface SettingsPageProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  onClearHistory: () => void;
  onBack: () => void;
}

const GRADE_LEVELS = [
  "Elementary School",
  "Middle School",
  "High School",
  "College / University",
  "Professional / Adult"
];

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  profile, 
  setProfile, 
  theme, 
  setTheme, 
  onClearHistory, 
  onBack 
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">User Settings</h2>
      </div>

      {/* Profile Section */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Student Profile</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Name</label>
            <input 
              type="text" 
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="e.g. Alex Smith"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Grade Level</label>
            <select 
              value={profile.gradeLevel}
              onChange={(e) => setProfile({ ...profile, gradeLevel: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
            >
              {GRADE_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Appearance</h3>
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold capitalize transition-all ${
                theme === t 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Data Section */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 text-red-600 dark:text-red-400">Danger Zone</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Clearing history cannot be undone. All your saved homework analyses will be deleted.</p>
        <button 
          onClick={onClearHistory}
          className="w-full py-4 rounded-xl border-2 border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          Clear All History
        </button>
      </section>

      <div className="pt-4 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-600 font-medium tracking-widest uppercase">Homework Help AI v1.2</p>
      </div>
    </div>
  );
};

export default SettingsPage;
