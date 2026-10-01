export interface JsonSection {
  id: string;
  name: string;
  order: number;
  isSystem: boolean; // true for Unassigned
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JsonDocument {
  id: string;
  sectionId: string;
  fileName: string;
  title?: string;
  content: string; // Serialized JSON string
  order: number;
  sourceType: 'imported' | 'created';
  createdAt: string;
  updatedAt: string;
}

export interface JsonWorkspacePreferences {
  resourcePanelWidth: number;
  editorPanelWidth: number;
  layoutMode: 'default' | 'viewer-dominant' | 'viewer-only' | 'editor-only' | 'viewer-editor';
  activeDocumentId?: string;
  indentation: 2 | 4 | 'tab';
  autoSortKeys: boolean;
  expandDepth: number;
}

export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonTreeNode {
  id: string;
  key: string;
  value: any;
  type: JsonValueType;
  path: string; // e.g. "root.data.users[0].name"
  depth: number;
  itemCount?: number; // For array length or object keys count
  isExpanded: boolean;
  children?: JsonTreeNode[];
  matched?: boolean; // For search match highlighting
}

export interface JsonParseResult {
  valid: boolean;
  data?: any;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
}

export interface JsonStats {
  sizeBytes: number;
  formattedLines: number;
  depth: number;
  totalKeys: number;
}

export const UNASSIGNED_JSON_SECTION_ID = 'unassigned-json-section-id';
