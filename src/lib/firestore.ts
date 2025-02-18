// src/lib/firestore.ts
import { 
    collection, 
    addDoc, 
    Timestamp, 
    getFirestore,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    QueryDocumentSnapshot
  } from 'firebase/firestore';
  import { app } from './firebase';
  import { SurveyResponse } from '../types/SurveyResponse';
  
// Remove or comment out the unused import
// If you might use it later, add a comment to disable the lint rule
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { DocumentSnapshot } from 'firebase/firestore';

  // Initialize Firestore
  const db = getFirestore(app);
  
  // Reference to the survey responses collection
  const surveyResponsesRef = collection(db, 'survey-responses');
  
  // Submit a new survey response
  export const submitSurveyResponse = async (data: SurveyResponse) => {
    try {
      const docRef = await addDoc(surveyResponsesRef, {
        ...data,
        submittedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error submitting survey:', error);
      throw error;
    }
  };
  
  // Check if an email has already submitted a survey
  export const checkEmailSubmitted = async (email: string): Promise<boolean> => {
    try {
      const q = query(surveyResponsesRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking email submission:', error);
      return false;
    }
  };
  
  // Retrieve all survey responses
  export const getAllSurveyResponses = async (): Promise<SurveyResponse[]> => {
    try {
      const querySnapshot = await getDocs(surveyResponsesRef);
      return querySnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
      } as SurveyResponse));
    } catch (error) {
      console.error('Error fetching survey responses:', error);
      return [];
    }
  };
  
  // Get survey response by ID
  export const getSurveyResponseById = async (id: string): Promise<SurveyResponse | null> => {
    try {
      const docRef = doc(db, 'survey-responses', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as SurveyResponse;
      }
      return null;
    } catch (error) {
      console.error('Error fetching survey response:', error);
      return null;
    }
  };