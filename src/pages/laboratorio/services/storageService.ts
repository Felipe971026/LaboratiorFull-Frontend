import { db, auth, handleFirestoreError, OperationType } from '../../../firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { LabResultData } from '../types';

const COLLECTION_NAME = 'labResults';
const MAX_RESULTS = 20;

export async function loadResults(): Promise<LabResultData[]> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return [];
  }
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('date', 'desc'),
      limit(MAX_RESULTS)
    );
    const querySnapshot = await getDocs(q);
    const results: LabResultData[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as LabResultData);
    });
    return results;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, COLLECTION_NAME);
    return [];
  }
}

function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (data[key] !== undefined) {
        sanitized[key] = sanitizeData(data[key]);
      }
    }
    return sanitized;
  }
  return data;
}

export async function saveResult(result: LabResultData): Promise<LabResultData[]> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return [];
  }
  try {
    const { id, ...dataToSave } = result;
    const sanitizedData = sanitizeData(dataToSave);
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...sanitizedData,
      uid: auth.currentUser.uid,
      userEmail: auth.currentUser.email
    });
    
    // Return updated list
    return await loadResults();
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, COLLECTION_NAME);
    return [];
  }
}

export async function updateResult(id: string, result: Partial<LabResultData>): Promise<void> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return;
  }
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const sanitizedData = sanitizeData(result);
    
    await updateDoc(docRef, {
      ...sanitizedData,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser.email
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteResult(id: string): Promise<void> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return;
  }
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function clearAllResults(): Promise<void> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return;
  }
  try {
    const results = await loadResults();
    for (const result of results) {
      if (result.id) {
        await deleteDoc(doc(db, COLLECTION_NAME, result.id));
      }
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, COLLECTION_NAME);
  }
}
