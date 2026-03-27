import { ReceivedUnitRecord } from '../pages/hemoderivados/types';

export const dataService = {
  async getRecords<T>(collection: string): Promise<T[]> {
    const response = await fetch(`/api/records/${collection}`);
    if (!response.ok) throw new Error(`Failed to fetch ${collection}`);
    return response.json();
  },

  async saveRecord<T>(collection: string, record: T): Promise<T> {
    const response = await fetch(`/api/records/${collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(`Failed to save to ${collection}`);
    return response.json();
  },

  async deleteRecord(collection: string, id: string): Promise<void> {
    const response = await fetch(`/api/records/${collection}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete from ${collection}`);
  }
};
