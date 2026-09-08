import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import mermaid from 'mermaid';
import { WorkspaceStore } from '../../core/services/workspace.store';

let mermaidInitialized = false;

@Component({
  selector: 'app-mermaid-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="mermaid-container"
      [class.fullscreen]="isFullscreen()"
      [class.has-error]="hasError()"
    >
      <!-- Diagram Header / Controls -->
      <div class="mermaid-toolbar">
        <div class="toolbar-left">
          <span class="diagram-badge">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4"/>
            </svg>
            Mermaid Diagram
          </span>
          @if (isRendering()) {
            <span class="rendering-indicator">Rendering...</span>
          }
        </div>

        <div class="toolbar-actions">
          @if (!hasError()) {
            <button class="tool-btn" (click)="zoomIn()" title="Zoom In">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button class="tool-btn" (click)="zoomOut()" title="Zoom Out">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button class="tool-btn" (click)="resetZoom()" title="Reset Zoom">
              <span class="zoom-level">{{ zoomPercent() }}%</span>
            </button>
            <button class="tool-btn" (click)="fitToContainer()" title="Fit to Container">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
            </button>
          }

          <button
            class="tool-btn"
            [class.active]="showSource()"
            (click)="toggleSource()"
            title="Toggle Source Code"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            <span>{{ showSource() ? 'Diagram' : 'Source' }}</span>
          </button>

          <button
            class="tool-btn"
            [class.active]="isFullscreen()"
            (click)="toggleFullscreen()"
            title="Toggle Fullscreen"
          >
            @if (isFullscreen()) {
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>
              </svg>
            } @else {
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>
              </svg>
            }
          </button>
        </div>
      </div>

      <!-- Diagram View Area -->
      @if (hasError()) {
        <div class="mermaid-error">
          <div class="error-header">
            <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h4>Mermaid diagram could not be rendered</h4>
          </div>
          <div class="error-message">{{ errorMessage() }}</div>
          <button class="view-source-btn" (click)="showSource.set(!showSource())">
            {{ showSource() ? 'Hide Raw Source' : 'View Raw Source' }}
          </button>
        </div>
      }

      @if (showSource()) {
        <pre class="source-view"><code>{{ code }}</code></pre>
      } @else if (!hasError()) {
        <div
          #viewport
          class="diagram-viewport"
          (mousedown)="startPan($event)"
          (wheel)="onWheel($event)"
        >
          <div
            #diagramContainer
            class="diagram-content"
            [style.transform]="transformStyle()"
          ></div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin: 24px 0;
    }

    .mermaid-container {
      background-color: var(--mermaid-bg);
      border: 1px solid var(--mermaid-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: box-shadow var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        border-color: var(--color-border-focus);
        box-shadow: var(--shadow-md);
      }

      &.fullscreen {
        position: fixed;
        inset: 16px;
        z-index: 10000;
        box-shadow: var(--shadow-glass);
        backdrop-filter: var(--glass-blur);
        border: 1px solid var(--color-primary);
        max-height: none;
      }
    }

    .mermaid-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background-color: var(--color-bg-subtle);
      border-bottom: 1px solid var(--color-border);
      user-select: none;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .diagram-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;

      .icon {
        width: 15px;
        height: 15px;
      }
    }

    .rendering-indicator {
      font-size: 11px;
      color: var(--color-text-tertiary);
      animation: pulse 1.5s infinite;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      font-size: 12px;
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: var(--color-text-primary);
      }

      &.active {
        background-color: var(--color-primary-light);
        color: var(--color-primary);
      }

      .icon {
        width: 14px;
        height: 14px;
      }

      .zoom-level {
        font-family: var(--font-mono);
        font-size: 11px;
      }
    }

    .diagram-viewport {
      position: relative;
      min-height: 220px;
      max-height: 600px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: grab;
      background: radial-gradient(var(--color-border-subtle) 1px, transparent 1px);
      background-size: 16px 16px;

      &:active {
        cursor: grabbing;
      }

      .fullscreen & {
        flex: 1;
        max-height: none;
      }
    }

    .diagram-content {
      transform-origin: center center;
      transition: transform 0.05s ease-out;
      display: flex;
      justify-content: center;
      width: 100%;

      ::ng-deep svg {
        max-width: 100%;
        height: auto;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.06));
      }
    }

    .source-view {
      padding: 16px 20px;
      margin: 0;
      background-color: var(--color-bg-surface);
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.5;
      overflow-x: auto;
      border-radius: 0;
    }

    .mermaid-error {
      padding: 20px;
      background-color: var(--color-danger-bg);
      border-left: 4px solid var(--color-danger);

      .error-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-danger);

        .error-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }
      }

      .error-message {
        margin: 10px 0 14px 26px;
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--color-text-secondary);
        white-space: pre-wrap;
      }

      .view-source-btn {
        margin-left: 26px;
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 500;
        background-color: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary);

        &:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `],
})
export class MermaidRendererComponent implements OnChanges, OnDestroy {
  private workspaceStore = inject(WorkspaceStore);

  @Input({ required: true }) code = '';
  @ViewChild('diagramContainer') diagramContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('viewport') viewport?: ElementRef<HTMLDivElement>;

  readonly showSource = signal(false);
  readonly isFullscreen = signal(false);
  readonly isRendering = signal(false);
  readonly hasError = signal(false);
  readonly errorMessage = signal('');

  // Zoom & Pan state
  readonly scale = signal(1);
  readonly translateX = signal(0);
  readonly translateY = signal(0);

  readonly zoomPercent = signal(100);

  private uniqueId = 'mermaid-' + Math.random().toString(36).substring(2, 10);
  private isPanning = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;

  constructor() {
    this.ensureMermaidInitialized();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['code']) {
      this.renderDiagram();
    }
  }

  ngOnDestroy(): void {
    this.removePanListeners();
  }

  private ensureMermaidInitialized(): void {
    if (!mermaidInitialized) {
      const isDark = document.documentElement.classList.contains('dark-theme');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark ? 'dark' : 'default',
        fontFamily: 'Inter, sans-serif',
        logLevel: 'error',
      });
      mermaidInitialized = true;
    }
  }

  async renderDiagram(): Promise<void> {
    if (!this.code || !this.code.trim()) return;

    this.isRendering.set(true);
    this.hasError.set(false);
    this.errorMessage.set('');

    try {
      this.ensureMermaidInitialized();
      const isDark = document.documentElement.classList.contains('dark-theme');
      // Re-configure theme if needed
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark ? 'dark' : 'default',
        fontFamily: 'Inter, sans-serif',
      });

      const elementId = this.uniqueId + '-' + Date.now();
      const cleanCode = this.code.trim();

      // Render through Mermaid 11.17.2 API
      const { svg } = await mermaid.render(elementId, cleanCode);

      if (this.diagramContainer) {
        this.diagramContainer.nativeElement.innerHTML = svg;
      }
    } catch (err: any) {
      console.warn('Mermaid rendering isolated error:', err);
      this.hasError.set(true);
      this.errorMessage.set(err?.message || 'Syntax error in Mermaid diagram definition.');
      // Remove any temp element left by mermaid if error occurred
      const orphan = document.getElementById(this.uniqueId);
      if (orphan) orphan.remove();
    } finally {
      this.isRendering.set(false);
    }
  }

  transformStyle(): string {
    return `translate(${this.translateX()}px, ${this.translateY()}px) scale(${this.scale()})`;
  }

  zoomIn(): void {
    const next = Math.min(this.scale() + 0.15, 3.5);
    this.scale.set(next);
    this.zoomPercent.set(Math.round(next * 100));
  }

  zoomOut(): void {
    const next = Math.max(this.scale() - 0.15, 0.3);
    this.scale.set(next);
    this.zoomPercent.set(Math.round(next * 100));
  }

  resetZoom(): void {
    this.scale.set(1);
    this.translateX.set(0);
    this.translateY.set(0);
    this.zoomPercent.set(100);
  }

  fitToContainer(): void {
    this.resetZoom();
  }

  toggleFullscreen(): void {
    this.isFullscreen.set(!this.isFullscreen());
    this.resetZoom();
  }

  toggleSource(): void {
    this.showSource.set(!this.showSource());
  }

  onWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
  }

  startPan(event: MouseEvent): void {
    if (event.button !== 0 || this.showSource() || this.hasError()) return;
    this.isPanning = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.currentX = this.translateX();
    this.currentY = this.translateY();

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isPanning) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    this.translateX.set(this.currentX + dx);
    this.translateY.set(this.currentY + dy);
  };

  private onMouseUp = (): void => {
    this.isPanning = false;
    this.removePanListeners();
  };

  private removePanListeners(): void {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  }
}
