
import { GoogleGenAI, Type } from "@google/genai";
import { HomeworkAnalysis, UserProfile, PracticeSet, Subject } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set — add it to Vercel environment variables.");
  return new GoogleGenAI({ apiKey });
};

const SUBJECT_INSTRUCTIONS: Record<Subject, string> = {
  Math: `
Identify each math problem and the student's written answer.
Evaluate if the answer is mathematically correct.
For incorrect answers: provide the correct answer, a clear explanation, and a hint (guiding question without giving away the answer).
Highlight the specific wrong part of the student's answer using ==double equals==.`,

  Spelling: `
Identify each spelling word or sentence the student was asked to write.
Check if each word is spelled correctly — pay close attention to letter order, double letters, silent letters, and common misspellings.
For incorrect spellings: provide the correct spelling and a brief explanation of the rule or pattern they got wrong (e.g. "i before e", dropping the silent e before -ing).
Highlight the misspelled letters or portion using ==double equals== in highlightedStudentAnswer.
The "correctAnswer" field should contain the correctly spelled word.`,

  Vocabulary: `
Identify each vocabulary exercise — this may include writing definitions, using words in sentences, matching words to meanings, or fill-in-the-blank.
Evaluate whether the student's answer demonstrates correct understanding of the word's meaning and usage.
For incorrect answers: provide the correct definition or usage and explain what the student misunderstood.
The "correctAnswer" field should contain a clear, grade-appropriate definition or correct usage example.`,

  Grammar: `
Identify each grammar exercise — this may include correcting sentences, identifying parts of speech, punctuation, capitalization, subject-verb agreement, tense, or sentence structure.
Evaluate whether the student's answer applies the grammar rule correctly.
For incorrect answers: provide the corrected version and explain the grammar rule they missed in plain language appropriate for their grade level.
Highlight the grammatically incorrect portion using ==double equals== in highlightedStudentAnswer.
The "correctAnswer" field should contain the fully corrected sentence or answer.`,

  Science: `
Identify each science question and the student's answer.
Evaluate factual accuracy based on established science curriculum for their grade level.
For incorrect answers: provide the correct answer and a brief explanation of the concept.`,

  History: `
Identify each history or social studies question and the student's answer.
Evaluate factual accuracy — names, dates, events, and concepts.
For incorrect answers: provide the correct answer and a brief explanation of why it matters.`,

  Other: `
Identify each question or problem and the student's answer.
Evaluate whether the answer is correct based on the context of the assignment.
For incorrect answers: provide the correct answer and a brief explanation.`,
};

const getGradeLevelTone = (gradeLevel: string) => {
  switch (gradeLevel) {
    case 'Elementary School':
      return 'Use very simple words, short sentences, and friendly encouragement. Avoid all jargon.';
    case 'Middle School':
      return 'Use clear step-by-step logic and introduce formal terms gently.';
    case 'High School':
      return 'Use precise language and explain underlying principles and rules.';
    default:
      return 'Use concise, technical explanations assuming a solid academic foundation.';
  }
};

export const analyzeMathHomework = async (
  base64Images: string | string[],
  profile?: UserProfile,
  practiceContext?: PracticeSet
): Promise<HomeworkAnalysis> => {
  const ai = getAI();
  const images = Array.isArray(base64Images) ? base64Images : [base64Images];
  const hintMode = profile?.hintMode ?? false;

  const studentContext = profile
    ? `The student is named ${profile.name || 'the student'} and is at a ${profile.gradeLevel} level. ${getGradeLevelTone(profile.gradeLevel)}`
    : "The student's grade level is unknown.";

  const practiceInstruction = practiceContext
    ? `IMPORTANT: The student was given these specific practice problems to solve:
${practiceContext.problems.map((p, i) => `${i + 1}. ${p.problemText} [Correct answer: ${p.correctAnswer}]`).join('\n')}
Match each problem you see in the image to the corresponding problem above. You already know the correct answers — use them to grade accurately.`
    : '';

  const hintInstruction = hintMode
    ? `For each INCORRECT answer, provide a short "hint" — a single guiding question or gentle nudge that points to the concept they got wrong WITHOUT giving away the answer. The "correctAnswer" and "explanation" will be hidden from the student until they ask.`
    : `For each INCORRECT answer, provide the correct answer, a clear explanation, and a short "hint" field with a guiding question.`;

  const imageParts = images.map(data => ({
    inlineData: { mimeType: 'image/jpeg' as const, data },
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-pro',
    contents: {
      parts: [
        ...imageParts,
        {
          text: `You are a professional tutor grading student homework. ${studentContext}
${practiceInstruction}

${images.length > 1 ? `Analyze these ${images.length} images as one multi-page assignment and provide a single combined score.` : 'Analyze this homework image.'} It may contain typed text or student handwriting.

STEP 1 — DETECT SUBJECT:
First, identify what subject this homework is. Choose one of: Math, Spelling, Vocabulary, Grammar, Science, History, Other.
Set the "subject" field accordingly.

STEP 2 — GRADE BASED ON SUBJECT:
Apply the appropriate grading approach for the detected subject:

${Object.entries(SUBJECT_INSTRUCTIONS).map(([s, inst]) => `**${s}:**${inst}`).join('\n\n')}

STEP 3 — APPLY HINT MODE:
${hintInstruction}

STEP 4 — SCORING:
- Provide a summary of the overall work and a score (e.g. "4/5 correct").
- Provide feedback on handwriting legibility.
- BLANK PAGE: If no student work is visible at all, set "isBlankPage" to true.
- UNWORKED PROBLEMS: If a specific problem has no student answer, set "isUnworked" to true. Do not score it as incorrect.

HIGHLIGHTING:
For incorrect answers, wrap the wrong portion in ==double equals== in "highlightedStudentAnswer".
If the student misread or misapplied the question, wrap that part in ==double equals== in "highlightedProblemText".

Return all data in the specified JSON format.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: {
            type: Type.STRING,
            description: "Detected subject: Math, Spelling, Vocabulary, Grammar, Science, History, or Other.",
          },
          problems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                problemText: { type: Type.STRING },
                studentAnswer: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                hint: {
                  type: Type.STRING,
                  description: "A guiding question that nudges the student toward the right answer without revealing it.",
                },
                highlightedProblemText: { type: Type.STRING },
                highlightedStudentAnswer: { type: Type.STRING },
                isUnworked: {
                  type: Type.BOOLEAN,
                  description: "True if the student has not attempted this problem.",
                },
              },
              required: ["id", "problemText", "studentAnswer", "isCorrect", "correctAnswer", "explanation"],
            },
          },
          summary: { type: Type.STRING },
          score: { type: Type.STRING },
          handwritingLegibilityFeedback: {
            type: Type.STRING,
            description: "Feedback on how easy it was to read the student's handwriting.",
          },
          isBlankPage: {
            type: Type.BOOLEAN,
            description: "True if all pages are blank or have no student work.",
          },
        },
        required: ["subject", "problems", "summary", "score", "handwritingLegibilityFeedback", "isBlankPage"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as HomeworkAnalysis;
};

export const generatePracticeProblems = async (
  previousAnalysis: HomeworkAnalysis,
  profile: UserProfile,
  count = 5
): Promise<PracticeSet> => {
  const ai = getAI();

  const wrongProblems = previousAnalysis.problems.filter(p => !p.isCorrect && !p.isUnworked);
  const allProblems = previousAnalysis.problems.filter(p => !p.isUnworked);
  const problemsForContext = wrongProblems.length > 0 ? wrongProblems : allProblems;
  const subject = previousAnalysis.subject ?? 'Math';

  const contextLines = problemsForContext
    .map(p => `- Problem: "${p.problemText}" | Student answer: "${p.studentAnswer}" | Correct: "${p.correctAnswer}" | Issue: "${p.explanation}"`)
    .join('\n');

  const subjectGuidance: Partial<Record<Subject, string>> = {
    Spelling: `Generate ${count} spelling words at ${profile.gradeLevel} level that follow similar patterns or rules to the ones they got wrong. Present each as "Spell the word: [word]" with the correct spelling as the answer.`,
    Vocabulary: `Generate ${count} vocabulary exercises at ${profile.gradeLevel} level using words related to the same themes. Mix definition questions and use-in-a-sentence prompts.`,
    Grammar: `Generate ${count} grammar exercises at ${profile.gradeLevel} level targeting the same grammar rules they got wrong. Use varied sentence types.`,
  };

  const guidance = subjectGuidance[subject as Subject]
    ?? `Generate ${count} NEW practice problems that target the same concepts and skills, using different numbers/scenarios but testing the same ideas.`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-pro',
    contents: {
      parts: [{
        text: `You are a ${subject} tutor generating practice problems for a ${profile.gradeLevel} student${profile.name ? ` named ${profile.name}` : ''}.

${wrongProblems.length > 0
  ? `The student recently struggled with these ${subject} problems:\n${contextLines}\n\n${guidance}`
  : `The student recently worked on these ${subject} problems:\n${contextLines}\n\nGenerate ${count} NEW practice problems at a similar difficulty level to reinforce these concepts.`
}

Requirements:
- Each problem should be solvable with pencil and paper
- Difficulty must match ${profile.gradeLevel} level
- Write each problem clearly and concisely
- Include the exact correct answer
- Use unique IDs (p1, p2, p3...)

Return as JSON.`,
      }],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          problems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                problemText: { type: Type.STRING },
                correctAnswer: { type: Type.STRING },
              },
              required: ["id", "problemText", "correctAnswer"],
            },
          },
        },
        required: ["problems"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  const parsed = JSON.parse(text);
  return { problems: parsed.problems, gradeLevel: profile.gradeLevel };
};
