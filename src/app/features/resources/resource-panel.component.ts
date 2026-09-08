import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { SectionListComponent } from './section-list.component';
import { OutlineTreeComponent } from './outline-tree.component';

@Component({
  selector: 'app-resource-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionListComponent, OutlineTreeComponent],
  template: `
    <div
      class="panel-container"
      [class.workspace-drag-over]="isDraggingFiles()"
      (dragover)="onPanelDragOver($event)"
      (dragleave)="onPanelDragLeave($event)"
      (drop)="onPanelDrop($event)"
    >
      <!-- Panel Header -->
      <div class="panel-header">
        <div class="header-left">
          <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="panel-title">Explorer</span>
        </div>

        <div class="header-actions">
          <button class="icon-btn" (click)="openNewSectionModal()" title="New Section">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          <button class="icon-btn" (click)="requestImport.emit()" title="Import Markdown (Ctrl/Cmd+O)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <button class="icon-btn" (click)="collapsePanel()" title="Collapse Panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="panel-tabs">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'files'"
          (click)="setTab('files')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Files
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'outline'"
          (click)="setTab('outline')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Outline
        </button>
      </div>

      <!-- Filter bar (only in files tab) -->
      @if (activeTab() === 'files') {
        <div class="filter-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Filter files..."
            [(ngModel)]="searchFilter"
            class="filter-input"
          />
          @if (searchFilter) {
            <button class="clear-btn" (click)="searchFilter = ''">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          }
        </div>
      }

      <!-- Panel Body -->
      <div class="panel-body">
        @if (activeTab() === 'files') {
          <app-section-list [filterQuery]="searchFilter" />
        } @else {
          <app-outline-tree (headingSelected)="headingSelected.emit($event)" />
        }
      </div>

      <!-- Drag Overlay Dropzone -->
      @if (isDraggingFiles()) {
        <div class="drag-drop-overlay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Drop Markdown to import to Unassigned</span>
        </div>
      }

      <!-- New Section Dialog Modal -->
      @if (showNewSectionModal()) {
        <div class="modal-backdrop" (click)="showNewSectionModal.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Create New Section</h3>
            <p class="modal-hint">A logical grouping for your Markdown documentation.</p>
            <input
              type="text"
              class="modal-input"
              placeholder="e.g. Architecture, PRDs, Notes..."
              [(ngModel)]="newSectionName"
              (keydown.enter)="createSection()"
              (keydown.escape)="showNewSectionModal.set(false)"
              autofocus
            />
            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="showNewSectionModal.set(false)">Cancel</button>
              <button class="btn btn-primary" (click)="createSection()">Create</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      background-color: var(--color-bg-surface);
      border-right: 1px solid var(--color-border);
      overflow: hidden;
    }

    .panel-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      position: relative;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      height: 42px;
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-bg-subtle);
      user-select: none;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-icon {
      width: 16px;
      height: 16px;
      color: var(--color-primary);
    }

    .panel-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: var(--color-text-primary);
      }

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .panel-tabs {
      display: flex;
      padding: 6px 8px;
      gap: 4px;
      border-bottom: 1px solid var(--color-border-subtle);
      background-color: var(--color-bg-subtle);
      flex-shrink: 0;
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-secondary);
      border-radius: var(--radius-xs);
      transition: all var(--transition-fast);

      svg {
        width: 13px;
        height: 13px;
      }

      &:hover {
        color: var(--color-text-primary);
      }

      &.active {
        background-color: var(--color-bg-surface);
        color: var(--color-primary);
        font-weight: 600;
        box-shadow: var(--shadow-sm);
      }
    }

    .filter-box {
      display: flex;
      align-items: center;
      padding: 6px 10px;
      gap: 6px;
      border-bottom: 1px solid var(--color-border-subtle);
      position: relative;
      flex-shrink: 0;
    }

    .search-icon {
      width: 13px;
      height: 13px;
      color: var(--color-text-tertiary);
    }

    .filter-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 2px 4px;
      font-size: 12px;
      color: var(--color-text-primary);
      outline: none;
      box-shadow: none !important;

      &::placeholder {
        color: var(--color-text-tertiary);
      }
    }

    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);

      svg {
        width: 11px;
        height: 11px;
      }
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 8px 6px;
    }

    .drag-drop-overlay {
      position: absolute;
      inset: 0;
      background-color: var(--color-primary-light);
      border: 2px dashed var(--color-primary);
      border-radius: var(--radius-md);
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--color-primary);
      font-size: 13px;
      font-weight: 600;
      pointer-events: none;

      svg {
        width: 32px;
        height: 32px;
      }
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card {
      width: 100%;
      max-width: 400px;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-glass);

      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 4px;
      }
    }

    .modal-hint {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
    }

    .modal-input {
      width: 100%;
      padding: 8px 12px;
      margin-bottom: 20px;
      font-size: 13px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn {
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      transition: all var(--transition-fast);

      &.btn-secondary {
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);

        &:hover {
          background-color: var(--color-bg-surface-hover);
        }
      }

      &.btn-primary {
        background-color: var(--color-primary);
        color: var(--color-text-inverse);

        &:hover {
          background-color: var(--color-primary-hover);
        }
      }
    }
  `],
})
export class ResourcePanelComponent {
  private workspaceStore = inject(WorkspaceStore);

  @Output() requestImport = new EventEmitter<void>();
  @Output() headingSelected = new EventEmitter<string>();

  readonly activeTab = this.workspaceStore.resourceActiveTab;
  searchFilter = '';

  readonly showNewSectionModal = signal(false);
  readonly isDraggingFiles = signal(false);
  newSectionName = '';

  setTab(tab: 'files' | 'outline'): void {
    this.workspaceStore.setResourceActiveTab(tab);
  }

  collapsePanel(): void {
    const current = this.workspaceStore.layoutMode();
    if (current === 'viewer-dominant') {
      this.workspaceStore.setLayoutMode('viewer-only');
    } else {
      this.workspaceStore.setLayoutMode('viewer-editor');
    }
  }

  openNewSectionModal(): void {
    this.newSectionName = '';
    this.showNewSectionModal.set(true);
  }

  createSection(): void {
    if (this.newSectionName.trim()) {
      this.workspaceStore.createSection(this.newSectionName);
      this.showNewSectionModal.set(false);
    }
  }

  onPanelDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      this.isDraggingFiles.set(true);
    }
  }

  onPanelDragLeave(event: DragEvent): void {
    this.isDraggingFiles.set(false);
  }

  async onPanelDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDraggingFiles.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.workspaceStore.importMultipleFiles(Array.from(files));
    }
  }
}
