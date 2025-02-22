import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const generateReportSummary = async (reportText: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `Analyze this medical report and provide a simple, easy-to-understand summary for a patient:
  ${reportText}

  Please format your response in this structure:
  1. Start with a simple overview of what was tested
  2. Explain the main findings in plain language
  3. Highlight what's normal and what needs attention
  4. What these results mean for daily life
  5. Any important changes from normal values

  Guidelines:
  - Avoid medical jargon - use simple terms
  - Explain medical terms if you must use them
  - Use bullet points for better readability
  - Include a "What This Means for You" section
  - Add recommendations for next steps if needed`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

export const compareSummaries = async (oldSummary: string, newSummary: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `Compare these two medical reports in simple, everyday language that a patient can understand:
  
  Previous Report:
  ${oldSummary}
  
  New Report:
  ${newSummary}

  Please structure your response as follows:
  1. What's Better: [List improvements in simple terms]
  2. What Needs Attention: [List areas of concern in simple terms]
  3. Key Changes: [Explain the main differences]
  4. What This Means: [Practical implications for daily life]

  Guidelines:
  - Use simple, everyday language
  - Explain any medical terms you need to use
  - Use ✅ for improvements
  - Use ⚠️ for areas needing attention
  - Use 📈 or 📉 to show trends`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};

export const generateDietPlan = async (reportSummary: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `Based on this medical report, create a simple, practical diet plan that's easy to follow:
  ${reportSummary}

  Structure the response as follows:

  🎯 Your Goals:
  • Simple, achievable dietary goals in everyday language

  ✅ Green Foods (Eat Freely):
  • List everyday foods that are good for the condition
  • Include common names and simple descriptions
  • Add serving suggestions where helpful

  🟡 Yellow Foods (Eat in Moderation):
  • List foods to limit, with clear portion guidance
  • Include practical alternatives
  • Add simple explanations for why these should be limited

  ❌ Red Foods (Better to Avoid):
  • List foods to avoid
  • Explain why in simple terms
  • Suggest healthy alternatives

  ⏰ Meal Timing:
  • Simple, practical timing guidelines
  • Include realistic meal spacing
  • Add snack suggestions

  💡 Helpful Tips:
  • Practical tips for grocery shopping
  • Easy meal prep suggestions
  • Budget-friendly options
  • Simple substitutions for favorite foods

  Format Guidelines:
  - Use everyday language
  - Include practical portion sizes
  - Add simple cooking suggestions
  - Include affordable options
  - Make recommendations realistic for busy people`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};
