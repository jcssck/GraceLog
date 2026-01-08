
export enum TemplateType {
  FREE = 'FREE',
  SOAP = 'SOAP',
  ACTS = 'ACTS'
}

export enum SubscriptionStatus {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM'
}

export interface User {
  userId: string;
  email?: string;
  locale: 'ko' | 'en';
  subscriptionStatus: SubscriptionStatus;
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD
  book: string;
  chapter: number;
  verseRange?: string;
  templateType: TemplateType;
  reflectionText: string;
  applicationText: string;
  prayerText: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AIResponse {
  observations: string[];
  applications: string[];
  prayers: string[];
  sharingSummary: {
    summary: string;
    questions: string[];
    prayerPoint: string;
  };
}

export type Locale = 'ko' | 'en';
