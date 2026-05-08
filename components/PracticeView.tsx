
import React from 'react';
import { PracticeSet } from '../types';

interface PracticeViewProps {
  practiceSet: PracticeSet;
  onScanWork: () => void;
  onChooseFromGallery: () => void;
  onCancel: () => void;
}

const PracticeView: React.FC<PracticeViewProps> = ({
  practiceSet,
  onScanWork,
  onChooseFromGallery,
  onCancel,
}) => {
  return (
    <div className="flex flex-col space-y-6 py-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Practice Problems</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Copy these into your notebook, solve them, then scan your work.
        </p>
      </div>

      <div className="space-y-3">
        {practiceSet.problems.map((problem, index) => (
          <div
            key={problem.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex gap-4 shadow-sm"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
              {index + 1}
            </div>
            <p className="text-slate-800 dark:text-slate-100 font-medium text-lg leading-snug">
              {problem.problemText}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 flex gap-3 items-start">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Write out your work and answers on paper, then tap <strong>Scan My Work</strong> when you're ready.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-6">
        <button
          onClick={onScanWork}
          className="w-full bg-indigo-600 text-white text-lg font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan My Work
        </button>
        <button
          onClick={onChooseFromGallery}
          className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-lg font-bold py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Choose from Gallery
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3 text-slate-500 dark:text-slate-400 font-medium text-sm active:scale-95 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PracticeView;
