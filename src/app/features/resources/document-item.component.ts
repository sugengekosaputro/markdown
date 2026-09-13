import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownDocument } from '../../core/models/workspace.models';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-document-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="doc-item"
      [class.active]="isActive()"
      (click)="onSelect()"
    >
      <div class="doc-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>

      <div class="doc-info">
        @if (isEditing()) {
          <input
            #renameInput
            type="text"
            class="rename-input"
            [(ngModel)]="editName"
            (blur)="finishRename()"
            (keydown.enter)="finishRename()"
            (keydown.escape)="cancelRename()"
            (click)="$event.stopPropagation()"
          />
        } @else {
          <span class="doc-name" [title]="document.fileName">{{ document.fileName }}</span>
        }
      </div>

      <!-- Action buttons -->
      <div class="doc-actions" (click)="$event.stopPropagation()">
        <button class="action-icon-btn" (click)="startRename()" title="Rename">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </button>
        <button class="action-icon-btn" (click)="exportDoc()" title="Export .md">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button class="action-icon-btn danger" (click)="confirmDelete()" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .doc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px 6px 28px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      user-select: none;
      transition: all var(--transition-fast);
      color: var(--color-text-primary);
      font-weight: 500;
      border-left: 3px solid transparent;

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: #ffffff;

        .doc-icon {
          color: #ffffff;
        }

        .doc-actions {
          opacity: 1;
        }
      }

      &.active {
        background-color: var(--color-primary-light);
        border-left-color: var(--color-primary);
        color: #ffffff;
        font-weight: 600;

        .doc-icon {
          color: var(--color-accent);
        }

        .doc-actions {
          opacity: 1;
        }
      }
    }

    .doc-icon {
      display: flex;
      align-items: center;
      color: var(--color-accent);
      transition: color var(--transition-fast);

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .doc-info {
      flex: 1;
      min-width: 0;
    }

    .doc-name {
      display: block;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rename-input {
      width: 100%;
      font-size: 13px;
      padding: 2px 6px;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-xs);
      color: var(--color-text-primary);
    }

    .doc-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .action-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: var(--radius-xs);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-active);
        color: #ffffff;
      }

      &.danger:hover {
        color: var(--color-danger);
        background-color: var(--color-danger-bg);
      }

      svg {
        width: 12px;
        height: 12px;
      }
    }
  `],
})
export class DocumentItemComponent {
  private workspaceStore = inject(WorkspaceStore);
  private exportService = inject(ExportService);

  @Input({ required: true }) document!: MarkdownDocument;
  @ViewChild('renameInput') renameInput?: ElementRef<HTMLInputElement>;

  readonly isEditing = signal(false);
  editName = '';

  isActive(): boolean {
    return this.workspaceStore.activeDocumentId() === this.document.id;
  }

  onSelect(): void {
    this.workspaceStore.setActiveDocument(this.document.id);
  }

  startRename(): void {
    this.editName = this.document.fileName;
    this.isEditing.set(true);
    setTimeout(() => {
      this.renameInput?.nativeElement.focus();
      this.renameInput?.nativeElement.select();
    }, 50);
  }

  finishRename(): void {
    if (this.isEditing()) {
      if (this.editName.trim() && this.editName !== this.document.fileName) {
        this.workspaceStore.renameDocument(this.document.id, this.editName);
      }
      this.isEditing.set(false);
    }
  }

  cancelRename(): void {
    this.isEditing.set(false);
  }

  exportDoc(): void {
    this.exportService.exportSingleDocument(this.document);
  }

  confirmDelete(): void {
    if (confirm(`Are you sure you want to delete "${this.document.fileName}"?`)) {
      this.workspaceStore.deleteDocument(this.document.id);
    }
  }
}
