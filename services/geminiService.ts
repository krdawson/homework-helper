
import { GoogleGenAI, Type } from "@google/genai";
import { HomeworkAnalysis, UserProfile, PracticeSet } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMathHomework = async (
  base64Images: string | string[],
  profile?: UserProfile,
  practiceContext?: PracticeSet
): Promise<HomeworkAnalysis> => {
  const ai = getAI();
  const images = Array.isArray(base64Images) ? base64Images : [base64Images];
  const hintMode = profile?.hintMode ?? false;

  const studentContext = profile
    ? `The student is named ${profile.name || 'the student'} and is at a ${profile.gradeLevel} level.`
    : "The student's grade level is unknown.";

  const practiceInstruction = practiceContext
    ? `IMPORTANT: The student was given these specific practice problems to solve:
${practiceContext.problems.map((p, i) => `${i + 1}. ${p.problemText} [Correct answer: ${p.correctAnswer}]`).join('\n')}
Match each problem you see in the image to the corresponding problem above. You already know the correct answers — use them to grade accurately.`
    : '';

  const hintInstruction = hintMode
    ? `4. For each INCORRECT answer, provide:
       - A short "hint": a single guiding question or gentle nudge pointing to the concept they got wrong WITHOUT giving away the answer.
       - The "correctAnswer" and full "explanation" — these will be hidden from the student until they ask.`
    : `4. For each INCORRECT answer, provide the correct answer and a clear explanation tailored to their grade level. Also include a short "hint" field with a guiding question.`;

  const imageParts = images.map(data => ({
    inlineData: { mimeType: 'image/jpeg' as const, data },
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro-preview-05-06',
    contents: {
      parts: [
        ...imageParts,
        {
          text: `You are a professional math tutor. ${studentContext}
${practiceInstruction}
${images.length > 1 ? `Analyze these ${images.length} images of a multi-page homework worksheet. Treat all pages as one assignment and provide a single combined score.` : 'Analyze this image of math homework.'} It may contain typed text or student handwriting.

Your tasks:
1. Identify each math problem across all pages.
2. Identify the student's written answer for each problem (if any).
3. Evaluate if the student's answer is mathematically correct.
${hintInstruction}
   - For "Elementary School": Use simple words and analogies. Avoid jargon.
   - For "Middle School": Use clear, step-by-step logic with gentle formal terms.
   - For "High School": Use precise mathematical language and explain underlying principles.
   - For "College / University" or "Professional / Adult": Concise and technical, assume solid foundation.
5. Provide a summary of the overall work and a score (e.g., "4/5 correct").
6. IMPORTANT: Provide specific feedback on the legibility of the handwriting.
7. BLANK PAGE DETECTION: If all images appear to be blank with NO student work at all, set "isBlankPage" to true.
8. UNWORKED PROBLEM DETECTION: If a specific problem has NO student answer, set "isUnworked" to true for that problem.

HIGHLIGHTING ERRORS:
If the student's answer is incorrect:
- "highlightedStudentAnswer": wrap the wrong parts in double equals signs (e.g., "x = ==5==").
- "highlightedProblemText": wrap parts of the problem the student likely misread (e.g., "Solve for ==y==").

Return the data in the specified JSON format. Do not score unworked problems as incorrect.`,
        },
      ],
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
        required: ["problems", "summary", "score", "handwritingLegibilityFeedback", "isBlankPage"],
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

  const contextLines = problemsForContext
    .map(p => `- Problem: "${p.problemText}" | Student answer: "${p.studentAnswer}" | Correct: "${p.correctAnswer}" | Issue: "${p.explanation}"`)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro-preview-05-06',
    contents: {
      parts: [{
        text: `You are a math tutor generating practice problems for a ${profile.gradeLevel} student${profile.name ? ` named ${profile.name}` : ''}.

${wrongProblems.length > 0
  ? `The student recently struggled with these problems:\n${contextLines}\n\nGenerate ${count} NEW practice problems that target the same concepts and skills they got wrong. Use different numbers and scenarios but test the same mathematical ideas.`
  : `The student recently worked on these problems:\n${contextLines}\n\nGenerate ${count} NEW practice problems at a similar difficulty level to reinforce these concepts.`
}

Requirements:
- Each problem should be solvable with pencil and paper (no calculator required unless appropriate for ${profile.gradeLevel})
- Difficulty should match ${profile.gradeLevel} level
- Write the problem clearly and concisely
- Include the exact correct answer (just the final value, not steps)
- Number them with unique IDs

Return the problems as JSON.`,
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
  return {
    problems: parsed.problems,
    gradeLevel: profile.gradeLevel,
  };
};
