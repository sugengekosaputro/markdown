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
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, openSearchPanel } from '@codemirror/search';
import { JsonWorkspaceStore } from '../../../core/services/json-workspace.store';
import { WorkspaceStore } from '../../../core/services/workspace.store';
import { copyToClipboard } from '../../../core/utils/clipboard.util';

@Component({
  selector: 'app-json-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container">
      <!-- Editor Header Toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <div class="editor-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>JSON Editor</span>
          </div>

          <!-- Save Status Dot Badge -->
          <div class="save-badge" [class]="saveStatus()">
            @switch (saveStatus()) {
              @case ('editing') {
                <span class="dot editing"></span>
                <span>Editing...</span>
              }
              @case ('saving') {
                <span class="dot saving"></span>
                <span>Saving...</span>
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

        <div class="toolbar-right">
          <!-- Formatter Actions -->
          <div class="formatter-group">
            <button class="tool-btn" (click)="prettify(2)" title="Format JSON (2 spaces)">
              <span>Prettify 2s</span>
            </button>
            <button class="tool-btn" (click)="prettify(4)" title="Format JSON (4 spaces)">
              <span>4s</span>
            </button>
            <button class="tool-btn" (click)="minify()" title="Minify / Compact JSON">
              <span>Minify</span>
            </button>
            <button class="tool-btn" (click)="sortKeys()" title="Sort Keys Alphabetically (A-Z)">
              <span>Sort A-Z</span>
            </button>
          </div>

          <div class="tool-divider"></div>

          <button class="tool-btn icon-only" (click)="openFind()" title="Find / Replace (⌘F)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button class="tool-btn icon-only" (click)="copyEditorContent()" title="Copy Formatted Content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          <button class="tool-btn icon-only" (click)="collapseEditor()" title="Collapse Editor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- CodeMirror Mount Point -->
      <div #editorHost class="editor-host"></div>

      <!-- Editor Bottom Status Bar -->
      <div class="editor-statusbar">
        <span>Lines: {{ lineCount() }}</span>
        <span class="dot">•</span>
        <span>Chars: {{ charCount() }}</span>
        @if (copySuccess()) {
          <span class="copy-success-badge">Copied!</span>
        }
      </div>
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
      position: relative;
    }

    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      height: 44px;
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-bg-subtle);
      user-select: none;
      flex-shrink: 0;
      gap: 8px;
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .editor-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-primary);

      svg {
        width: 15px;
        height: 15px;
        color: var(--color-primary);
      }
    }

    .save-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: var(--radius-full, 12px);
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: var(--color-text-tertiary);

        &.editing {
          background-color: #f59e0b;
        }
        &.saving {
          background-color: var(--color-primary);
          animation: pulse 1s infinite;
        }
        &.saved {
          background-color: #10b981;
        }
        &.error {
          background-color: #ef4444;
        }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .formatter-group {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border-radius: var(--radius-sm, 6px);
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
    }

    .tool-btn {
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

      &.icon-only {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;

        svg {
          width: 14px;
          height: 14px;
        }
      }
    }

    .tool-divider {
      width: 1px;
      height: 16px;
      background-color: var(--color-border);
      margin: 0 2px;
    }

    .editor-host {
      flex: 1;
      overflow: hidden;
      font-family: var(--font-mono, monospace);
      font-size: 13px;

      ::ng-deep .cm-editor {
        height: 100%;
        width: 100%;
        background-color: var(--color-bg-surface);

        &.cm-focused {
          outline: none;
        }
      }

      ::ng-deep .cm-scroller {
        font-family: var(--font-mono, monospace);
        line-height: 1.6;
        padding: 4px 0;
      }

      ::ng-deep .cm-gutters {
        background-color: var(--color-bg-subtle);
        border-right: 1px solid var(--color-border);
        color: var(--color-text-tertiary);
      }
    }

    .editor-statusbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      height: 24px;
      background-color: var(--color-bg-subtle);
      border-top: 1px solid var(--color-border);
      font-size: 11px;
      color: var(--color-text-tertiary);
      flex-shrink: 0;

      .dot {
        opacity: 0.5;
      }
    }

    .copy-success-badge {
      margin-left: auto;
      color: #10b981;
      font-weight: 700;
    }
  `],
})
export class JsonEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private jsonStore = inject(JsonWorkspaceStore);
  private workspaceStore = inject(WorkspaceStore); // for global theme

  readonly activeDoc = this.jsonStore.activeDocument;
  readonly saveStatus = this.jsonStore.saveStatus;
  readonly globalTheme = this.workspaceStore.theme;

  readonly lineCount = signal<number>(1);
  readonly charCount = signal<number>(0);
  readonly copySuccess = signal<boolean>(false);

  private editorView: EditorView | null = null;
  private themeCompartment = new Compartment();
  private internalUpdate = false;

  constructor() {
    // Sync editor content with active document changes
    effect(() => {
      const doc = this.activeDoc();
      if (!doc || !this.editorView) return;

      const currentContent = this.editorView.state.doc.toString();
      if (currentContent !== doc.content && !this.internalUpdate) {
        this.editorView.dispatch({
          changes: { from: 0, to: currentContent.length, insert: doc.content },
        });
        this.updateCounts(doc.content);
      }
    });

    // Sync theme
    effect(() => {
      const themeMode = this.globalTheme();
      if (this.editorView) {
        this.applyTheme(themeMode);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initCodeMirror();
  }

  private initCodeMirror(): void {
    const initialText = this.activeDoc()?.content || '';

    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        const text = update.state.doc.toString();
        this.updateCounts(text);
        this.internalUpdate = true;
        this.jsonStore.updateActiveDocumentContent(text);
        this.internalUpdate = false;
      }
    });

    const isDark =
      this.globalTheme() === 'dark' ||
      (this.globalTheme() === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    const startState = EditorState.create({
      doc: initialText,
      extensions: [
        basicSetup,
        history(),
        json(),
        lintGutter(),
        linter(jsonParseLinter()),
        this.themeCompartment.of(isDark ? oneDark : []),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        updateListener,
      ],
    });

    this.editorView = new EditorView({
      state: startState,
      parent: this.editorHost.nativeElement,
    });

    this.updateCounts(initialText);
  }

  private applyTheme(mode: string): void {
    if (!this.editorView) return;
    const isDark =
      mode === 'dark' ||
      (mode === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(isDark ? oneDark : []),
    });
  }

  private updateCounts(text: string): void {
    this.lineCount.set(text.split('\n').length);
    this.charCount.set(text.length);
  }

  prettify(indent: 2 | 4 = 2): void {
    this.jsonStore.prettifyActiveDocument(indent);
  }

  minify(): void {
    this.jsonStore.minifyActiveDocument();
  }

  sortKeys(): void {
    this.jsonStore.sortKeysActiveDocument();
  }

  openFind(): void {
    if (this.editorView) {
      openSearchPanel(this.editorView);
    }
  }

  async copyEditorContent(): Promise<void> {
    if (this.editorView) {
      const text = this.editorView.state.doc.toString();
      await copyToClipboard(text);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    }
  }

  collapseEditor(): void {
    const current = this.jsonStore.layoutMode();
    if (current === 'default') {
      this.jsonStore.setLayoutMode('viewer-dominant');
    } else {
      this.jsonStore.setLayoutMode('viewer-only');
    }
  }

  ngOnDestroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }
}
