
import { GoogleGenAI, Type } from "@google/genai";
import { HomeworkAnalysis, UserProfile } from "../../types";

export const analyzeMathHomework = async (base64Image: string, profile?: UserProfile): Promise<HomeworkAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const studentContext = profile 
    ? `The student is named ${profile.name} and is at a ${profile.gradeLevel} level.` 
    : "The student's grade level is unknown.";

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: `You are a professional math tutor. ${studentContext} Analyze this image of math homework. It may contain typed text or student handwriting.
          
          Your tasks:
          1. Identify each math problem.
          2. Identify the student's written answer for each problem (if any).
          3. Evaluate if the student's answer is mathematically correct.
          4. If incorrect, provide the correct answer and a very brief explanation tailored to their grade level:
             - For "Elementary School": Use simple words, analogies, and focus on basic arithmetic concepts. Avoid complex jargon.
             - For "Middle School": Use clear, step-by-step logic and introduce formal mathematical terms gently.
             - For "High School": Use precise mathematical language and explain the underlying algebraic, geometric, or trigonometric principles and formulas.
             - For "College / University" or "Professional / Adult": Provide concise, technical explanations, assuming a solid foundation in advanced mathematics and focusing on the higher-level logic.
          5. Provide a summary of the overall work and a score (e.g., "4/5 correct").
          6. IMPORTANT: Provide specific feedback on the legibility of the handwriting.
          7. BLANK PAGE DETECTION: If the image appears to be a blank worksheet or a page with NO student handwriting/work/answers at all, set the "isBlankPage" property to true.
          8. UNWORKED PROBLEM DETECTION: If a specific problem has NO student handwriting, work, or answer next to it, set "isUnworked" to true for that problem.
          
          HIGHLIGHTING ERRORS:
          If the student's answer is incorrect:
          - Create a "highlightedStudentAnswer" where you wrap the specific parts of their answer that are wrong in double equals signs (e.g., "x = ==5==").
          - Create a "highlightedProblemText" where you wrap parts of the original problem that the student likely misread or misapplied in double equals signs (e.g., "Solve for ==y==" if they solved for x).
          
          Return the data in the specified JSON format. If a problem is unworked, do not score it as incorrect, simply flag it as isUnworked.`
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
                highlightedProblemText: { type: Type.STRING },
                highlightedStudentAnswer: { type: Type.STRING },
                isUnworked: { type: Type.BOOLEAN, description: "True if the student has not attempted this problem." }
              },
              required: ["id", "problemText", "studentAnswer", "isCorrect", "correctAnswer", "explanation"],
            },
          },
          summary: { type: Type.STRING },
          score: { type: Type.STRING },
          handwritingLegibilityFeedback: { 
            type: Type.STRING,
            description: "Feedback on how easy it was to read the student's handwriting."
          },
          isBlankPage: { 
            type: Type.BOOLEAN,
            description: "True if the page is blank or has no student work."
          }
        },
        required: ["problems", "summary", "score", "handwritingLegibilityFeedback", "isBlankPage"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text) as HomeworkAnalysis;
};
