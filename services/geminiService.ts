
import { GoogleGenAI, Type } from "@google/genai";
import { HomeworkAnalysis, UserProfile } from "../types";

export const analyzeMathHomework = async (
  base64Images: string | string[],
  profile?: UserProfile
): Promise<HomeworkAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const images = Array.isArray(base64Images) ? base64Images : [base64Images];
  const hintMode = profile?.hintMode ?? false;

  const studentContext = profile
    ? `The student is named ${profile.name || 'the student'} and is at a ${profile.gradeLevel} level.`
    : "The student's grade level is unknown.";

  const hintInstruction = hintMode
    ? `4. For each INCORRECT answer, provide:
       - A short "hint": a single guiding question or gentle nudge pointing to the concept they got wrong WITHOUT giving away the answer (e.g. "What happens when you multiply two negative numbers?")
       - The "correctAnswer" and full "explanation" — these will be hidden from the student until they ask.`
    : `4. For each INCORRECT answer, provide the correct answer and a clear explanation tailored to their grade level. Also include a short "hint" field with a guiding question in case it's needed.`;

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
                  description: "A guiding question that nudges the student toward the right answer without revealing it."
                },
                highlightedProblemText: { type: Type.STRING },
                highlightedStudentAnswer: { type: Type.STRING },
                isUnworked: {
                  type: Type.BOOLEAN,
                  description: "True if the student has not attempted this problem."
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
