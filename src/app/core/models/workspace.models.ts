export interface Section {
  id: string;
  name: string;
  order: number;
  isSystem: boolean; // true for Unassigned
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarkdownDocument {
  id: string;
  sectionId: string;
  fileName: string;
  title?: string;
  content: string;
  order: number;
  sourceType: 'imported' | 'created';
  createdAt: string;
  updatedAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutMode = 'default' | 'viewer-dominant' | 'viewer-only' | 'editor-only' | 'viewer-editor';

export interface WorkspacePreferences {
  theme: ThemeMode;
  resourcePanelWidth: number;
  editorPanelWidth: number;
  layoutMode: LayoutMode;
  activeDocumentId?: string;
  resourceActiveTab: 'files' | 'outline';
}

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  slug: string;
}

export interface SearchResult {
  documentId: string;
  fileName: string;
  sectionId: string;
  sectionName: string;
  matchedIn: 'filename' | 'content';
  snippet?: string;
  matchCount: number;
}

export type SaveStatus = 'idle' | 'editing' | 'saving' | 'saved' | 'error';

export const UNASSIGNED_SECTION_ID = 'unassigned-section-id';
