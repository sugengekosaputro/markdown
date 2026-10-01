import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonWorkspaceStore } from '../../../core/services/json-workspace.store';
import { JsonTreeNode } from '../../../core/models/json-workspace.models';
import { JsonTreeNodeComponent } from './json-tree-node.component';
import { copyToClipboard } from '../../../core/utils/clipboard.util';

@Component({
  selector: 'app-json-tree-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonTreeNodeComponent],
  template: `
    <div class="tree-viewer-container">
      <!-- Top Action Toolbar -->
      <div class="viewer-toolbar">
        <div class="toolbar-left">
          <!-- Quick Search Filter in Tree -->
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search keys / values..."
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchInput($event)"
              class="search-input"
            />
            @if (searchQuery()) {
              <button class="clear-search-btn" (click)="clearSearch()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            }
          </div>

          <!-- Depth Expand / Collapse Presets -->
          <div class="depth-controls">
            <button class="btn-ctrl" (click)="collapseAll()" title="Collapse all nodes">
              <span>Collapse</span>
            </button>
            <button class="btn-ctrl" (click)="setDepth(1)" title="Expand to Level 1">
              <span>L1</span>
            </button>
            <button class="btn-ctrl" (click)="setDepth(2)" title="Expand to Level 2">
              <span>L2</span>
            </button>
            <button class="btn-ctrl" (click)="expandAll()" title="Expand all nodes">
              <span>Expand</span>
            </button>
          </div>
        </div>

        <div class="toolbar-right">
          <!-- Stats badge pill -->
          @if (treeResult().stats; as stats) {
            <div class="stats-badge" title="JSON Size & Structure">
              <span>{{ (stats.sizeBytes / 1024).toFixed(1) }} KB</span>
              <span class="dot">•</span>
              <span>{{ stats.totalKeys }} keys</span>
              <span class="dot">•</span>
              <span>depth {{ stats.depth }}</span>
            </div>
          }

          <button class="btn-copy-full" (click)="copyFullJson()" title="Copy entire JSON">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Copy</span>
          </button>
        </div>
      </div>

      <!-- Breadcrumbs Path Bar -->
      <div class="breadcrumb-bar">
        <span class="breadcrumb-label">Path:</span>
        <code class="breadcrumb-path">{{ selectedPath() || '$' }}</code>
        <button
          class="btn-copy-path"
          (click)="copyPath(selectedPath() || '$')"
          title="Copy JSONPath"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>

      <!-- Main Tree Content Area -->
      <div class="viewer-body">
        @if (treeResult().error; as err) {
          <!-- Error Boundary Notice -->
          <div class="error-banner">
            <div class="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div class="error-details">
              <h4>Syntax Error in JSON Document</h4>
              <p class="error-msg">{{ err }}</p>
              <p class="error-hint">
                Please correct the syntax in the editor on the right. The tree viewer will automatically update once valid.
              </p>
            </div>
          </div>
        } @else if (filteredTree().length > 0) {
          <div class="tree-root">
            @for (rootNode of filteredTree(); track rootNode.id) {
              <app-json-tree-node
                [node]="rootNode"
                (pathSelected)="selectedPath.set($event)"
                (nodeCopied)="showToast($event.label, $event.text)"
              />
            }
          </div>
        } @else {
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
            </svg>
            <p>No JSON data to display</p>
            <span>Select or import a JSON file from the left Explorer.</span>
          </div>
        }
      </div>

      <!-- Floating Toast Notification -->
      @if (toastMessage()) {
        <div class="toast-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{{ toastMessage() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      background-color: var(--color-bg-app);
      overflow: hidden;
      position: relative;
    }

    .tree-viewer-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .viewer-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 14px;
      height: 44px;
      background-color: var(--color-bg-surface);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
      gap: 12px;
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm, 6px);
      background-color: var(--color-bg-subtle);
      width: 200px;
      transition: all var(--transition-fast, 150ms ease);

      &:focus-within {
        border-color: var(--color-primary);
        background-color: var(--color-bg-surface);
        box-shadow: 0 0 0 2px var(--color-primary-glow, rgba(99, 102, 241, 0.2));
      }

      svg {
        width: 13px;
        height: 13px;
        color: var(--color-text-secondary);
        flex-shrink: 0;
      }
    }

    .search-input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 12px;
      color: var(--color-text-primary);
      width: 100%;

      &::placeholder {
        color: var(--color-text-tertiary);
      }
    }

    .clear-search-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-text-tertiary);
      cursor: pointer;

      &:hover {
        color: var(--color-text-primary);
      }

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .depth-controls {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border-radius: var(--radius-sm, 6px);
      background-color: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
    }

    .btn-ctrl {
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-radius: 4px;
      transition: all var(--transition-fast, 150ms ease);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: var(--color-text-primary);
      }
    }

    .stats-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 500;
      color: var(--color-text-secondary);
      background-color: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      padding: 3px 8px;
      border-radius: 12px;

      .dot {
        opacity: 0.4;
      }
    }

    .btn-copy-full {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-primary);
      background-color: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm, 6px);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms ease);

      &:hover {
        background-color: var(--color-primary);
        color: #ffffff;
        border-color: var(--color-primary);
      }

      svg {
        width: 13px;
        height: 13px;
      }
    }

    .breadcrumb-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 14px;
      height: 28px;
      background-color: var(--color-bg-subtle);
      border-bottom: 1px solid var(--color-border);
      font-size: 11.5px;
      flex-shrink: 0;
    }

    .breadcrumb-label {
      color: var(--color-text-tertiary);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
    }

    .breadcrumb-path {
      font-family: var(--font-mono, monospace);
      color: var(--color-primary);
      font-weight: 600;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .btn-copy-path {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;

      &:hover {
        color: var(--color-primary);
      }

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .viewer-body {
      flex: 1;
      overflow: auto;
      padding: 14px;
    }

    .tree-root {
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md, 8px);
      padding: 12px 14px;
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
    }

    .error-banner {
      display: flex;
      gap: 14px;
      padding: 16px;
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-md, 8px);
      color: #ef4444;

      .error-icon svg {
        width: 28px;
        height: 28px;
      }

      h4 {
        margin: 0 0 6px 0;
        font-size: 14px;
        font-weight: 700;
      }

      .error-msg {
        font-family: var(--font-mono, monospace);
        font-size: 12.5px;
        margin: 0 0 8px 0;
        background-color: rgba(239, 68, 68, 0.15);
        padding: 6px 10px;
        border-radius: 4px;
      }

      .error-hint {
        margin: 0;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: var(--color-text-secondary);
      text-align: center;

      svg {
        width: 48px;
        height: 48px;
        color: var(--color-text-tertiary);
        margin-bottom: 12px;
      }

      p {
        font-size: 15px;
        font-weight: 600;
        margin: 0 0 4px 0;
      }

      span {
        font-size: 12px;
        color: var(--color-text-tertiary);
      }
    }

    .toast-pill {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background-color: var(--color-primary);
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 100;
      animation: fadeIn 150ms ease;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class JsonTreeViewerComponent {
  private jsonStore = inject(JsonWorkspaceStore);

  readonly treeResult = this.jsonStore.treeData;
  readonly selectedPath = signal<string>('$');
  readonly toastMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');

  readonly filteredTree = computed<JsonTreeNode[]>(() => {
    const roots = this.treeResult().tree;
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) {
      return roots;
    }
    return this.filterNodes(roots, q);
  });

  onSearchInput(val: string): void {
    this.searchQuery.set(val);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  private filterNodes(nodes: JsonTreeNode[], query: string): JsonTreeNode[] {
    const cloneNodes = (list: JsonTreeNode[]): JsonTreeNode[] => {
      const result: JsonTreeNode[] = [];
      for (const node of list) {
        const keyMatch = node.key.toLowerCase().includes(query);
        const valMatch =
          node.value !== null &&
          node.value !== undefined &&
          typeof node.value !== 'object' &&
          String(node.value).toLowerCase().includes(query);

        let filteredChildren: JsonTreeNode[] | undefined;
        let hasChildMatch = false;

        if (node.children) {
          filteredChildren = cloneNodes(node.children);
          hasChildMatch = filteredChildren.length > 0;
        }

        if (keyMatch || valMatch || hasChildMatch) {
          result.push({
            ...node,
            matched: keyMatch || valMatch,
            isExpanded: true,
            children: filteredChildren || node.children,
          });
        }
      }
      return result;
    };

    return cloneNodes(nodes);
  }

  collapseAll(): void {
    const collapse = (list: JsonTreeNode[]) => {
      for (const n of list) {
        n.isExpanded = false;
        if (n.children) collapse(n.children);
      }
    };
    collapse(this.treeResult().tree);
  }

  expandAll(): void {
    const expand = (list: JsonTreeNode[]) => {
      for (const n of list) {
        n.isExpanded = true;
        if (n.children) expand(n.children);
      }
    };
    expand(this.treeResult().tree);
  }

  setDepth(maxDepth: number): void {
    const apply = (list: JsonTreeNode[], currentDepth: number) => {
      for (const n of list) {
        n.isExpanded = currentDepth < maxDepth;
        if (n.children) apply(n.children, currentDepth + 1);
      }
    };
    apply(this.treeResult().tree, 0);
  }

  async copyPath(path: string): Promise<void> {
    await copyToClipboard(path);
    this.showToast('JSONPath copied to clipboard', path);
  }

  async copyFullJson(): Promise<void> {
    const doc = this.jsonStore.activeDocument();
    if (doc) {
      await copyToClipboard(doc.content);
      this.showToast('Entire JSON copied to clipboard', doc.content);
    }
  }

  showToast(label: string, value: string): void {
    copyToClipboard(value);
    this.toastMessage.set(label);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 2000);
  }
}
