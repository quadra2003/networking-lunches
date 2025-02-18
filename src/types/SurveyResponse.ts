// src/types/SurveyResponse.ts
import { Timestamp } from 'firebase/firestore';

export interface SurveyResponse {
  id?: string;
  name: string;
  email: string;
  department?: string;
  availableDays: string[];
  workLocation: 'In-Office' | 'Remote' | 'Hybrid';
  timePreferences: {
    morning?: boolean;
    afternoon?: boolean;
    evening?: boolean;
  };
  officeLocation?: string;
  professionalInterests?: string[];
  dietaryRestrictions?: string[];
  submittedAt?: Timestamp;
  additionalNotes?: string;
}