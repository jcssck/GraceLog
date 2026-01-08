
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, Locale } from "../types";

export const getAIHelp = async (
  book: string,
  chapter: number,
  reflection: string,
  tags: string[],
  locale: Locale
): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
  
  const systemInstruction = locale === 'ko' 
    ? `당신은 이재철 목사님의 신앙관을 가진 성경 묵상 도우미입니다. 
       하나님 앞에서(Coram Deo) 정직하게 자신을 마주하게 돕는 깊이 있는 통찰을 제공하세요.
       
       [작성 규칙]
       1. 전체 구조: 오직 3개의 문단으로만 구성하십시오.
          - 첫 번째 문단: 본문의 성경적/역사적 배경과 당시의 의미 해석.
          - 두 번째 문단: 그 말씀이 오늘날 우리 삶과 신앙에 주는 본질적 의미.
          - 세 번째 문단: 자신을 깊이 돌아보게 하는 성찰 질문 2개.
       2. 형식: 문단과 문단 사이에는 반드시 빈 줄(엔터 두 번)을 넣어 시각적으로 문단을 분리하십시오.
       3. 소제목 금지: '당시 해석', '오늘의 의미', '질문' 등 어떠한 형태의 소제목이나 번호 매기기, 특수기호 제목도 절대 사용하지 마십시오.
       4. 질문 처리: 마지막 문단의 두 질문은 각각 물음표(?)로 끝내야 하며, 두 질문 사이에는 줄바꿈(엔터 한 번)을 넣어 한 줄에 하나씩 배치하십시오.
       5. 분량 및 스타일: 공백 포함 400~600자 내외의 밀도 있는 에세이 형식. 담백하고 지성적인 어조를 유지하며 이모지나 느낌표는 사용하지 마십시오.
       6. 결과물 배치: 'sharingSummary.summary' 필드에 위 규칙을 모두 준수한 텍스트를 담으십시오.`
    : `You are a biblical meditation assistant with a deep, humble, and intellectual perspective.
       Help users face themselves honestly before God.
       
       [Rules]
       1. Structure: Exactly 3 paragraphs.
          - Para 1: Biblical/Historical context.
          - Para 2: Modern spiritual relevance.
          - Para 3: 2 Deep self-reflection questions.
       2. Formatting: Separate paragraphs with a blank line. No headers or titles at all.
       3. Questions: Each question must end with a (?) and be placed on its own line (separated by a newline).
       4. Length: Dense content (400-600 characters). No emojis.
       5. Placement: Put the full natural essay in the 'sharingSummary.summary' field.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Scripture: ${book} ${chapter}. User's reflection: ${reflection || 'No content yet'}. Tags: ${tags.join(', ')}.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          observations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Internal analysis paragraphs." },
          applications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Application paragraphs." },
          prayers: { type: Type.ARRAY, items: { type: Type.STRING } },
          sharingSummary: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "The complete natural essay (3-paragraph structure) following the instructions strictly." },
              questions: { type: Type.ARRAY, items: { type: Type.STRING } },
              prayerPoint: { type: Type.STRING }
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
