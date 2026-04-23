import { auth } from '../../../firebase';
import { LabResultData } from '../types';

const COLLECTION_NAME = 'labResults';

export async function loadResults(): Promise<LabResultData[]> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return [];
  }
  try {
    const response = await fetch(`/api/records/${COLLECTION_NAME}`);
    if (!response.ok) throw new Error('Failed to fetch results');
    return await response.json();
  } catch (e) {
    console.error('Error loading results:', e);
    return [];
  }
}

export async function saveResult(result: LabResultData): Promise<LabResultData[]> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return [];
  }
  try {
    const response = await fetch(`/api/records/${COLLECTION_NAME}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...result,
        userEmail: auth.currentUser.email,
        uid: auth.currentUser.uid
      })
    });
    
    if (!response.ok) throw new Error('Failed to save result');
    
    // Return updated list
    return await loadResults();
  } catch (e) {
    console.error('Error saving result:', e);
    return [];
  }
}

export async function updateResult(id: string, result: Partial<LabResultData>): Promise<void> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return;
  }
  try {
    await fetch(`/api/records/${COLLECTION_NAME}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...result,
        id,
        userEmail: auth.currentUser.email,
        uid: auth.currentUser.uid
      })
    });
  } catch (e) {
    console.error('Error updating result:', e);
  }
}

export async function deleteResult(id: string): Promise<void> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return;
  }
  try {
    await fetch(`/api/records/${COLLECTION_NAME}/${id}`, {
      method: 'DELETE'
    });
  } catch (e) {
    console.error('Error deleting result:', e);
  }
}

export async function clearAllResults(): Promise<void> {
  // Not implemented in API yet, but we can delete one by one if needed
  const results = await loadResults();
  for (const result of results) {
    await deleteResult(result.id);
  }
}

export async function deleteResultsForPatient(results: LabResultData[]): Promise<void> {
  if (typeof window === 'undefined' || !auth.currentUser) {
    return;
  }
  try {
    const deletePromises = results.map(r => deleteResult(r.id));
    await Promise.all(deletePromises);
  } catch (e) {
    console.error('Error deleting results for patient:', e);
  }
}
