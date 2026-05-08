
import React, { useState, useRef, useEffect } from 'react';
import { AppState, HomeworkAnalysis, SavedAnalysis, UserProfile, PracticeSet, Subject } from './types';
import { analyzeMathHomework, generatePracticeProblems } from './services/geminiService';
import ProblemCard from './components/ProblemCard';
import CameraView from './components/CameraView';
import SettingsPage from './components/SettingsPage';
import PracticeView from './components/PracticeView';
import { resizeImage, loadImage } from './utils/imageProcessing';

const SUBJECT_COLORS: Record<Subject, string> = {
  Math:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  Spelling:    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  Vocabulary:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Grammar:     'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Science:     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  History:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Other:       'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const STORAGE_KEY = 'mathcheck_history';
const THEME_KEY = 'theme';
const PROFILE_KEY = 'mathcheck_profile';

type Theme = 'light' | 'dark' | 'system';

interface StagedImage {
  dataUrl: string;
  base64: string;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [results, setResults] = useState<HomeworkAnalysis | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>((localStorage.getItem(THEME_KEY) as Theme) || 'system');
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? JSON.parse(saved) : { name: '', gradeLevel: 'Middle School', hintMode: false };
  });
  const [worksheetMode, setWorksheetMode] = useState(false);
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

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
      hintMode: profile.hintMode,
    };
    const updatedHistory = [newSaved, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your history?")) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const startPractice = async (fromResults: HomeworkAnalysis) => {
    setState(AppState.PRACTICE_GENERATING);
    setPracticeError(null);
    try {
      const generated = await generatePracticeProblems(fromResults, profile);
      setPracticeSet(generated);
      setState(AppState.PRACTICE_READY);
    } catch (err) {
      console.error(err);
      setPracticeError("Couldn't generate practice problems. Please try again.");
      setState(AppState.RESULTS);
    }
  };

  const processImages = async (images: StagedImage[], activePracticeSet?: PracticeSet | null) => {
    setState(AppState.ANALYZING);
    setCapturedImage(images[0]?.dataUrl ?? null);
    setError(null);

    try {
      const analysis = await analyzeMathHomework(
        images.map(i => i.base64),
        profile,
        activePracticeSet ?? undefined
      );

      if (analysis.isBlankPage) {
        setError("Wait! It looks like this page is blank or doesn't have any answers yet. Please do the problems first before scanning!");
        setState(AppState.IDLE);
        setCapturedImage(null);
        setStagedImages([]);
        return;
      }

      setResults(analysis);
      saveToHistory(analysis);
      setPracticeSet(null);
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
    event.target.value = '';

    try {
      const img = await loadImage(file);
      const { dataUrl, base64 } = await resizeImage(img);

      if (worksheetMode) {
        setStagedImages(prev => [...prev, { dataUrl, base64 }]);
        setState(AppState.STAGING);
      } else {
        setCapturedImage(dataUrl);
        processImages([{ dataUrl, base64 }], practiceSet);
      }
    } catch (err) {
      console.error("Error processing gallery image:", err);
      setError("Failed to process the selected image. Please try another one.");
    }
  };

  const onCameraCapture = (base64String: string) => {
    const dataUrl = `data:image/jpeg;base64,${base64String}`;
    if (worksheetMode) {
      setStagedImages(prev => [...prev, { dataUrl, base64: base64String }]);
      setState(AppState.STAGING);
    } else {
      setCapturedImage(dataUrl);
      processImages([{ dataUrl, base64: base64String }], practiceSet);
    }
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
    setStagedImages([]);
    setPracticeSet(null);
    setPracticeError(null);
  };

  const triggerCamera = () => setState(AppState.SCANNING);
  const triggerGallery = () => fileInputRef.current?.click();

  const removeStagedImage = (index: number) => {
    setStagedImages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) setState(AppState.IDLE);
      return updated;
    });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors flex flex-col">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <img src="/hh-logo.jpg" alt="Homework Helper" className="h-10 w-10 rounded-xl shadow-lg object-cover" />
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
            {(state === AppState.RESULTS || state === AppState.STAGING || state === AppState.PRACTICE_READY) && (
              <button
                onClick={state === AppState.PRACTICE_READY ? () => setState(AppState.RESULTS) : reset}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-2"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4">

        {/* IDLE */}
        {state === AppState.IDLE && (
          <div className="flex flex-col items-center py-8 space-y-8">
            <div className="text-center space-y-4">
              <img src="/hh-logo.jpg" alt="Homework Helper" className="w-24 h-24 rounded-3xl shadow-xl object-cover mx-auto mb-2" />
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {profile.name ? `Hi, ${profile.name}!` : 'Check Your Work'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Snap a photo of your homework and AI will grade it instantly.
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

            {/* Scan mode toggle */}
            <div className="w-full max-w-sm">
              <button
                onClick={() => setWorksheetMode(v => !v)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${worksheetMode ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${worksheetMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${worksheetMode ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      Worksheet Mode
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {worksheetMode ? 'Scan multiple pages, then analyze together' : 'Tap to scan a multi-page worksheet'}
                    </p>
                  </div>
                </div>
                <div className={`relative w-12 h-6 rounded-full transition-colors ${worksheetMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${worksheetMode ? 'translate-x-7' : 'translate-x-1'}`} />
                </div>
              </button>
            </div>

            <div className="w-full max-w-sm flex flex-col gap-3">
              <button
                onClick={triggerCamera}
                className="w-full bg-indigo-600 text-white text-lg font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                {worksheetMode ? 'Scan First Page' : 'Open Camera'}
              </button>

              <button
                onClick={triggerGallery}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-lg font-bold py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {worksheetMode ? 'Choose First Page' : 'Choose from Gallery'}
              </button>
            </div>

            {/* History */}
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
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{formatDate(item.timestamp)}</p>
                          {item.subject && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SUBJECT_COLORS[item.subject] ?? SUBJECT_COLORS.Other}`}>
                              {item.subject}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold line-clamp-1">{item.summary}</p>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg shrink-0">
                        <span className="text-indigo-700 dark:text-indigo-300 font-black text-sm">{item.score}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
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

        {/* SCANNING */}
        {state === AppState.SCANNING && (
          <CameraView
            onCapture={onCameraCapture}
            onCancel={() => {
              if (practiceSet) setState(AppState.PRACTICE_READY);
              else if (worksheetMode && stagedImages.length > 0) setState(AppState.STAGING);
              else setState(AppState.IDLE);
            }}
          />
        )}

        {/* STAGING — worksheet page collection */}
        {state === AppState.STAGING && (
          <div className="flex flex-col items-center py-8 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-full max-w-sm text-center space-y-1">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Worksheet Pages</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {stagedImages.length} page{stagedImages.length !== 1 ? 's' : ''} ready · Add more or analyze now
              </p>
            </div>

            {/* Thumbnails */}
            <div className="w-full max-w-sm flex flex-wrap gap-3 justify-center">
              {stagedImages.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={img.dataUrl}
                    alt={`Page ${i + 1}`}
                    className="w-24 h-32 object-cover rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 shadow-md"
                  />
                  <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => removeStagedImage(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow"
                    aria-label="Remove page"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {stagedImages.length < 6 && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={triggerCamera}
                    className="w-24 h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 hover:border-indigo-400 hover:text-indigo-500 active:scale-95 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs font-medium">Camera</span>
                  </button>
                  <button
                    onClick={triggerGallery}
                    className="w-24 h-8 border border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 hover:border-indigo-400 hover:text-indigo-500 active:scale-95 transition-all"
                  >
                    Gallery
                  </button>
                </div>
              )}
            </div>

            <div className="w-full max-w-sm flex flex-col gap-3">
              <button
                onClick={() => processImages(stagedImages)}
                className="w-full bg-indigo-600 text-white text-lg font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Analyze Worksheet ({stagedImages.length} page{stagedImages.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        )}

        {/* PRACTICE GENERATING */}
        {state === AppState.PRACTICE_GENERATING && (
          <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Generating Practice Problems...</h3>
              <p className="text-slate-500 dark:text-slate-400">Tailoring problems for {profile.gradeLevel}.</p>
            </div>
          </div>
        )}

        {/* PRACTICE READY */}
        {state === AppState.PRACTICE_READY && practiceSet && (
          <PracticeView
            practiceSet={practiceSet}
            onScanWork={() => setState(AppState.SCANNING)}
            onChooseFromGallery={triggerGallery}
            onCancel={() => setState(AppState.RESULTS)}
          />
        )}

        {/* ANALYZING */}
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

        {/* RESULTS */}
        {state === AppState.RESULTS && results && (
          <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  {results.subject && (
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${SUBJECT_COLORS[results.subject] ?? SUBJECT_COLORS.Other}`}>
                      {results.subject}
                    </span>
                  )}
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Overall Score</p>
                  <h3 className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{results.score}</h3>
                </div>
                <div className="max-w-[60%] text-right">
                  <p className="text-slate-600 dark:text-slate-300 text-sm italic">{results.summary}</p>
                </div>
              </div>

              {profile.hintMode && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 px-4 py-2.5 rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Hint Mode is on — tap "Reveal Answer" to see solutions</p>
                </div>
              )}

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
                <ProblemCard key={problem.id} problem={problem} hintMode={profile.hintMode} />
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

      {state === AppState.RESULTS && results && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent z-10">
          <div className="flex gap-3 max-w-sm mx-auto">
            <button
              onClick={reset}
              className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-2xl active:scale-95 transition-all"
            >
              New Scan
            </button>
            <button
              onClick={() => startPractice(results)}
              className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Practice More
            </button>
          </div>
          {practiceError && (
            <p className="text-center text-red-500 text-xs mt-2">{practiceError}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
