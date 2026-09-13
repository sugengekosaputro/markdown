import { Component, EventEmitter, OnDestroy, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ResourcePanelComponent } from '../resources/resource-panel.component';
import { MarkdownViewerComponent } from '../markdown-viewer/markdown-viewer.component';
import { MarkdownEditorComponent } from '../markdown-editor/markdown-editor.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    ResourcePanelComponent,
    MarkdownViewerComponent,
    MarkdownEditorComponent,
  ],
  template: `
    <div class="workspace-layout" [class.resizing]="isResizing()">
      <!-- Left Panel: Resources -->
      @if (showResourcePanel()) {
        <aside
          class="panel resources-panel"
          [style.width.px]="resourceWidth()"
        >
          <app-resource-panel
            (requestImport)="requestImport.emit()"
            (headingSelected)="onHeadingSelected($event)"
          />
        </aside>

        <!-- Splitter 1: Resources ↔ Viewer -->
        @if (showViewerPanel()) {
          <div
            class="splitter splitter-left"
            (mousedown)="startResizeLeft($event)"
            title="Drag to resize explorer"
          >
            <div class="splitter-handle"></div>
          </div>
        }
      }

      <!-- Center Panel: Markdown Viewer -->
      @if (showViewerPanel()) {
        <main class="panel viewer-panel">
          <app-markdown-viewer #viewer />
        </main>

        <!-- Splitter 2: Viewer ↔ Editor -->
        @if (showEditorPanel()) {
          <div
            class="splitter splitter-right"
            (mousedown)="startResizeRight($event)"
            title="Drag to resize editor"
          >
            <div class="splitter-handle"></div>
          </div>
        }
      }

      <!-- Right Panel: Markdown Editor -->
      @if (showEditorPanel()) {
        <aside
          class="panel editor-panel"
          [style.width.px]="editorWidth()"
        >
          <app-markdown-editor />
        </aside>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: calc(100vh - 48px);
      width: 100vw;
      overflow: hidden;
    }

    .workspace-layout {
      display: flex;
      height: 100%;
      width: 100%;
      background-color: var(--color-bg-app);
      position: relative;
      user-select: auto;

      &.resizing {
        user-select: none;
        cursor: col-resize;

        .panel {
          pointer-events: none;
        }
      }
    }

    .panel {
      height: 100%;
      overflow: hidden;
      position: relative;
    }

    .resources-panel {
      flex-shrink: 0;
      background-color: var(--color-bg-surface);
      border-right: 1px solid var(--color-border);
    }

    .viewer-panel {
      flex: 1;
      min-width: 320px;
      background-color: var(--color-bg-app);
    }

    .editor-panel {
      flex-shrink: 0;
      background-color: var(--color-bg-surface);
      border-left: 1px solid var(--color-border);
    }

    .splitter {
      width: 6px;
      height: 100%;
      cursor: col-resize;
      background-color: transparent;
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color var(--transition-fast);

      &:hover, &:active {
        background-color: var(--color-primary-light);

        .splitter-handle {
          background-color: var(--color-primary);
          height: 48px;
        }
      }
    }

    .splitter-handle {
      width: 2px;
      height: 32px;
      border-radius: var(--radius-full);
      background-color: var(--color-border);
      transition: background-color var(--transition-fast), height var(--transition-fast);
    }
  `],
})
export class MainLayoutComponent implements OnDestroy {
  private workspaceStore = inject(WorkspaceStore);

  readonly resourceWidth = this.workspaceStore.resourcePanelWidth;
  readonly editorWidth = this.workspaceStore.editorPanelWidth;
  readonly layoutMode = this.workspaceStore.layoutMode;

  readonly isResizing = signal(false);

  private activeSplitter: 'left' | 'right' | null = null;
  private startX = 0;
  private startWidth = 0;

  // Panel visibility computed from layout mode
  showResourcePanel(): boolean {
    const mode = this.layoutMode();
    return mode === 'default' || mode === 'viewer-dominant';
  }

  showViewerPanel(): boolean {
    const mode = this.layoutMode();
    return mode !== 'editor-only';
  }

  showEditorPanel(): boolean {
    const mode = this.layoutMode();
    return mode === 'default' || mode === 'editor-only' || mode === 'viewer-editor';
  }

  @Output() requestImport = new EventEmitter<void>();

  onHeadingSelected(slug: string): void {
    const target = document.getElementById(slug);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  startResizeLeft(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing.set(true);
    this.activeSplitter = 'left';
    this.startX = event.clientX;
    this.startWidth = this.resourceWidth();

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  startResizeRight(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing.set(true);
    this.activeSplitter = 'right';
    this.startX = event.clientX;
    this.startWidth = this.editorWidth();

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isResizing()) return;

    if (this.activeSplitter === 'left') {
      const delta = event.clientX - this.startX;
      this.workspaceStore.setResourcePanelWidth(this.startWidth + delta);
    } else if (this.activeSplitter === 'right') {
      const delta = this.startX - event.clientX;
      this.workspaceStore.setEditorPanelWidth(this.startWidth + delta);
    }
  };

  private onMouseUp = (): void => {
    this.isResizing.set(false);
    this.activeSplitter = null;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  };

  ngOnDestroy(): void {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  }
}
