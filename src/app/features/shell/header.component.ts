import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutMode, ThemeMode } from '../../core/models/workspace.models';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="app-header">
      <!-- Left: Logo & Brand -->
      <div class="header-left">
        <div class="brand">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <line x1="8" y1="7" x2="16" y2="7"/>
              <line x1="8" y1="11" x2="13" y2="11"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">Technical Markdown</span>
            <span class="brand-badge">Workspace</span>
          </div>
        </div>

        <!-- Search Bar Button -->
        <button class="search-trigger" (click)="openSearch.emit()" title="Search (Ctrl/Cmd+P)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span>Search documents...</span>
          <kbd>⌘P</kbd>
        </button>
      </div>

      <!-- Center: Status indication -->
      <div class="header-center">
        @switch (saveStatus()) {
          @case ('editing') {
            <span class="status-pill warning">Editing</span>
          }
          @case ('saving') {
            <span class="status-pill info">Saving locally...</span>
          }
          @case ('saved') {
            <span class="status-pill success">Saved locally</span>
          }
          @case ('error') {
            <span class="status-pill danger">Save error</span>
          }
        }
      </div>

      <!-- Right: Actions & Preferences -->
      <div class="header-right">
        <button class="action-btn" (click)="openImport.emit()" title="Import Markdown (Ctrl/Cmd+O)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Import</span>
        </button>

        <button class="action-btn" (click)="exportWorkspace()" title="Export All Documents as ZIP">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Export ZIP</span>
        </button>

        <div class="divider"></div>

        <!-- Layout Mode Selector -->
        <div class="layout-toggles" title="Layout Mode">
          <button
            class="mode-btn"
            [class.active]="layoutMode() === 'default'"
            (click)="setLayoutMode('default')"
            title="3 Panels (Resources + Viewer + Editor)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="8" y1="3" x2="8" y2="21"/>
              <line x1="16" y1="3" x2="16" y2="21"/>
            </svg>
          </button>
          <button
            class="mode-btn"
            [class.active]="layoutMode() === 'viewer-dominant'"
            (click)="setLayoutMode('viewer-dominant')"
            title="Viewer Dominant (Editor collapsed)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="8" y1="3" x2="8" y2="21"/>
            </svg>
          </button>
          <button
            class="mode-btn"
            [class.active]="layoutMode() === 'viewer-only'"
            (click)="setLayoutMode('viewer-only')"
            title="Viewer Only"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
          </button>
          <button
            class="mode-btn"
            [class.active]="layoutMode() === 'editor-only'"
            (click)="setLayoutMode('editor-only')"
            title="Editor Only"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
        </div>

        <div class="divider"></div>

        <!-- Theme Mode Selector -->
        <button
          class="theme-btn"
          (click)="toggleTheme()"
          [title]="'Theme: ' + theme()"
        >
          @switch (theme()) {
            @case ('dark') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            }
            @case ('light') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            }
            @default {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            }
          }
        </button>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      padding: 0 16px;
      background-color: var(--color-bg-surface);
      border-bottom: 1px solid var(--color-border);
      user-select: none;
      position: relative;
      z-index: 100;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .brand-text {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .brand-name {
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--color-text-primary);
    }

    .brand-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 6px;
      border-radius: var(--radius-xs);
      background-color: var(--color-primary-light);
      color: var(--color-primary);
    }

    .search-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      border-radius: var(--radius-md);
      background-color: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      color: var(--color-text-tertiary);
      font-size: 12.5px;
      width: 220px;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-focus);
        background-color: var(--color-bg-surface-hover);
        color: var(--color-text-secondary);
      }

      svg {
        width: 13px;
        height: 13px;
      }

      kbd {
        margin-left: auto;
        font-family: var(--font-mono);
        font-size: 10px;
        background-color: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xs);
        padding: 1px 4px;
        color: var(--color-text-tertiary);
      }
    }

    .header-center {
      display: flex;
      align-items: center;
    }

    .status-pill {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 10px;
      border-radius: var(--radius-full);

      &.warning {
        background-color: var(--color-warning-bg);
        color: var(--color-warning);
      }
      &.info {
        background-color: var(--color-primary-light);
        color: var(--color-primary);
      }
      &.success {
        background-color: var(--color-success-bg);
        color: var(--color-success);
      }
      &.danger {
        background-color: var(--color-danger-bg);
        color: var(--color-danger);
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      font-size: 12.5px;
      font-weight: 500;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      background-color: var(--color-bg-surface);
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: var(--color-text-primary);
        border-color: var(--color-border-focus);
      }

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .divider {
      width: 1px;
      height: 18px;
      background-color: var(--color-border);
      margin: 0 4px;
    }

    .layout-toggles {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border-radius: var(--radius-sm);
      background-color: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
    }

    .mode-btn, .theme-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: var(--radius-xs);
      color: var(--color-text-tertiary);
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text-primary);
      }

      &.active {
        background-color: var(--color-bg-surface);
        color: var(--color-primary);
        box-shadow: var(--shadow-sm);
      }

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .theme-btn {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: var(--color-text-primary);
      }
    }
  `],
})
export class HeaderComponent {
  private workspaceStore = inject(WorkspaceStore);
  private exportService = inject(ExportService);

  @Output() openSearch = new EventEmitter<void>();
  @Output() openImport = new EventEmitter<void>();

  readonly layoutMode = this.workspaceStore.layoutMode;
  readonly theme = this.workspaceStore.theme;
  readonly saveStatus = this.workspaceStore.saveStatus;

  setLayoutMode(mode: LayoutMode): void {
    this.workspaceStore.setLayoutMode(mode);
  }

  toggleTheme(): void {
    const current = this.theme();
    if (current === 'system') {
      this.workspaceStore.setTheme('dark');
    } else if (current === 'dark') {
      this.workspaceStore.setTheme('light');
    } else {
      this.workspaceStore.setTheme('system');
    }
  }

  exportWorkspace(): void {
    const sections = this.workspaceStore.sections();
    const documents = this.workspaceStore.documents();
    this.exportService.exportWorkspaceAsZip(sections, documents);
  }
}
