import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { basicSetup } from 'codemirror';
import { EditorView, keymap, ViewUpdate } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, openSearchPanel } from '@codemirror/search';
import { WorkspaceStore } from '../../core/services/workspace.store';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container">
      <!-- Editor Header / Toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <span class="editor-title">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Editor
          </span>
          <!-- Save Status Badge -->
          <div class="save-badge" [class]="saveStatusClass()">
            @switch (saveStatus()) {
              @case ('editing') {
                <span class="dot editing"></span>
                <span>Editing...</span>
              }
              @case ('saving') {
                <span class="dot saving"></span>
                <span>Saving locally...</span>
              }
              @case ('saved') {
                <span class="dot saved"></span>
                <span>Saved locally</span>
              }
              @case ('error') {
                <span class="dot error"></span>
                <span>Save failed</span>
              }
              @default {
                <span class="dot idle"></span>
                <span>Synced</span>
              }
            }
          </div>
        </div>

        <div class="toolbar-actions">
          <button class="tool-btn" (click)="openSearch()" title="Find in document (Ctrl/Cmd+F)">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button class="tool-btn" (click)="forceSave()" title="Save immediately (Ctrl/Cmd+S)">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
          </button>
          <button class="tool-btn" (click)="collapseEditor()" title="Collapse Editor (Ctrl/Cmd+E)">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- CodeMirror Mount Element -->
      <div #editorHost class="editor-host"></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background-color: var(--color-bg-surface);
    }

    .editor-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background-color: var(--color-bg-surface);
    }

    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      height: 42px;
      background-color: var(--color-bg-subtle);
      border-bottom: 1px solid var(--color-border);
      user-select: none;
      flex-shrink: 0;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .editor-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;

      .icon {
        width: 14px;
        height: 14px;
        color: var(--color-primary);
      }
    }

    .save-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-secondary);
      padding: 2px 8px;
      border-radius: var(--radius-xs);
      background-color: var(--color-bg-surface-elevated);
      border: 1px solid var(--color-border);

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;

        &.editing { background-color: var(--color-warning); }
        &.saving { background-color: var(--color-accent); animation: blink 1s infinite; }
        &.saved { background-color: var(--color-success); }
        &.error { background-color: var(--color-danger); }
        &.idle { background-color: var(--color-text-secondary); }
      }
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .tool-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: #ffffff;
      }

      .icon {
        width: 15px;
        height: 15px;
      }
    }

    .editor-host {
      flex: 1;
      height: calc(100% - 42px);
      width: 100%;
      overflow: hidden;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `],
})
export class MarkdownEditorComponent implements AfterViewInit, OnDestroy {
  private workspaceStore = inject(WorkspaceStore);

  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  readonly activeDoc = this.workspaceStore.activeDocument;
  readonly saveStatus = this.workspaceStore.saveStatus;

  readonly saveStatusClass = computed(() => `status-${this.saveStatus()}`);

  private editorView: EditorView | null = null;
  private themeCompartment = new Compartment();
  private currentDocId: string | null = null;
  private isInternalUpdate = false;

  constructor() {
    // Effect to update editor content when active document changes
    effect(() => {
      const doc = this.activeDoc();
      if (!doc) {
        if (this.editorView && this.currentDocId !== null) {
          this.setEditorText('');
          this.currentDocId = null;
        }
        return;
      }

      if (this.currentDocId !== doc.id) {
        this.currentDocId = doc.id;
        this.setEditorText(doc.content);
      }
    });

    // Effect to react to theme changes
    effect(() => {
      const theme = this.workspaceStore.theme();
      this.updateEditorTheme();
    });
  }

  ngAfterViewInit(): void {
    this.initCodeMirror();
  }

  ngOnDestroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }

  private initCodeMirror(): void {
    const isDark = document.documentElement.classList.contains('dark-theme');
    const startState = EditorState.create({
      doc: this.activeDoc()?.content || '',
      extensions: [
        basicSetup,
        history(),
        markdown(),
        this.themeCompartment.of(isDark ? oneDark : []),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          {
            key: 'Mod-s',
            run: () => {
              this.forceSave();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged && !this.isInternalUpdate) {
            const newContent = update.state.doc.toString();
            const doc = this.activeDoc();
            if (doc) {
              this.workspaceStore.updateDocumentContent(doc.id, newContent);
            }
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    this.editorView = new EditorView({
      state: startState,
      parent: this.editorHost.nativeElement,
    });
  }

  private setEditorText(text: string): void {
    if (!this.editorView) return;
    const currentText = this.editorView.state.doc.toString();
    if (currentText === text) return;

    this.isInternalUpdate = true;
    this.editorView.dispatch({
      changes: { from: 0, to: currentText.length, insert: text },
    });
    this.isInternalUpdate = false;
  }

  private updateEditorTheme(): void {
    if (!this.editorView) return;
    const isDark = document.documentElement.classList.contains('dark-theme');
    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(isDark ? oneDark : []),
    });
  }

  openSearch(): void {
    if (this.editorView) {
      openSearchPanel(this.editorView);
    }
  }

  forceSave(): void {
    this.workspaceStore.forceSave();
  }

  collapseEditor(): void {
    const current = this.workspaceStore.layoutMode();
    if (current === 'editor-only') {
      this.workspaceStore.setLayoutMode('default');
    } else {
      this.workspaceStore.setLayoutMode('viewer-only');
    }
  }
}
