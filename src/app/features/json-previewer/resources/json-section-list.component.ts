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
import {
  JsonDocument,
  JsonSection,
  UNASSIGNED_JSON_SECTION_ID,
} from '../../../core/models/json-workspace.models';
import { JsonWorkspaceStore } from '../../../core/services/json-workspace.store';
import { ExportService } from '../../../core/services/export.service';

@Component({
  selector: 'app-json-section-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
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
                <polyline points="6 9 12 15 18 9" />
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
                title="New JSON file in this section"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              @if (!section.isSystem) {
                <button
                  class="action-icon-btn"
                  (click)="startRename(section)"
                  title="Rename section"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
                <button
                  class="action-icon-btn danger"
                  (click)="deleteSection(section)"
                  title="Delete section (move files to Unassigned)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              }
            </div>
          </div>

          <!-- Section Documents List -->
          @if (!section.collapsed) {
            <div
              class="docs-list"
              cdkDropList
              [id]="'section-' + section.id"
              [cdkDropListData]="getDocsForSection(section.id)"
              [cdkDropListConnectedTo]="allSectionDropIds()"
              (cdkDropListDropped)="onDrop($event, section.id)"
            >
              @for (doc of getDocsForSection(section.id); track doc.id) {
                <div
                  class="doc-item"
                  [class.active]="activeDocId() === doc.id"
                  cdkDrag
                  [cdkDragData]="doc"
                  (click)="selectDocument(doc.id)"
                >
                  <!-- Drag placeholder -->
                  <div class="drag-placeholder" *cdkDragPlaceholder></div>

                  <!-- File Icon & Details -->
                  <div class="doc-icon-badge">
                    <span>&#123;&#125;</span>
                  </div>

                  <div class="doc-info">
                    @if (editingDocId() === doc.id) {
                      <input
                        type="text"
                        class="doc-rename-input"
                        [(ngModel)]="editDocName"
                        (blur)="finishDocRename(doc.id)"
                        (keydown.enter)="finishDocRename(doc.id)"
                        (keydown.escape)="cancelDocRename()"
                        (click)="$event.stopPropagation()"
                        autofocus
                      />
                    } @else {
                      <span class="doc-title" [title]="doc.fileName">{{ doc.fileName }}</span>
                    }
                  </div>

                  <!-- Hover Document Actions -->
                  <div class="doc-actions" (click)="$event.stopPropagation()">
                    <button
                      class="doc-action-btn"
                      (click)="startDocRename(doc)"
                      title="Rename file"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button
                      class="doc-action-btn"
                      (click)="exportDocument(doc)"
                      title="Export .json"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button
                      class="doc-action-btn danger"
                      (click)="deleteDocument(doc.id)"
                      title="Delete file"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-section-hint">No JSON documents in this section.</div>
              }
            </div>
          }
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
      gap: 6px;
    }

    .section-group {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm, 6px);
      background-color: var(--color-bg-surface);
      overflow: hidden;
      transition: border-color var(--transition-fast, 150ms ease);

      &.drag-over {
        border-color: var(--color-primary);
        background-color: var(--color-primary-light, rgba(99, 102, 241, 0.08));
      }
    }

    .section-header {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      background-color: var(--color-bg-subtle);
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
      user-select: none;

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
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
    }

    .chevron-icon {
      width: 13px;
      height: 13px;
      transition: transform var(--transition-fast, 150ms ease);

      &.collapsed {
        transform: rotate(-90deg);
      }
    }

    .section-name-area {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      margin-left: 4px;
      overflow: hidden;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .system-tag {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 4px;
      background-color: var(--color-border);
      color: var(--color-text-tertiary);
      border-radius: 3px;
      margin-left: 4px;
    }

    .doc-count {
      font-size: 11px;
      color: var(--color-text-tertiary);
    }

    .section-rename-input {
      font-size: 12px;
      font-weight: 600;
      padding: 1px 4px;
      border: 1px solid var(--color-primary);
      border-radius: 3px;
      background: var(--color-bg-surface);
      color: var(--color-text-primary);
      width: 100%;
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      opacity: 0.3;
      transition: opacity var(--transition-fast, 150ms ease);
    }

    .action-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      border-radius: 3px;
      cursor: pointer;

      &:hover {
        background-color: var(--color-bg-surface);
        color: var(--color-text-primary);

        &.danger {
          color: #ef4444;
        }
      }

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .docs-list {
      display: flex;
      flex-direction: column;
      padding: 3px;
      min-height: 20px;
    }

    .doc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      border-radius: var(--radius-xs, 4px);
      cursor: pointer;
      user-select: none;
      transition: all var(--transition-fast, 150ms ease);
      font-size: 12px;

      &:hover {
        background-color: var(--color-bg-surface-hover);

        .doc-actions {
          opacity: 1;
        }
      }

      &.active {
        background-color: var(--color-doc-active-bg, rgba(99, 102, 241, 0.15));
        color: var(--color-primary);
        font-weight: 600;

        .doc-icon-badge {
          background-color: var(--color-primary);
          color: #ffffff;
        }
      }
    }

    .doc-icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      background-color: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      font-family: var(--font-mono, monospace);
      font-size: 10px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .doc-info {
      flex: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .doc-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .doc-rename-input {
      font-size: 12px;
      padding: 1px 4px;
      border: 1px solid var(--color-primary);
      border-radius: 3px;
      background: var(--color-bg-surface);
      color: var(--color-text-primary);
      width: 100%;
    }

    .doc-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      opacity: 0;
      transition: opacity var(--transition-fast, 150ms ease);
    }

    .doc-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-text-tertiary);
      border-radius: 3px;
      cursor: pointer;

      &:hover {
        background-color: var(--color-bg-surface);
        color: var(--color-text-primary);

        &.danger {
          color: #ef4444;
        }
      }

      svg {
        width: 11px;
        height: 11px;
      }
    }

    .empty-section-hint {
      padding: 6px 10px;
      font-size: 11px;
      color: var(--color-text-tertiary);
      font-style: italic;
    }

    .drag-placeholder {
      background: rgba(99, 102, 241, 0.1);
      border: 1px dashed var(--color-primary);
      min-height: 28px;
      border-radius: 4px;
    }
  `],
})
export class JsonSectionListComponent {
  @Input() filterQuery = '';

  private jsonStore = inject(JsonWorkspaceStore);
  private exportService = inject(ExportService);

  readonly sections = this.jsonStore.sections;
  readonly documents = this.jsonStore.documents;
  readonly activeDocId = this.jsonStore.activeDocumentId;

  readonly dragOverSectionId = signal<string | null>(null);
  readonly editingSectionId = signal<string | null>(null);
  readonly editingDocId = signal<string | null>(null);

  editName = '';
  editDocName = '';

  @ViewChild('renameInput') renameInput?: ElementRef<HTMLInputElement>;

  readonly allSectionDropIds = computed(() => {
    return this.sections().map((s) => 'section-' + s.id);
  });

  filteredSections(): JsonSection[] {
    const q = this.filterQuery.trim().toLowerCase();
    if (!q) return this.sections();

    // Show sections that match the query or contain matching documents
    return this.sections().filter((s) => {
      const matchSection = s.name.toLowerCase().includes(q);
      const hasMatchingDoc = this.documents().some(
        (d) => d.sectionId === s.id && d.fileName.toLowerCase().includes(q)
      );
      return matchSection || hasMatchingDoc;
    });
  }

  getDocCount(sectionId: string): number {
    return this.documents().filter((d) => d.sectionId === sectionId).length;
  }

  getDocsForSection(sectionId: string): JsonDocument[] {
    const q = this.filterQuery.trim().toLowerCase();
    const docs = this.documents()
      .filter((d) => d.sectionId === sectionId)
      .sort((a, b) => a.order - b.order);

    if (!q) return docs;
    return docs.filter((d) => d.fileName.toLowerCase().includes(q));
  }

  toggleCollapse(sectionId: string): void {
    this.jsonStore.toggleSectionCollapse(sectionId);
  }

  addDocument(sectionId: string): void {
    this.jsonStore.createDocument(sectionId);
  }

  selectDocument(docId: string): void {
    this.jsonStore.selectDocument(docId);
  }

  startRename(section: JsonSection): void {
    this.editName = section.name;
    this.editingSectionId.set(section.id);
    setTimeout(() => this.renameInput?.nativeElement.focus(), 50);
  }

  finishRename(sectionId: string): void {
    if (this.editName.trim()) {
      this.jsonStore.renameSection(sectionId, this.editName);
    }
    this.editingSectionId.set(null);
  }

  cancelRename(): void {
    this.editingSectionId.set(null);
  }

  deleteSection(section: JsonSection): void {
    if (confirm(`Delete section "${section.name}"? Contained files will be moved to Unassigned.`)) {
      this.jsonStore.deleteSection(section.id);
    }
  }

  startDocRename(doc: JsonDocument): void {
    this.editDocName = doc.fileName;
    this.editingDocId.set(doc.id);
  }

  finishDocRename(docId: string): void {
    if (this.editDocName.trim()) {
      this.jsonStore.renameDocument(docId, this.editDocName);
    }
    this.editingDocId.set(null);
  }

  cancelDocRename(): void {
    this.editingDocId.set(null);
  }

  deleteDocument(docId: string): void {
    this.jsonStore.deleteDocument(docId);
  }

  exportDocument(doc: JsonDocument): void {
    this.exportService.exportSingleJsonDocument(doc);
  }

  // --- DRAG & DROP ---

  onDrop(event: CdkDragDrop<JsonDocument[]>, targetSectionId: string): void {
    if (event.previousContainer === event.container) {
      this.jsonStore.reorderDocuments(targetSectionId, event.previousIndex, event.currentIndex);
    } else {
      const doc = event.item.data as JsonDocument;
      this.jsonStore.moveDocument(doc.id, targetSectionId);
    }
  }

  onDragOver(event: DragEvent, sectionId: string): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      this.dragOverSectionId.set(sectionId);
    }
  }

  onDragLeave(event: DragEvent, sectionId: string): void {
    this.dragOverSectionId.set(null);
  }

  async onFileDrop(event: DragEvent, sectionId: string): Promise<void> {
    event.preventDefault();
    this.dragOverSectionId.set(null);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.jsonStore.importMultipleFiles(Array.from(files), sectionId);
    }
  }
}
