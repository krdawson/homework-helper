
import React, { useState, useRef, useEffect } from 'react';
import { AppState, HomeworkAnalysis, SavedAnalysis, UserProfile } from './types';
import { analyzeMathHomework } from './services/geminiService';
import ProblemCard from './components/ProblemCard';
import CameraView from './components/CameraView';
import SettingsPage from './components/SettingsPage';
import { resizeImage, loadImage } from './utils/imageProcessing';

const STORAGE_KEY = 'mathcheck_history';
const THEME_KEY = 'theme';
const PROFILE_KEY = 'mathcheck_profile';

type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [results, setResults] = useState<HomeworkAnalysis | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>((localStorage.getItem(THEME_KEY) as Theme) || 'system');
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? JSON.parse(saved) : { name: '', gradeLevel: 'Middle School' };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    } else {
      localStorage.removeItem(THEME_KEY);
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // Profile save effect
  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (analysis: HomeworkAnalysis) => {
    const newSaved: SavedAnalysis = {
      ...analysis,
      savedId: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    const updatedHistory = [newSaved, ...history].slice(0, 20); // Keep last 20
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your history?")) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const processImage = async (base64String: string) => {
    setState(AppState.ANALYZING);
    setError(null);

    try {
      const analysis = await analyzeMathHomework(base64String, profile);
      
      if (analysis.isBlankPage) {
        setError("Wait! It looks like this page is blank or doesn't have any answers yet. Please do the problems first before scanning!");
        setState(AppState.IDLE);
        setCapturedImage(null);
        return;
      }

      setResults(analysis);
      saveToHistory(analysis);
      setState(AppState.RESULTS);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze homework. Please make sure the photo is clear and try again.");
      setState(AppState.IDLE);
    }
  };

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const img = await loadImage(file);
      const { dataUrl, base64 } = await resizeImage(img);
      setCapturedImage(dataUrl);
      processImage(base64);
    } catch (err) {
      console.error("Error processing gallery image:", err);
      setError("Failed to process the selected image. Please try another one.");
    }
  };

  const onCameraCapture = (base64String: string) => {
    setCapturedImage(`data:image/jpeg;base64,${base64String}`);
    processImage(base64String);
  };

  const loadHistoryItem = (item: SavedAnalysis) => {
    setResults(item);
    setState(AppState.RESULTS);
    setCapturedImage(null);
  };

  const reset = () => {
    setState(AppState.IDLE);
    setResults(null);
    setCapturedImage(null);
    setError(null);
  };

  const triggerCamera = () => {
    setState(AppState.SCANNING);
  };

  const triggerGallery = () => {
    fileInputRef.current?.click();
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors flex flex-col">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 hidden sm:block">Homework Help AI</h1>
          </div>
          <div className="flex items-center gap-3">
            {state !== AppState.SCANNING && (
              <button 
                onClick={() => setState(state === AppState.SETTINGS ? AppState.IDLE : AppState.SETTINGS)}
                className={`p-2.5 rounded-xl transition-all ${
                  state === AppState.SETTINGS 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
                title="Profile Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            )}
            {(state === AppState.RESULTS) && (
              <button 
                onClick={reset}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-2"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4">
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center py-8 space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mx-auto mb-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {profile.name ? `Hi, ${profile.name}!` : 'Check Your Work'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Snap a photo of your math problems and Gemini 3 Pro will grade it.
              </p>
            </div>

            {error && (
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-6 py-4 rounded-2xl text-sm max-w-sm w-full flex gap-3 items-start shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="w-full max-w-sm flex flex-col gap-3">
              <button
                onClick={triggerCamera}
                className="w-full bg-indigo-600 text-white text-lg font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                Open Camera
              </button>
              
              <button
                onClick={triggerGallery}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-lg font-bold py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Choose from Gallery
              </button>
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="w-full max-w-sm space-y-4 pt-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent History</h3>
                </div>
                <div className="space-y-3">
                  {history.map((item) => (
                    <button
                      key={item.savedId}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex items-center justify-between text-left hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors shadow-sm active:bg-slate-50 dark:active:bg-slate-700"
                    >
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{formatDate(item.timestamp)}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold line-clamp-1">{item.summary}</p>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
                        <span className="text-indigo-700 dark:text-indigo-300 font-black text-sm">{item.score}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {state === AppState.SETTINGS && (
          <SettingsPage 
            profile={profile} 
            setProfile={setProfile}
            theme={theme}
            setTheme={setTheme}
            onClearHistory={clearHistory}
            onBack={() => setState(AppState.IDLE)}
          />
        )}

        {state === AppState.SCANNING && (
          <CameraView 
            onCapture={onCameraCapture} 
            onCancel={() => setState(AppState.IDLE)} 
          />
        )}

        {state === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
            <div className="relative w-48 h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700 bg-slate-200 dark:bg-slate-800">
              {capturedImage && (
                <img src={capturedImage} alt="Scanning" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                 <div className="w-full h-1 bg-white/80 absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
            <style>{`
              @keyframes scan {
                0% { top: 0; }
                50% { top: 100%; }
                100% { top: 0; }
              }
            `}</style>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Analyzing Homework...</h3>
              <p className="text-slate-500 dark:text-slate-400">Tailoring feedback for {profile.gradeLevel}.</p>
            </div>
          </div>
        )}

        {state === AppState.RESULTS && results && (
          <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Overall Score</p>
                  <h3 className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{results.score}</h3>
                </div>
                <div className="max-w-[60%] text-right">
                  <p className="text-slate-600 dark:text-slate-300 text-sm italic">{results.summary}</p>
                </div>
              </div>
              
              {results.handwritingLegibilityFeedback && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 p-4 rounded-2xl flex gap-3 items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-tight">Handwriting Legibility</p>
                    <p className="text-sm text-amber-900 dark:text-amber-200">{results.handwritingLegibilityFeedback}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 ml-1">Problem Details</h4>
              {results.problems.map((problem) => (
                <ProblemCard key={problem.id} problem={problem} />
              ))}
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleCapture}
        />
      </main>

      {state === AppState.RESULTS && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent flex justify-center z-10">
          <button 
            onClick={reset}
            className="w-full max-w-xs bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 transition-all"
          >
            New Scan
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
