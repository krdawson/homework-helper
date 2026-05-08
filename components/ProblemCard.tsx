
import React, { useState } from 'react';
import { MathProblem } from '../types';

interface ProblemCardProps {
  problem: MathProblem;
  hintMode?: boolean;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ problem, hintMode = false }) => {
  const [revealed, setRevealed] = useState(false);

  const renderHighlightedText = (text: string | undefined, original: string) => {
    if (!text || !text.includes('==')) return original;
    const parts = text.split(/(==.*?==)/g);
    return parts.map((part, index) => {
      if (part.startsWith('==') && part.endsWith('==')) {
        return (
          <span
            key={index}
            className="bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-200 px-1 rounded border-b-2 border-red-500 font-bold"
          >
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  const getContainerStyles = () => {
    if (problem.isUnworked) {
      return 'border-slate-200 bg-slate-100/50 dark:bg-slate-800/40 dark:border-slate-700 shadow-sm';
    }
    return problem.isCorrect
      ? 'border-green-100 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30 shadow-sm'
      : 'border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 shadow-sm';
  };

  const renderStatus = () => {
    if (problem.isUnworked) {
      return (
        <span className="flex items-center bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full shadow-sm ml-2 uppercase tracking-wider">
          Unworked
        </span>
      );
    }
    return problem.isCorrect ? (
      <span className="flex items-center bg-green-200 dark:bg-green-800 text-xl px-3 py-1 rounded-full shadow-sm ml-2" aria-label="Correct">
        👍
      </span>
    ) : (
      <span className="flex items-center bg-red-200 dark:bg-red-800 text-xl px-3 py-1 rounded-full shadow-sm ml-2" aria-label="Incorrect">
        👎
      </span>
    );
  };

  const renderIncorrectDetails = () => {
    if (hintMode && !revealed) {
      return (
        <div className="space-y-3">
          {problem.hint && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex gap-3 items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight mb-1">Hint</p>
                <p className="text-sm text-amber-900 dark:text-amber-200">{problem.hint}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95 transition-all"
          >
            Reveal Answer
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <span className="font-medium text-slate-500 dark:text-slate-400 shrink-0">Correct Answer:</span>
          <span className="text-green-700 dark:text-green-400 font-bold">{problem.correctAnswer}</span>
        </div>
        <div className="mt-1 p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300 italic border border-red-100 dark:border-red-900/30 shadow-inner">
          <div className="flex gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{problem.explanation}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-5 rounded-2xl border-2 mb-4 transition-all ${getContainerStyles()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg leading-tight">
            Problem: {renderHighlightedText(problem.highlightedProblemText, problem.problemText)}
          </h3>
        </div>
        {renderStatus()}
      </div>

      <div className="space-y-3 text-sm md:text-base">
        {problem.isUnworked ? (
          <div className="flex items-center gap-2 p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 italic text-slate-600 dark:text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Please try this problem first! No handwriting detected.</span>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <span className="font-medium text-slate-500 dark:text-slate-400 shrink-0">Your Answer:</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {renderHighlightedText(problem.highlightedStudentAnswer, problem.studentAnswer)}
              </span>
            </div>
            {!problem.isCorrect && renderIncorrectDetails()}
          </>
        )}
      </div>
    </div>
  );
};

export default ProblemCard;
