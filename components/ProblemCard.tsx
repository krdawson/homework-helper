
import React from 'react';
import { MathProblem } from '../types';

interface ProblemCardProps {
  problem: MathProblem;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ problem }) => {
  // Helper to render text with ==highlighted== sections
  const renderHighlightedText = (text: string | undefined, original: string) => {
    if (!text || !text.includes('==')) return original;

    const parts = text.split(/(==.*?==)/g);
    return parts.map((part, index) => {
      if (part.startsWith('==') && part.endsWith('==')) {
        const content = part.slice(2, -2);
        return (
          <span 
            key={index} 
            className="bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-200 px-1 rounded border-b-2 border-red-500 font-bold"
          >
            {content}
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
            
            {!problem.isCorrect && (
              <>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-slate-500 dark:text-slate-400 shrink-0">Correct Answer:</span>
                  <span className="text-green-700 dark:text-green-400 font-bold">{problem.correctAnswer}</span>
                </div>
                <div className="mt-3 p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl text-slate-700 dark:text-slate-300 italic border border-red-100 dark:border-red-900/30 shadow-inner">
                  <div className="flex gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{problem.explanation}</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProblemCard;
