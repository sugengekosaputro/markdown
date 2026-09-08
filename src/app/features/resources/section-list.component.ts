import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { MarkdownDocument, Section, UNASSIGNED_SECTION_ID } from '../../core/models/workspace.models';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ExportService } from '../../core/services/export.service';
import { DocumentItemComponent } from './document-item.component';

@Component({
  selector: 'app-section-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, DocumentItemComponent],
  template: `
    <div class="sections-wrapper">
      @for (section of filteredSections(); track section.id) {
        <div
          class="section-group"
          [class.drag-over]="dragOverSectionId() === section.id"
          (dragover)="onDragOver($event, section.id)"
          (dragleave)="onDragLeave($event, section.id)"
          (drop)="onFileDrop($event, section.id)"
        >
          <!-- Section Header -->
          <div class="section-header" (click)="toggleCollapse(section.id)">
            <button class="collapse-btn" title="Toggle section">
              <svg
                class="chevron-icon"
                [class.collapsed]="section.collapsed"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            <div class="section-name-area">
              @if (editingSectionId() === section.id) {
                <input
                  #renameInput
                  type="text"
                  class="section-rename-input"
                  [(ngModel)]="editName"
                  (blur)="finishRename(section.id)"
                  (keydown.enter)="finishRename(section.id)"
                  (keydown.escape)="cancelRename()"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <span class="section-title" [title]="section.name">
                  {{ section.name }}
                  @if (section.isSystem) {
                    <span class="system-tag">system</span>
                  }
                </span>
              }
              <span class="doc-count">({{ getDocCount(section.id) }})</span>
            </div>

            <!-- Section Actions -->
            <div class="section-actions" (click)="$event.stopPropagation()">
              <button
                class="action-icon-btn"
                (click)="addDocument(section.id)"
                title="New document in this section"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>

              @if (!section.isSystem) {
                <button
                  class="action-icon-btn"
                  (click)="startRename(section)"
                  title="Rename section"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                </button>
                <button
                  class="action-icon-btn"
                  (click)="exportSection(section)"
                  title="Export Section as ZIP"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button
                  class="action-icon-btn danger"
                  (click)="openDeleteModal(section)"
                  title="Delete section"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              }
            </div>
          </div>

          <!-- Document List (CDK Drop List) -->
          @if (!section.collapsed) {
            <div
              class="docs-drop-list"
              cdkDropList
              [id]="section.id"
              [cdkDropListData]="getSectionDocuments(section.id)"
              [cdkDropListConnectedTo]="allSectionIds()"
              (cdkDropListDropped)="onDocumentDrop($event)"
            >
              @for (doc of getSectionDocuments(section.id); track doc.id) {
                <div cdkDrag [cdkDragData]="doc" class="doc-drag-item">
                  <app-document-item [document]="doc" />
                </div>
              } @empty {
                <div class="empty-section-hint">
                  No documents in this section. Drop or create one.
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Delete Section Confirmation Modal -->
      @if (pendingDeleteSection(); as s) {
        <div class="modal-backdrop" (click)="pendingDeleteSection.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <h3>Delete Section "{{ s.name }}"?</h3>
            </div>
            <p class="modal-desc">
              This section contains <strong>{{ getDocCount(s.id) }}</strong> document(s). How would you like to proceed?
            </p>
            <div class="modal-options">
              <label class="option-label">
                <input type="radio" name="deleteStrategy" [(ngModel)]="deleteStrategy" value="move-to-unassigned" />
                <div class="option-text">
                  <strong>Move documents to Unassigned (Recommended)</strong>
                  <span>Preserves all Markdown documents safely in the workspace.</span>
                </div>
              </label>
              <label class="option-label">
                <input type="radio" name="deleteStrategy" [(ngModel)]="deleteStrategy" value="delete-all" />
                <div class="option-text">
                  <strong class="text-danger">Delete section and all its documents</strong>
                  <span>Permanently removes all contained documents.</span>
                </div>
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="pendingDeleteSection.set(null)">Cancel</button>
              <button class="btn btn-danger" (click)="executeDeleteSection(s.id)">Confirm Delete</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .sections-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .section-group {
      border-radius: var(--radius-md);
      transition: background-color var(--transition-fast), border-color var(--transition-fast);
      border: 1px solid transparent;

      &.drag-over {
        background-color: var(--color-primary-light);
        border-color: var(--color-primary);
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      user-select: none;
      color: var(--color-text-primary);
      transition: background-color var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-hover);

        .section-actions {
          opacity: 1;
        }
      }
    }

    .collapse-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: var(--color-text-tertiary);
    }

    .chevron-icon {
      width: 14px;
      height: 14px;
      transition: transform var(--transition-fast);

      &.collapsed {
        transform: rotate(-90deg);
      }
    }

    .section-name-area {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--color-text-primary);
    }

    .system-tag {
      font-size: 10px;
      font-weight: 500;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: var(--radius-xs);
      background-color: var(--color-bg-subtle);
    }

    .doc-count {
      font-size: 11px;
      color: var(--color-text-tertiary);
      font-weight: 400;
    }

    .section-rename-input {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 6px;
      width: 100%;
    }

    .section-actions {
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
      color: var(--color-text-tertiary);
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-active);
        color: var(--color-text-primary);
      }

      &.danger:hover {
        color: var(--color-danger);
        background-color: var(--color-danger-bg);
      }

      svg {
        width: 13px;
        height: 13px;
      }
    }

    .docs-drop-list {
      min-height: 8px;
      padding-bottom: 6px;
    }

    .empty-section-hint {
      padding: 8px 12px 8px 30px;
      font-size: 11px;
      font-style: italic;
      color: var(--color-text-tertiary);
    }

    .doc-drag-item {
      transition: transform 0.15s ease;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
      background-color: var(--color-primary-light);
      border-radius: var(--radius-sm);
    }

    .cdk-drag-preview {
      box-shadow: var(--shadow-lg);
      border-radius: var(--radius-sm);
      background-color: var(--color-bg-surface-elevated);
      opacity: 0.95;
    }

    /* Modal styles */
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
      max-width: 480px;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-glass);
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;

      .warning-icon {
        width: 22px;
        height: 22px;
        color: var(--color-warning);
      }

      h3 {
        font-size: 1.15rem;
        font-weight: 600;
      }
    }

    .modal-desc {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 18px;
    }

    .modal-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
    }

    .option-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      background-color: var(--color-bg-subtle);

      &:hover {
        background-color: var(--color-bg-surface-hover);
      }

      input[type='radio'] {
        margin-top: 3px;
        accent-color: var(--color-primary);
      }
    }

    .option-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;

      strong {
        font-size: 13px;
        color: var(--color-text-primary);

        &.text-danger {
          color: var(--color-danger);
        }
      }

      span {
        color: var(--color-text-secondary);
      }
    }

    .modal-footer {
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

      &.btn-danger {
        background-color: var(--color-danger);
        color: var(--color-text-inverse);

        &:hover {
          opacity: 0.9;
        }
      }
    }
  `],
})
export class SectionListComponent {
  private workspaceStore = inject(WorkspaceStore);
  private exportService = inject(ExportService);

  @Input() filterQuery = '';
  @ViewChild('renameInput') renameInput?: ElementRef<HTMLInputElement>;

  readonly sections = this.workspaceStore.sections;
  readonly documents = this.workspaceStore.documents;

  readonly editingSectionId = signal<string | null>(null);
  readonly pendingDeleteSection = signal<Section | null>(null);
  readonly dragOverSectionId = signal<string | null>(null);

  editName = '';
  deleteStrategy: 'move-to-unassigned' | 'delete-all' = 'move-to-unassigned';

  readonly allSectionIds = computed(() => this.sections().map((s) => s.id));

  readonly filteredSections = computed(() => {
    const q = this.filterQuery.trim().toLowerCase();
    if (!q) return this.sections();

    // If query matches section name or any document in section
    return this.sections().filter((s) => {
      const sectionMatch = s.name.toLowerCase().includes(q);
      const docMatch = this.documents().some(
        (d) => d.sectionId === s.id && d.fileName.toLowerCase().includes(q)
      );
      return sectionMatch || docMatch;
    });
  });

  getSectionDocuments(sectionId: string): MarkdownDocument[] {
    const docs = this.documents().filter((d) => d.sectionId === sectionId);
    const q = this.filterQuery.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.fileName.toLowerCase().includes(q));
  }

  getDocCount(sectionId: string): number {
    return this.documents().filter((d) => d.sectionId === sectionId).length;
  }

  toggleCollapse(sectionId: string): void {
    this.workspaceStore.toggleSectionCollapse(sectionId);
  }

  addDocument(sectionId: string): void {
    this.workspaceStore.createDocument(sectionId);
  }

  startRename(section: Section): void {
    this.editName = section.name;
    this.editingSectionId.set(section.id);
    setTimeout(() => {
      this.renameInput?.nativeElement.focus();
      this.renameInput?.nativeElement.select();
    }, 50);
  }

  finishRename(sectionId: string): void {
    if (this.editingSectionId()) {
      if (this.editName.trim()) {
        this.workspaceStore.renameSection(sectionId, this.editName);
      }
      this.editingSectionId.set(null);
    }
  }

  cancelRename(): void {
    this.editingSectionId.set(null);
  }

  openDeleteModal(section: Section): void {
    const count = this.getDocCount(section.id);
    if (count === 0) {
      this.workspaceStore.deleteSection(section.id, 'delete-all');
    } else {
      this.deleteStrategy = 'move-to-unassigned';
      this.pendingDeleteSection.set(section);
    }
  }

  executeDeleteSection(sectionId: string): void {
    this.workspaceStore.deleteSection(sectionId, this.deleteStrategy);
    this.pendingDeleteSection.set(null);
  }

  exportSection(section: Section): void {
    const docs = this.documents().filter((d) => d.sectionId === section.id);
    this.exportService.exportSectionAsZip(section, docs);
  }

  onDocumentDrop(event: CdkDragDrop<MarkdownDocument[]>): void {
    if (event.previousContainer === event.container) {
      // Reordering within same section
      const docs = [...event.container.data];
      moveItemInArray(docs, event.previousIndex, event.currentIndex);
      this.workspaceStore.reorderDocuments(event.container.id, docs);
    } else {
      // Moving across sections
      const movedDoc = event.item.data as MarkdownDocument;
      this.workspaceStore.moveDocument(movedDoc.id, event.container.id, event.currentIndex);
    }
  }

  onDragOver(event: DragEvent, sectionId: string): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      this.dragOverSectionId.set(sectionId);
    }
  }

  onDragLeave(event: DragEvent, sectionId: string): void {
    if (this.dragOverSectionId() === sectionId) {
      this.dragOverSectionId.set(null);
    }
  }

  async onFileDrop(event: DragEvent, sectionId: string): Promise<void> {
    event.preventDefault();
    this.dragOverSectionId.set(null);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.workspaceStore.importMultipleFiles(Array.from(files), sectionId);
    }
  }
}
