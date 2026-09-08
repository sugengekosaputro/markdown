import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, debounceTime } from 'rxjs';
import {
  LayoutMode,
  MarkdownDocument,
  OutlineItem,
  SaveStatus,
  SearchResult,
  Section,
  ThemeMode,
  UNASSIGNED_SECTION_ID,
  WorkspacePreferences,
} from '../models/workspace.models';
import { IndexedDbService } from '../storage/indexeddb.service';
import { PreferencesService } from '../storage/preferences.service';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceStore {
  private indexedDb = inject(IndexedDbService);
  private prefService = inject(PreferencesService);

  // State Signals
  readonly isInitialized = signal<boolean>(false);
  readonly sections = signal<Section[]>([]);
  readonly documents = signal<MarkdownDocument[]>([]);
  readonly activeDocumentId = signal<string | null>(null);
  readonly saveStatus = signal<SaveStatus>('idle');

  // Preferences Signals
  readonly theme = signal<ThemeMode>('system');
  readonly layoutMode = signal<LayoutMode>('default');
  readonly resourcePanelWidth = signal<number>(280);
  readonly editorPanelWidth = signal<number>(360);
  readonly resourceActiveTab = signal<'files' | 'outline'>('files');

  // Computed signals
  readonly activeDocument = computed(() => {
    const id = this.activeDocumentId();
    if (!id) return null;
    return this.documents().find((d) => d.id === id) || null;
  });

  readonly outline = computed<OutlineItem[]>(() => {
    const doc = this.activeDocument();
    if (!doc) return [];
    return this.extractOutline(doc.content);
  });

  // Debounced autosave subject
  private autosaveSubject = new Subject<{ id: string; content: string }>();

  constructor() {
    this.autosaveSubject.pipe(debounceTime(350)).subscribe(({ id, content }) => {
      this.persistDocumentContent(id, content);
    });

    // Listen to system color scheme changes if theme is 'system'
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme() === 'system') {
          this.applyThemeToDom('system');
        }
      });
    }
  }

  async initialize(): Promise<void> {
    const prefs = this.prefService.loadPreferences();
    this.theme.set(prefs.theme);
    this.layoutMode.set(prefs.layoutMode);
    this.resourcePanelWidth.set(prefs.resourcePanelWidth);
    this.editorPanelWidth.set(prefs.editorPanelWidth);
    this.resourceActiveTab.set(prefs.resourceActiveTab);
    this.applyThemeToDom(prefs.theme);

    try {
      let sections = await this.indexedDb.getAllSections();
      let documents = await this.indexedDb.getAllDocuments();

      // Ensure Unassigned section exists
      let unassigned = sections.find((s) => s.id === UNASSIGNED_SECTION_ID);
      if (!unassigned) {
        unassigned = {
          id: UNASSIGNED_SECTION_ID,
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

      // If workspace is completely empty (only unassigned section and 0 documents),
      // seed with the example fixture
      if (documents.length === 0) {
        await this.seedInitialFixture();
        sections = await this.indexedDb.getAllSections();
        documents = await this.indexedDb.getAllDocuments();
      }

      this.sections.set(sections);
      this.documents.set(documents);

      // Determine active document
      const lastActiveId = prefs.activeDocumentId;
      if (lastActiveId && documents.some((d) => d.id === lastActiveId)) {
        this.activeDocumentId.set(lastActiveId);
      } else if (documents.length > 0) {
        this.activeDocumentId.set(documents[0].id);
      }
    } catch (error) {
      console.error('Failed to initialize workspace data from IndexedDB:', error);
      this.saveStatus.set('error');
    } finally {
      this.isInitialized.set(true);
    }
  }

  private async seedInitialFixture(): Promise<void> {
    try {
      let fixtureContent = '';
      try {
        const response = await fetch('/fixtures/markdown-viewer-example.md');
        if (response.ok) {
          fixtureContent = await response.text();
        }
      } catch (err) {
        console.warn('Could not fetch fixture from static path, using fallback demo:', err);
      }

      if (!fixtureContent) {
        fixtureContent = `# Welcome to Local Technical Markdown Workspace

A local-first workspace for reading, editing, and visualizing technical documentation and Mermaid diagrams.

## Quick Start
- Organize documents into **Sections**.
- Switch to **Outline** tab to view table of contents.
- Edit raw Markdown with live preview in the right panel.

\`\`\`mermaid
flowchart LR
    A[Import Markdown] --> B[Workspace Store]
    B --> C[IndexedDB Persistence]
    B --> D[Live Viewer & Mermaid]
\`\`\`
`;
      }

      // Create Demo section
      const demoSection: Section = {
        id: 'section-demo-' + Date.now(),
        name: 'Demo & Panduan',
        order: 1,
        isSystem: false,
        collapsed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const fixtureDoc: MarkdownDocument = {
        id: 'doc-fixture-' + Date.now(),
        sectionId: demoSection.id,
        fileName: 'markdown-viewer-example.md',
        title: 'Markdown Viewer Complete Example',
        content: fixtureContent,
        order: 0,
        sourceType: 'created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.indexedDb.saveSection(demoSection);
      await this.indexedDb.saveDocument(fixtureDoc);
    } catch (e) {
      console.error('Error during initial fixture seeding:', e);
    }
  }

  // --- SECTIONS ACTIONS ---

  async createSection(name: string): Promise<Section> {
    const trimmed = name.trim() || 'New Section';
    const order = this.sections().length;
    const newSection: Section = {
      id: 'section-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: trimmed,
      order,
      isSystem: false,
      collapsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...this.sections(), newSection];
    this.sections.set(updated);
    await this.indexedDb.saveSection(newSection);
    return newSection;
  }

  async renameSection(sectionId: string, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const currentSections = this.sections();
    const target = currentSections.find((s) => s.id === sectionId);
    if (!target || target.isSystem) return;

    const updatedSection = { ...target, name: trimmed, updatedAt: new Date().toISOString() };
    this.sections.set(currentSections.map((s) => (s.id === sectionId ? updatedSection : s)));
    await this.indexedDb.saveSection(updatedSection);
  }

  toggleSectionCollapse(sectionId: string): void {
    const currentSections = this.sections();
    const updated = currentSections.map((s) =>
      s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
    );
    this.sections.set(updated);
    const target = updated.find((s) => s.id === sectionId);
    if (target) {
      this.indexedDb.saveSection(target);
    }
  }

  async reorderSections(newSections: Section[]): Promise<void> {
    const ordered = newSections.map((s, idx) => ({ ...s, order: idx }));
    this.sections.set(ordered);
    await this.indexedDb.saveSections(ordered);
  }

  async deleteSection(
    sectionId: string,
    strategy: 'move-to-unassigned' | 'delete-all' = 'move-to-unassigned'
  ): Promise<void> {
    if (sectionId === UNASSIGNED_SECTION_ID) {
      throw new Error('Cannot delete Unassigned section.');
    }

    const currentSections = this.sections();
    const currentDocs = this.documents();

    if (strategy === 'move-to-unassigned') {
      const movedDocs = currentDocs.map((doc) => {
        if (doc.sectionId === sectionId) {
          return {
            ...doc,
            sectionId: UNASSIGNED_SECTION_ID,
            updatedAt: new Date().toISOString(),
          };
        }
        return doc;
      });

      this.documents.set(movedDocs);
      await this.indexedDb.saveDocuments(movedDocs.filter((d) => d.sectionId === UNASSIGNED_SECTION_ID));
    } else {
      // delete-all
      const remainingDocs = currentDocs.filter((doc) => doc.sectionId !== sectionId);
      this.documents.set(remainingDocs);
      await this.indexedDb.deleteDocumentsBySection(sectionId);

      // If active document was in deleted section, reset active document
      if (this.activeDocument()?.sectionId === sectionId) {
        this.activeDocumentId.set(remainingDocs[0]?.id || null);
        this.persistPreferences();
      }
    }

    const remainingSections = currentSections.filter((s) => s.id !== sectionId);
    this.sections.set(remainingSections);
    await this.indexedDb.deleteSection(sectionId);
  }

  // --- DOCUMENT ACTIONS ---

  setActiveDocument(id: string | null): void {
    this.activeDocumentId.set(id);
    this.persistPreferences();
  }

  async createDocument(
    sectionId: string = UNASSIGNED_SECTION_ID,
    fileName: string = 'untitled.md',
    content: string = ''
  ): Promise<MarkdownDocument> {
    let resolvedName = fileName.trim();
    if (!resolvedName.endsWith('.md')) {
      resolvedName += '.md';
    }

    // Resolve duplicate name in same section
    resolvedName = this.generateUniqueFileName(sectionId, resolvedName);

    const newDoc: MarkdownDocument = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sectionId,
      fileName: resolvedName,
      content,
      order: this.documents().filter((d) => d.sectionId === sectionId).length,
      sourceType: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...this.documents(), newDoc];
    this.documents.set(updated);
    this.activeDocumentId.set(newDoc.id);
    this.persistPreferences();
    await this.indexedDb.saveDocument(newDoc);
    return newDoc;
  }

  async renameDocument(id: string, newFileName: string): Promise<void> {
    let trimmed = newFileName.trim();
    if (!trimmed) return;
    if (!trimmed.endsWith('.md')) {
      trimmed += '.md';
    }

    const currentDocs = this.documents();
    const doc = currentDocs.find((d) => d.id === id);
    if (!doc) return;

    const uniqueName = this.generateUniqueFileName(doc.sectionId, trimmed, id);
    const updatedDoc = { ...doc, fileName: uniqueName, updatedAt: new Date().toISOString() };
    this.documents.set(currentDocs.map((d) => (d.id === id ? updatedDoc : d)));
    await this.indexedDb.saveDocument(updatedDoc);
  }

  async moveDocument(docId: string, targetSectionId: string, newOrder?: number): Promise<void> {
    const currentDocs = this.documents();
    const doc = currentDocs.find((d) => d.id === docId);
    if (!doc) return;

    let targetDocs = currentDocs.filter((d) => d.sectionId === targetSectionId && d.id !== docId);
    const uniqueName = this.generateUniqueFileName(targetSectionId, doc.fileName, docId);

    const updatedDoc: MarkdownDocument = {
      ...doc,
      sectionId: targetSectionId,
      fileName: uniqueName,
      order: typeof newOrder === 'number' ? newOrder : targetDocs.length,
      updatedAt: new Date().toISOString(),
    };

    if (typeof newOrder === 'number') {
      targetDocs.splice(newOrder, 0, updatedDoc);
      targetDocs = targetDocs.map((d, i) => ({ ...d, order: i }));
      const otherDocs = currentDocs.filter((d) => d.sectionId !== targetSectionId && d.id !== docId);
      this.documents.set([...otherDocs, ...targetDocs]);
      await this.indexedDb.saveDocuments(targetDocs);
    } else {
      this.documents.set(currentDocs.map((d) => (d.id === docId ? updatedDoc : d)));
      await this.indexedDb.saveDocument(updatedDoc);
    }
  }

  async reorderDocuments(sectionId: string, orderedDocs: MarkdownDocument[]): Promise<void> {
    const reordered = orderedDocs.map((d, index) => ({ ...d, order: index }));
    const otherDocs = this.documents().filter((d) => d.sectionId !== sectionId);
    this.documents.set([...otherDocs, ...reordered]);
    await this.indexedDb.saveDocuments(reordered);
  }

  async deleteDocument(id: string): Promise<void> {
    const currentDocs = this.documents();
    const remaining = currentDocs.filter((d) => d.id !== id);
    this.documents.set(remaining);

    if (this.activeDocumentId() === id) {
      this.activeDocumentId.set(remaining[0]?.id || null);
      this.persistPreferences();
    }

    await this.indexedDb.deleteDocument(id);
  }

  updateDocumentContent(id: string, content: string): void {
    const currentDocs = this.documents();
    const doc = currentDocs.find((d) => d.id === id);
    if (!doc || doc.content === content) return;

    this.saveStatus.set('editing');
    const updatedDoc = { ...doc, content, updatedAt: new Date().toISOString() };
    this.documents.set(currentDocs.map((d) => (d.id === id ? updatedDoc : d)));

    // Emit debounced autosave
    this.autosaveSubject.next({ id, content });
  }

  async forceSave(): Promise<void> {
    const activeDoc = this.activeDocument();
    if (!activeDoc) return;
    await this.persistDocumentContent(activeDoc.id, activeDoc.content);
  }

  private async persistDocumentContent(id: string, content: string): Promise<void> {
    const doc = this.documents().find((d) => d.id === id);
    if (!doc) return;

    this.saveStatus.set('saving');
    try {
      await this.indexedDb.saveDocument({ ...doc, content });
      this.saveStatus.set('saved');
      setTimeout(() => {
        if (this.saveStatus() === 'saved') {
          this.saveStatus.set('idle');
        }
      }, 2000);
    } catch (err) {
      console.error('Autosave failed:', err);
      this.saveStatus.set('error');
    }
  }

  // --- IMPORT ---

  async importFile(file: File, targetSectionId: string = UNASSIGNED_SECTION_ID): Promise<MarkdownDocument | null> {
    const isMarkdown = file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.type.includes('markdown') || file.type.includes('text');
    if (!isMarkdown && !file.name.endsWith('.md')) {
      console.warn(`Skipping unsupported file type: ${file.name}`);
      return null;
    }

    const content = await file.text();
    let fileName = file.name;
    if (!fileName.endsWith('.md')) {
      fileName += '.md';
    }

    const uniqueName = this.generateUniqueFileName(targetSectionId, fileName);
    const newDoc: MarkdownDocument = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sectionId: targetSectionId,
      fileName: uniqueName,
      content,
      order: this.documents().filter((d) => d.sectionId === targetSectionId).length,
      sourceType: 'imported',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...this.documents(), newDoc];
    this.documents.set(updated);
    this.activeDocumentId.set(newDoc.id);
    this.persistPreferences();
    await this.indexedDb.saveDocument(newDoc);
    return newDoc;
  }

  async importMultipleFiles(files: File[], targetSectionId: string = UNASSIGNED_SECTION_ID): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;
    for (const file of files) {
      const res = await this.importFile(file, targetSectionId);
      if (res) imported++;
      else skipped++;
    }
    return { imported, skipped };
  }

  // --- SEARCH ---

  search(query: string): SearchResult[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const results: SearchResult[] = [];
    const sectionsMap = new Map(this.sections().map((s) => [s.id, s.name]));

    for (const doc of this.documents()) {
      const sectionName = sectionsMap.get(doc.sectionId) || 'Unassigned';
      const filenameMatch = doc.fileName.toLowerCase().includes(trimmed);
      const contentLower = doc.content.toLowerCase();
      const contentMatch = contentLower.includes(trimmed);

      if (filenameMatch || contentMatch) {
        let snippet = '';
        let matchCount = 0;

        if (contentMatch) {
          // Count occurrences
          let pos = 0;
          while ((pos = contentLower.indexOf(trimmed, pos)) !== -1) {
            matchCount++;
            pos += trimmed.length;
          }

          // Extract first occurrence snippet
          const matchIdx = contentLower.indexOf(trimmed);
          const start = Math.max(0, matchIdx - 40);
          const end = Math.min(doc.content.length, matchIdx + trimmed.length + 60);
          snippet = (start > 0 ? '...' : '') + doc.content.substring(start, end).replace(/\n/g, ' ') + (end < doc.content.length ? '...' : '');
        }

        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          sectionId: doc.sectionId,
          sectionName,
          matchedIn: filenameMatch && !contentMatch ? 'filename' : 'content',
          snippet: snippet || undefined,
          matchCount: matchCount || (filenameMatch ? 1 : 0),
        });
      }
    }

    return results;
  }

  // --- PREFERENCES & LAYOUT ---

  setTheme(theme: ThemeMode): void {
    this.theme.set(theme);
    this.applyThemeToDom(theme);
    this.persistPreferences();
  }

  setLayoutMode(mode: LayoutMode): void {
    this.layoutMode.set(mode);
    this.persistPreferences();
  }

  setResourcePanelWidth(width: number): void {
    const clamped = Math.max(200, Math.min(500, width));
    this.resourcePanelWidth.set(clamped);
    this.persistPreferences();
  }

  setEditorPanelWidth(width: number): void {
    const clamped = Math.max(240, Math.min(600, width));
    this.editorPanelWidth.set(clamped);
    this.persistPreferences();
  }

  setResourceActiveTab(tab: 'files' | 'outline'): void {
    this.resourceActiveTab.set(tab);
    this.persistPreferences();
  }

  private persistPreferences(): void {
    const prefs: WorkspacePreferences = {
      theme: this.theme(),
      layoutMode: this.layoutMode(),
      resourcePanelWidth: this.resourcePanelWidth(),
      editorPanelWidth: this.editorPanelWidth(),
      resourceActiveTab: this.resourceActiveTab(),
      activeDocumentId: this.activeDocumentId() || undefined,
    };
    this.prefService.savePreferences(prefs);
  }

  private applyThemeToDom(theme: ThemeMode): void {
    if (typeof document === 'undefined') return;
    let resolved = theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  }

  // --- UTILITIES ---

  generateUniqueFileName(sectionId: string, baseName: string, excludeDocId?: string): string {
    const existing = this.documents()
      .filter((d) => d.sectionId === sectionId && d.id !== excludeDocId)
      .map((d) => d.fileName.toLowerCase());

    const lowerBase = baseName.toLowerCase();
    if (!existing.includes(lowerBase)) {
      return baseName;
    }

    // Name format: base (1).md
    const extension = baseName.endsWith('.md') ? '.md' : '';
    const rootName = baseName.endsWith('.md') ? baseName.slice(0, -3) : baseName;

    let counter = 1;
    while (existing.includes(`${rootName} (${counter})${extension}`.toLowerCase())) {
      counter++;
    }

    return `${rootName} (${counter})${extension}`;
  }

  private extractOutline(markdown: string): OutlineItem[] {
    const lines = markdown.split('\n');
    const outline: OutlineItem[] = [];
    const slugCounts = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawText = match[2].replace(/[*_~`]/g, '').trim();
        let baseSlug = rawText
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');

        if (!baseSlug) baseSlug = `heading-${i}`;
        const count = slugCounts.get(baseSlug) || 0;
        slugCounts.set(baseSlug, count + 1);
        const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

        outline.push({
          id: `heading-${i}-${slug}`,
          level,
          text: rawText,
          slug,
        });
      }
    }
    return outline;
  }
}
