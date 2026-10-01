import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, debounceTime } from 'rxjs';
import {
  JsonDocument,
  JsonParseResult,
  JsonSection,
  JsonStats,
  JsonTreeNode,
  UNASSIGNED_JSON_SECTION_ID,
} from '../models/json-workspace.models';
import { LayoutMode, SaveStatus } from '../models/workspace.models';
import { JsonIndexedDbService } from '../storage/json-indexeddb.service';
import { PreferencesService } from '../storage/preferences.service';
import { JsonFormatterService } from './json-formatter.service';

const INITIAL_EXAMPLE_PAYLOAD = JSON.stringify(
  {
    apiVersion: '2.4.0',
    meta: {
      title: 'Nobody JSON Previewer',
      author: 'Nobody Engineering',
      tags: ['json', 'devtools', 'local-first', 'tree-viewer'],
      isProduction: true,
      metrics: {
        stars: 1240,
        forks: 88,
        rating: 4.95,
      },
    },
    users: [
      {
        id: 'usr-901',
        name: 'Alex Rivera',
        role: 'Lead Architect',
        email: 'alex.rivera@nobody.dev',
        active: true,
        permissions: ['read', 'write', 'admin'],
        address: {
          city: 'San Francisco',
          state: 'CA',
          country: 'United States',
          coordinates: { lat: 37.7749, lng: -122.4194 },
        },
      },
      {
        id: 'usr-902',
        name: 'Sophia Chen',
        role: 'Frontend Specialist',
        email: 'sophia.chen@nobody.dev',
        active: true,
        permissions: ['read', 'write'],
        address: {
          city: 'Tokyo',
          state: 'Kanto',
          country: 'Japan',
          coordinates: { lat: 35.6762, lng: 139.6503 },
        },
      },
    ],
    features: {
      interactiveTree: true,
      codeMirrorLinter: true,
      autoPrettify: true,
      offlineSupport: true,
      maxPayloadMB: 5.0,
      experimentalFeatures: null,
    },
  },
  null,
  2
);

const INITIAL_CONFIG_PAYLOAD = JSON.stringify(
  {
    theme: 'system',
    editor: {
      tabSize: 2,
      lineNumbers: true,
      autoCloseBrackets: true,
      foldGutter: true,
      lint: true,
    },
    viewer: {
      initialExpandDepth: 2,
      showItemCount: true,
      showTypeBadges: true,
      highlightSearchMatches: true,
    },
    storage: {
      databaseName: 'json_workspace_db',
      autosaveDebounceMs: 350,
      quotaAlertThresholdMB: 50,
    },
  },
  null,
  2
);

@Injectable({
  providedIn: 'root',
})
export class JsonWorkspaceStore {
  private indexedDb = inject(JsonIndexedDbService);
  private prefService = inject(PreferencesService);
  private formatter = inject(JsonFormatterService);

  // State Signals
  readonly isInitialized = signal<boolean>(false);
  readonly sections = signal<JsonSection[]>([]);
  readonly documents = signal<JsonDocument[]>([]);
  readonly activeDocumentId = signal<string | null>(null);
  readonly saveStatus = signal<SaveStatus>('idle');

  // Preferences Signals
  readonly layoutMode = signal<LayoutMode>('default');
  readonly resourcePanelWidth = signal<number>(280);
  readonly editorPanelWidth = signal<number>(450);
  readonly expandDepth = signal<number>(2);
  readonly filterQuery = signal<string>('');
  readonly treeFilterQuery = signal<string>('');

  // Computed signals
  readonly activeDocument = computed(() => {
    const id = this.activeDocumentId();
    if (!id) return null;
    return this.documents().find((d) => d.id === id) || null;
  });

  readonly parseResult = computed<JsonParseResult>(() => {
    const doc = this.activeDocument();
    if (!doc) return { valid: true, data: null };
    return this.formatter.validate(doc.content);
  });

  readonly treeData = computed<{ tree: JsonTreeNode[]; error?: string; stats: JsonStats }>(() => {
    const doc = this.activeDocument();
    if (!doc) {
      return {
        tree: [],
        stats: { sizeBytes: 0, formattedLines: 0, depth: 0, totalKeys: 0 },
      };
    }
    return this.formatter.parseToTree(doc.content, this.expandDepth());
  });

  // Debounced autosave pipeline
  private autosaveSubject = new Subject<{ id: string; content: string }>();

  constructor() {
    this.autosaveSubject.pipe(debounceTime(350)).subscribe(({ id, content }) => {
      this.persistDocumentContent(id, content);
    });
  }

  async initialize(): Promise<void> {
    const prefs = this.prefService.loadPreferences();
    this.layoutMode.set(prefs.layoutMode || 'default');
    this.resourcePanelWidth.set(prefs.resourcePanelWidth || 280);
    this.editorPanelWidth.set(prefs.editorPanelWidth || 450);

    try {
      let sections = await this.indexedDb.getAllSections();
      let documents = await this.indexedDb.getAllDocuments();

      // Ensure Unassigned section exists
      let unassigned = sections.find((s) => s.id === UNASSIGNED_JSON_SECTION_ID);
      if (!unassigned) {
        unassigned = {
          id: UNASSIGNED_JSON_SECTION_ID,
          name: 'Unassigned',
          order: 0,
          isSystem: true,
          collapsed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await this.indexedDb.saveSection(unassigned);
        sections.unshift(unassigned);
      }

      // If workspace is completely empty, seed with initial fixtures
      if (documents.length === 0) {
        await this.seedInitialFixtures();
        sections = await this.indexedDb.getAllSections();
        documents = await this.indexedDb.getAllDocuments();
      }

      this.sections.set(sections);
      this.documents.set(documents);

      if (documents.length > 0) {
        this.activeDocumentId.set(documents[0].id);
      }

      this.isInitialized.set(true);
    } catch (err) {
      console.error('Failed to initialize JSON workspace:', err);
      this.isInitialized.set(true);
    }
  }

  private async seedInitialFixtures(): Promise<void> {
    const now = new Date().toISOString();

    const apiSection: JsonSection = {
      id: 'section-api-specs',
      name: 'API Specifications',
      order: 1,
      isSystem: false,
      collapsed: false,
      createdAt: now,
      updatedAt: now,
    };

    const configSection: JsonSection = {
      id: 'section-configs',
      name: 'App Configurations',
      order: 2,
      isSystem: false,
      collapsed: false,
      createdAt: now,
      updatedAt: now,
    };

    const doc1: JsonDocument = {
      id: 'json-doc-api-profile',
      sectionId: apiSection.id,
      fileName: 'user-profile-api.json',
      title: 'User Profile Response Payload',
      content: INITIAL_EXAMPLE_PAYLOAD,
      order: 0,
      sourceType: 'created',
      createdAt: now,
      updatedAt: now,
    };

    const doc2: JsonDocument = {
      id: 'json-doc-app-config',
      sectionId: configSection.id,
      fileName: 'app-settings.json',
      title: 'Nobody Application Settings',
      content: INITIAL_CONFIG_PAYLOAD,
      order: 0,
      sourceType: 'created',
      createdAt: now,
      updatedAt: now,
    };

    await this.indexedDb.saveSection(apiSection);
    await this.indexedDb.saveSection(configSection);
    await this.indexedDb.saveDocument(doc1);
    await this.indexedDb.saveDocument(doc2);
  }

  // --- SECTIONS ACTIONS ---

  async createSection(name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) return '';

    const newSection: JsonSection = {
      id: 'section-' + Date.now(),
      name: trimmed,
      order: this.sections().length,
      isSystem: false,
      collapsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.indexedDb.saveSection(newSection);
    this.sections.update((list) => [...list, newSection]);
    return newSection.id;
  }

  async renameSection(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;

    const section = this.sections().find((s) => s.id === id);
    if (!section || section.isSystem) return;

    const updated: JsonSection = {
      ...section,
      name: trimmed,
      updatedAt: new Date().toISOString(),
    };

    await this.indexedDb.saveSection(updated);
    this.sections.update((list) => list.map((s) => (s.id === id ? updated : s)));
  }

  async deleteSection(id: string): Promise<void> {
    const section = this.sections().find((s) => s.id === id);
    if (!section || section.isSystem) return;

    // Move all documents in this section to Unassigned
    const sectionDocs = this.documents().filter((d) => d.sectionId === id);
    const updatedDocs = sectionDocs.map((doc) => ({
      ...doc,
      sectionId: UNASSIGNED_JSON_SECTION_ID,
      updatedAt: new Date().toISOString(),
    }));

    if (updatedDocs.length > 0) {
      await this.indexedDb.saveDocuments(updatedDocs);
      this.documents.update((docs) =>
        docs.map((d) => (d.sectionId === id ? { ...d, sectionId: UNASSIGNED_JSON_SECTION_ID } : d))
      );
    }

    await this.indexedDb.deleteSection(id);
    this.sections.update((list) => list.filter((s) => s.id !== id));
  }

  toggleSectionCollapse(id: string): void {
    const section = this.sections().find((s) => s.id === id);
    if (!section) return;

    const updated: JsonSection = {
      ...section,
      collapsed: !section.collapsed,
      updatedAt: new Date().toISOString(),
    };

    this.indexedDb.saveSection(updated);
    this.sections.update((list) => list.map((s) => (s.id === id ? updated : s)));
  }

  // --- DOCUMENTS ACTIONS ---

  async createDocument(
    sectionId: string = UNASSIGNED_JSON_SECTION_ID,
    fileName?: string,
    content?: string
  ): Promise<string> {
    const count = this.documents().filter((d) => d.sectionId === sectionId).length;
    const finalName = fileName || `document-${count + 1}.json`;
    const initialJson = content || '{\n  "title": "New JSON Document",\n  "createdAt": "' + new Date().toISOString() + '"\n}';

    const newDoc: JsonDocument = {
      id: 'json-' + Date.now(),
      sectionId,
      fileName: finalName,
      title: finalName.replace(/\.json$/i, ''),
      content: initialJson,
      order: count,
      sourceType: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.indexedDb.saveDocument(newDoc);
    this.documents.update((list) => [...list, newDoc]);
    this.activeDocumentId.set(newDoc.id);
    return newDoc.id;
  }

  selectDocument(id: string): void {
    const doc = this.documents().find((d) => d.id === id);
    if (doc) {
      this.activeDocumentId.set(id);
    }
  }

  updateActiveDocumentContent(newContent: string): void {
    const activeId = this.activeDocumentId();
    if (!activeId) return;

    this.saveStatus.set('editing');
    this.documents.update((docs) =>
      docs.map((d) => (d.id === activeId ? { ...d, content: newContent } : d))
    );

    this.autosaveSubject.next({ id: activeId, content: newContent });
  }

  private async persistDocumentContent(id: string, content: string): Promise<void> {
    const doc = this.documents().find((d) => d.id === id);
    if (!doc) return;

    this.saveStatus.set('saving');
    try {
      const updated: JsonDocument = {
        ...doc,
        content,
        updatedAt: new Date().toISOString(),
      };
      await this.indexedDb.saveDocument(updated);
      this.saveStatus.set('saved');
    } catch (err) {
      console.error('Failed to autosave JSON document:', err);
      this.saveStatus.set('error');
    }
  }

  async forceSave(): Promise<void> {
    const doc = this.activeDocument();
    if (!doc) return;
    await this.persistDocumentContent(doc.id, doc.content);
  }

  async renameDocument(id: string, newFileName: string): Promise<void> {
    const trimmed = newFileName.trim();
    if (!trimmed) return;
    const finalName = trimmed.endsWith('.json') ? trimmed : `${trimmed}.json`;

    const doc = this.documents().find((d) => d.id === id);
    if (!doc) return;

    const updated: JsonDocument = {
      ...doc,
      fileName: finalName,
      title: finalName.replace(/\.json$/i, ''),
      updatedAt: new Date().toISOString(),
    };

    await this.indexedDb.saveDocument(updated);
    this.documents.update((docs) => docs.map((d) => (d.id === id ? updated : d)));
  }

  async deleteDocument(id: string): Promise<void> {
    await this.indexedDb.deleteDocument(id);
    const remaining = this.documents().filter((d) => d.id !== id);
    this.documents.set(remaining);

    if (this.activeDocumentId() === id) {
      this.activeDocumentId.set(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  async moveDocument(docId: string, targetSectionId: string): Promise<void> {
    const doc = this.documents().find((d) => d.id === docId);
    if (!doc || doc.sectionId === targetSectionId) return;

    const countInTarget = this.documents().filter((d) => d.sectionId === targetSectionId).length;
    const updated: JsonDocument = {
      ...doc,
      sectionId: targetSectionId,
      order: countInTarget,
      updatedAt: new Date().toISOString(),
    };

    await this.indexedDb.saveDocument(updated);
    this.documents.update((docs) => docs.map((d) => (d.id === docId ? updated : d)));
  }

  async reorderDocuments(sectionId: string, prevIdx: number, currIdx: number): Promise<void> {
    const sectionDocs = this.documents()
      .filter((d) => d.sectionId === sectionId)
      .sort((a, b) => a.order - b.order);

    if (prevIdx < 0 || prevIdx >= sectionDocs.length || currIdx < 0 || currIdx >= sectionDocs.length) {
      return;
    }

    const [moved] = sectionDocs.splice(prevIdx, 1);
    sectionDocs.splice(currIdx, 0, moved);

    const updated = sectionDocs.map((doc, idx) => ({
      ...doc,
      order: idx,
      updatedAt: new Date().toISOString(),
    }));

    await this.indexedDb.saveDocuments(updated);
    const updatedMap = new Map(updated.map((d) => [d.id, d]));
    this.documents.update((allDocs) => allDocs.map((d) => updatedMap.get(d.id) || d));
  }

  // --- IMPORT FILES ---

  async importMultipleFiles(files: File[], targetSectionId: string = UNASSIGNED_JSON_SECTION_ID): Promise<void> {
    const now = new Date().toISOString();
    const newDocs: JsonDocument[] = [];
    let currentOrder = this.documents().filter((d) => d.sectionId === targetSectionId).length;

    for (const file of files) {
      if (!file.name.endsWith('.json') && file.type !== 'application/json' && !file.name.endsWith('.txt')) {
        continue;
      }

      try {
        const text = await file.text();
        // Validate if it is valid JSON
        let validatedContent = text;
        const check = this.formatter.validate(text);
        if (check.valid && check.data !== null && check.data !== undefined) {
          validatedContent = JSON.stringify(check.data, null, 2);
        }

        const fileName = file.name.endsWith('.json') ? file.name : `${file.name}.json`;
        const doc: JsonDocument = {
          id: 'json-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          sectionId: targetSectionId,
          fileName,
          title: fileName.replace(/\.json$/i, ''),
          content: validatedContent,
          order: currentOrder++,
          sourceType: 'imported',
          createdAt: now,
          updatedAt: now,
        };
        newDocs.push(doc);
      } catch (err) {
        console.warn(`Failed reading file ${file.name}:`, err);
      }
    }

    if (newDocs.length > 0) {
      await this.indexedDb.saveDocuments(newDocs);
      this.documents.update((list) => [...list, ...newDocs]);
      this.activeDocumentId.set(newDocs[0].id);
    }
  }

  // --- FORMATTING ACTIONS ---

  prettifyActiveDocument(indent: 2 | 4 | '\t' = 2): boolean {
    const doc = this.activeDocument();
    if (!doc) return false;

    try {
      const formatted = this.formatter.prettify(doc.content, indent);
      this.updateActiveDocumentContent(formatted);
      return true;
    } catch (e) {
      return false;
    }
  }

  minifyActiveDocument(): boolean {
    const doc = this.activeDocument();
    if (!doc) return false;

    try {
      const minified = this.formatter.minify(doc.content);
      this.updateActiveDocumentContent(minified);
      return true;
    } catch (e) {
      return false;
    }
  }

  sortKeysActiveDocument(indent: 2 | 4 | '\t' = 2): boolean {
    const doc = this.activeDocument();
    if (!doc) return false;

    try {
      const sorted = this.formatter.sortKeys(doc.content, indent);
      this.updateActiveDocumentContent(sorted);
      return true;
    } catch (e) {
      return false;
    }
  }

  // --- PREFERENCES ACTIONS ---

  setLayoutMode(mode: LayoutMode): void {
    this.layoutMode.set(mode);
    this.savePrefs();
  }

  setResourcePanelWidth(width: number): void {
    const clamped = Math.max(200, Math.min(500, width));
    this.resourcePanelWidth.set(clamped);
    this.savePrefs();
  }

  setEditorPanelWidth(width: number): void {
    const clamped = Math.max(260, Math.min(700, width));
    this.editorPanelWidth.set(clamped);
    this.savePrefs();
  }

  setExpandDepth(depth: number): void {
    this.expandDepth.set(Math.max(1, Math.min(10, depth)));
  }

  private savePrefs(): void {
    const current = this.prefService.loadPreferences();
    this.prefService.savePreferences({
      ...current,
      layoutMode: this.layoutMode(),
      resourcePanelWidth: this.resourcePanelWidth(),
      editorPanelWidth: this.editorPanelWidth(),
    });
  }
}
