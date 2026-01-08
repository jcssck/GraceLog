
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, Locale } from "../types";

export const getAIHelp = async (
  book: string,
  chapter: number,
  reflection: string,
  tags: string[],
  locale: Locale
): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const systemInstruction = locale === 'ko' 
    ? `성경 묵상 도우미입니다. 사용자의 묵상을 깊게 하고 나눔을 돕습니다.
       - 정답을 단정하지 말고 "이런 관점은 어떠신가요?"라는 뉘앙스로 제안하세요.
       - 관찰(Observation) 3개: 본문의 핵심 메시지나 역사적 배경 제안.
       - 적용(Application) 3개: '오늘 하루 누군가에게 따뜻한 말 한마디 하기'처럼 구체적이고 실천 가능한 행동 제안.
       - 기도(Prayer) 2개: 짧고 진솔한 기도문.
       - 나눔 요약: 단톡방 공유를 위한 3줄 요약과 묵상 질문 2개.`
    : `Biblical meditation assistant. Help users deepen their reflection and sharing.
       - Offer suggestions rather than definitive answers.
       - 3 Observations: Key message or historical context.
       - 3 Applications: Concrete, actionable steps (e.g., 'Send a word of encouragement to a friend').
       - 2 Prayers: Short, sincere prayers.
       - Sharing Summary: 3-line summary and 2 discussion questions for group chats.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Scripture: ${book} ${chapter}. User's raw reflection: ${reflection || 'No content yet'}. Tags: ${tags.join(', ')}.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          observations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 diverse observations to deepen meditation."
          },
          applications: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 practical, specific actionable steps."
          },
          prayers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2 heartfelt short prayer suggestions."
          },
          sharingSummary: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "3-line sharing summary." },
              questions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2 short discussion questions." },
              prayerPoint: { type: Type.STRING, description: "1 focused prayer point for the group." }
            },
            required: ["summary", "questions", "prayerPoint"]
          }
        },
        required: ["observations", "applications", "prayers", "sharingSummary"]
      }
    }
  });

  return JSON.parse(response.text) as AIResponse;
};
