import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { UNASSIGNED_SECTION_ID } from '../../core/models/workspace.models';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="header-title">
            <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <h3>Import Markdown Files</h3>
          </div>
          <button class="close-btn" (click)="close.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Destination Selector -->
        <div class="destination-field">
          <label>Target Section:</label>
          <select [(ngModel)]="targetSectionId">
            @for (s of sections(); track s.id) {
              <option [value]="s.id">{{ s.name }} {{ s.isSystem ? '(Default)' : '' }}</option>
            }
          </select>
        </div>

        <!-- Dropzone -->
        <div
          class="import-dropzone"
          [class.drag-over]="isDragging()"
          (dragover)="onDragOver($event)"
          (dragleave)="isDragging.set(false)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <input
            #fileInput
            type="file"
            multiple
            accept=".md,.markdown,text/markdown,text/plain"
            (change)="onFileSelected($event)"
            style="display: none"
          />

          <svg class="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="12" y2="12"/>
            <line x1="15" y1="15" x2="12" y2="12"/>
          </svg>

          <p class="dropzone-title">Click to choose or drag & drop Markdown files here</p>
          <p class="dropzone-subtitle">Supports .md and .markdown. Multi-file selection enabled.</p>
        </div>

        <!-- Result Summary -->
        @if (summary()) {
          <div class="import-summary" [class.success]="summary()!.imported > 0">
            <p>
              Successfully imported <strong>{{ summary()!.imported }}</strong> document(s).
              @if (summary()!.skipped > 0) {
                <span>({{ summary()!.skipped }} skipped due to unsupported file format).</span>
              }
            </p>
          </div>
        }

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">
            {{ summary() ? 'Done' : 'Cancel' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card {
      width: 100%;
      max-width: 500px;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .header-title {
        display: flex;
        align-items: center;
        gap: 10px;

        .header-icon {
          width: 20px;
          height: 20px;
          color: var(--color-primary);
        }

        h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }
      }

      .close-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-secondary);
        border-radius: var(--radius-xs);
        transition: all var(--transition-fast);

        &:hover {
          background-color: var(--color-bg-surface-hover);
          color: #ffffff;
        }

        svg {
          width: 16px;
          height: 16px;
        }
      }
    }

    .destination-field {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;

      label {
        color: var(--color-text-primary);
        font-weight: 600;
      }

      select {
        flex: 1;
        padding: 6px 12px;
        background-color: var(--color-bg-surface-elevated);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        border-radius: var(--radius-sm);
      }
    }

    .import-dropzone {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
      padding: 32px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      cursor: pointer;
      background-color: var(--color-bg-subtle);
      transition: all var(--transition-fast);

      &:hover, &.drag-over {
        border-color: var(--color-primary);
        background-color: var(--color-primary-light);

        .dropzone-icon {
          color: var(--color-primary-hover);
          transform: translateY(-2px);
        }
      }

      .dropzone-icon {
        width: 42px;
        height: 42px;
        color: var(--color-primary);
        margin-bottom: 12px;
        transition: transform var(--transition-fast), color var(--transition-fast);
      }

      .dropzone-title {
        font-size: 13.5px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 4px;
      }

      .dropzone-subtitle {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
    }

    .import-summary {
      padding: 12px 16px;
      border-radius: var(--radius-md);
      background-color: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      font-size: 13px;
      color: var(--color-text-secondary);

      &.success {
        border-color: var(--color-success);
        background-color: var(--color-success-bg);
        color: var(--color-success);
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
    }

    .btn {
      padding: 6px 18px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--color-border);
      background-color: var(--color-bg-surface-elevated);
      color: var(--color-text-primary);
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: #ffffff;
        border-color: var(--color-primary);
      }
    }
  `],
})
export class ImportDialogComponent {
  private workspaceStore = inject(WorkspaceStore);

  @Output() close = new EventEmitter<void>();

  readonly sections = this.workspaceStore.sections;
  targetSectionId: string = UNASSIGNED_SECTION_ID;

  readonly isDragging = signal(false);
  readonly summary = signal<{ imported: number; skipped: number } | null>(null);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.processFiles(Array.from(files));
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private async processFiles(files: File[]): Promise<void> {
    const res = await this.workspaceStore.importMultipleFiles(files, this.targetSectionId);
    this.summary.set(res);
  }
}
