import { Injectable } from '@angular/core';
import { JsonSection, JsonDocument, UNASSIGNED_JSON_SECTION_ID } from '../models/json-workspace.models';

const DB_NAME = 'json_workspace_db';
const DB_VERSION = 1;
const STORE_SECTIONS = 'json_sections';
const STORE_DOCUMENTS = 'json_documents';

@Injectable({
  providedIn: 'root',
})
export class JsonIndexedDbService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async getDb(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_SECTIONS)) {
          const sectionStore = db.createObjectStore(STORE_SECTIONS, { keyPath: 'id' });
          sectionStore.createIndex('order', 'order', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
          const docStore = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
          docStore.createIndex('sectionId', 'sectionId', { unique: false });
          docStore.createIndex('order', 'order', { unique: false });
        }
      };

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event: Event) => {
        console.error('Failed to open JSON IndexedDB:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.initPromise;
  }

  // --- SECTIONS ---

  async getAllSections(): Promise<JsonSection[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SECTIONS, 'readonly');
      const store = tx.objectStore(STORE_SECTIONS);
      const request = store.getAll();

      request.onsuccess = () => {
        const sections: JsonSection[] = request.result || [];
        sections.sort((a, b) => a.order - b.order);
        resolve(sections);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSection(section: JsonSection): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SECTIONS, 'readwrite');
      const store = tx.objectStore(STORE_SECTIONS);
      const request = store.put(section);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveSections(sections: JsonSection[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SECTIONS, 'readwrite');
      const store = tx.objectStore(STORE_SECTIONS);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      for (const section of sections) {
        store.put(section);
      }
    });
  }

  async deleteSection(id: string): Promise<void> {
    if (id === UNASSIGNED_JSON_SECTION_ID) {
      throw new Error('Cannot delete system Unassigned section.');
    }
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SECTIONS, 'readwrite');
      const store = tx.objectStore(STORE_SECTIONS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- DOCUMENTS ---

  async getAllDocuments(): Promise<JsonDocument[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const docs: JsonDocument[] = request.result || [];
        docs.sort((a, b) => a.order - b.order);
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocument(doc: JsonDocument): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const request = store.put(doc);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocuments(docs: JsonDocument[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      for (const doc of docs) {
        store.put(doc);
      }
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocumentsBySection(sectionId: string): Promise<void> {
    const docs = await this.getAllDocuments();
    const sectionDocs = docs.filter((d) => d.sectionId === sectionId);
    if (sectionDocs.length === 0) return;

    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      for (const doc of sectionDocs) {
        store.delete(doc.id);
      }
    });
  }
}
