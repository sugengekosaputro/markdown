import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonWorkspaceStore } from '../../../core/services/json-workspace.store';
import { JsonSectionListComponent } from './json-section-list.component';

@Component({
  selector: 'app-json-resource-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonSectionListComponent],
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
          <span class="panel-title">JSON Explorer</span>
        </div>

        <div class="header-actions">
          <button class="icon-btn" (click)="openNewSectionModal()" title="New Section">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          <button class="icon-btn" (click)="requestImport.emit()" title="Import JSON files">
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

      <!-- Filter bar -->
      <div class="filter-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Filter JSON files..."
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

      <!-- Panel Body -->
      <div class="panel-body">
        <app-json-section-list [filterQuery]="searchFilter" />
      </div>

      <!-- Drag Overlay Dropzone -->
      @if (isDraggingFiles()) {
        <div class="drag-drop-overlay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Drop JSON to import to Unassigned</span>
        </div>
      }

      <!-- New Section Dialog Modal -->
      @if (showNewSectionModal()) {
        <div class="modal-backdrop" (click)="showNewSectionModal.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Create New JSON Section</h3>
            <p class="modal-hint">A logical grouping for your JSON payloads and specifications.</p>
            <input
              type="text"
              class="modal-input"
              placeholder="e.g. Auth Payloads, API Responses, Configs..."
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
      height: 44px;
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
      color: #f59e0b; // amber
    }

    .panel-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-primary);
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
      border-radius: var(--radius-sm, 4px);
      color: var(--color-text-secondary);
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all var(--transition-fast, 150ms ease);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: var(--color-text-primary);
      }

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .filter-box {
      display: flex;
      align-items: center;
      padding: 6px 10px;
      gap: 6px;
      margin: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm, 6px);
      position: relative;
      flex-shrink: 0;
      background-color: var(--color-bg-subtle);
      transition: border-color var(--transition-fast, 150ms ease);

      &:focus-within {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-glow, rgba(99, 102, 241, 0.2));
      }
    }

    .search-icon {
      width: 14px;
      height: 14px;
      color: var(--color-primary);
    }

    .filter-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 1px 4px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--color-text-primary);
      outline: none;

      &::placeholder {
        color: var(--color-text-secondary);
      }
    }

    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      color: var(--color-text-secondary);
      border: none;
      background: transparent;
      cursor: pointer;

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
      background-color: var(--color-primary-light, rgba(99, 102, 241, 0.1));
      border: 2px dashed var(--color-primary);
      border-radius: var(--radius-md, 8px);
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
      border-radius: var(--radius-lg, 12px);
      padding: 20px;
      box-shadow: var(--shadow-glass, 0 10px 25px rgba(0, 0, 0, 0.2));

      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--color-text-primary);
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
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm, 6px);
      background-color: var(--color-bg-subtle);
      color: var(--color-text-primary);
      outline: none;

      &:focus {
        border-color: var(--color-primary);
      }
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn {
      padding: 6px 14px;
      border-radius: var(--radius-sm, 6px);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast, 150ms ease);

      &.btn-secondary {
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        background: transparent;

        &:hover {
          background-color: var(--color-bg-surface-hover);
        }
      }

      &.btn-primary {
        background-color: var(--color-primary);
        color: #ffffff;
        border: none;

        &:hover {
          background-color: var(--color-primary-hover);
        }
      }
    }
  `],
})
export class JsonResourcePanelComponent {
  private jsonStore = inject(JsonWorkspaceStore);

  @Output() requestImport = new EventEmitter<void>();

  searchFilter = '';
  readonly showNewSectionModal = signal(false);
  readonly isDraggingFiles = signal(false);
  newSectionName = '';

  collapsePanel(): void {
    const current = this.jsonStore.layoutMode();
    if (current === 'viewer-dominant') {
      this.jsonStore.setLayoutMode('viewer-only');
    } else {
      this.jsonStore.setLayoutMode('viewer-editor');
    }
  }

  openNewSectionModal(): void {
    this.newSectionName = '';
    this.showNewSectionModal.set(true);
  }

  createSection(): void {
    if (this.newSectionName.trim()) {
      this.jsonStore.createSection(this.newSectionName);
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
      await this.jsonStore.importMultipleFiles(Array.from(files));
    }
  }
}
