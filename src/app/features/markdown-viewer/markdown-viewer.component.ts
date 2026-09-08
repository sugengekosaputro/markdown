import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Marked } from 'marked';
import hljs from 'highlight.js';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { SanitizerService } from '../../core/security/sanitizer.service';
import { MermaidRendererComponent } from './mermaid-renderer.component';

interface ViewerChunk {
  id: string;
  type: 'markdown' | 'mermaid';
  content: string;
  renderedHtml?: string;
}

@Component({
  selector: 'app-markdown-viewer',
  standalone: true,
  imports: [CommonModule, MermaidRendererComponent],
  template: `
    <div class="viewer-wrapper" #scrollContainer>
      @if (activeDoc(); as doc) {
        <article class="markdown-body">
          <!-- Document Header -->
          <header class="doc-header">
            <div class="doc-meta">
              <span class="doc-badge">{{ doc.sourceType === 'imported' ? 'Imported' : 'Local Document' }}</span>
              <span class="doc-date">Updated {{ doc.updatedAt | date:'medium' }}</span>
            </div>
            <h1 class="doc-title">{{ doc.fileName }}</h1>
          </header>

          <!-- Document Rendered Chunks -->
          <div class="chunks-container">
            @for (chunk of chunks(); track chunk.id) {
              @if (chunk.type === 'markdown') {
                <div class="markdown-chunk" [innerHTML]="chunk.renderedHtml"></div>
              } @else if (chunk.type === 'mermaid') {
                <app-mermaid-renderer [code]="chunk.content" />
              }
            }
          </div>
        </article>
      } @else {
        <!-- Empty State -->
        <div class="viewer-empty">
          <div class="empty-card">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h3>No Document Selected</h3>
            <p>Select a document from the resource panel on the left, or create/import Markdown files.</p>
            <div class="empty-actions">
              <button class="action-btn primary" (click)="createNewDoc()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Document
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background-color: var(--color-bg-app);
    }

    .viewer-wrapper {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      scroll-behavior: smooth;
    }

    .doc-header {
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-border);
    }

    .doc-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .doc-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: var(--radius-xs);
      background-color: var(--color-primary-light);
      color: var(--color-primary);
    }

    .doc-date {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }

    .doc-title {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      border-bottom: none;
      padding-bottom: 0;
    }

    .chunks-container {
      display: flex;
      flex-direction: column;
    }

    .viewer-empty {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .empty-card {
      max-width: 440px;
      text-align: center;
      padding: 40px 32px;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm);
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-lg);
      background: var(--color-primary-light);
      color: var(--color-primary);

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .empty-card h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--color-text-primary);
    }

    .empty-card p {
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .empty-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      transition: all var(--transition-fast);

      svg {
        width: 16px;
        height: 16px;
      }

      &.primary {
        background-color: var(--color-primary);
        color: var(--color-text-inverse);

        &:hover {
          background-color: var(--color-primary-hover);
        }
      }
    }
  `],
})
export class MarkdownViewerComponent {
  private workspaceStore = inject(WorkspaceStore);
  private sanitizer = inject(SanitizerService);
  private elementRef = inject(ElementRef);

  readonly activeDoc = this.workspaceStore.activeDocument;
  private markedParser: Marked;

  readonly chunks = computed<ViewerChunk[]>(() => {
    const doc = this.activeDoc();
    if (!doc) return [];
    return this.parseDocumentChunks(doc.content);
  });

  constructor() {
    this.markedParser = new Marked({
      gfm: true,
      breaks: false,
    });

    // Custom renderer for code blocks
    const renderer = {
      code: ({ text, lang }: { text: string; lang?: string }) => {
        const language = lang && hljs.getLanguage(lang) ? lang : undefined;
        let highlighted = '';
        if (language) {
          try {
            highlighted = hljs.highlight(text, { language }).value;
          } catch {
            highlighted = this.escapeHtml(text);
          }
        } else {
          highlighted = this.escapeHtml(text);
        }
        return `<pre><code class="hljs ${language || ''}">${highlighted}</code></pre>`;
      },
      heading: ({ tokens, depth }: { tokens: any[]; depth: number }) => {
        const text = tokens.map((t) => t.raw || '').join('');
        const plainText = text.replace(/[*_~`]/g, '').trim();
        const slug = plainText
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');
        const parsed = this.markedParser.parseInline(text);
        return `<h${depth} id="${slug}">${parsed}</h${depth}>`;
      },
    };

    this.markedParser.use({ renderer });
  }

  createNewDoc(): void {
    this.workspaceStore.createDocument();
  }

  scrollToHeading(slug: string): void {
    const el = this.elementRef.nativeElement.querySelector(`#${slug}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private parseDocumentChunks(markdown: string): ViewerChunk[] {
    const chunks: ViewerChunk[] = [];
    const mermaidRegex = /(?:^|\n)```mermaid\r?\n([\s\S]*?)\r?\n```/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = mermaidRegex.exec(markdown)) !== null) {
      const matchStart = match.index;
      const matchEnd = mermaidRegex.lastIndex;

      // Leading markdown content
      const leadingMarkdown = markdown.substring(lastIndex, matchStart);
      if (leadingMarkdown.trim()) {
        const rawHtml = this.markedParser.parse(leadingMarkdown) as string;
        chunks.push({
          id: `chunk-md-${index++}`,
          type: 'markdown',
          content: leadingMarkdown,
          renderedHtml: this.sanitizer.sanitize(rawHtml),
        });
      }

      // Mermaid block
      const mermaidCode = match[1];
      chunks.push({
        id: `chunk-mermaid-${index++}`,
        type: 'mermaid',
        content: mermaidCode,
      });

      lastIndex = matchEnd;
    }

    // Trailing markdown content
    const trailingMarkdown = markdown.substring(lastIndex);
    if (trailingMarkdown.trim() || chunks.length === 0) {
      const rawHtml = this.markedParser.parse(trailingMarkdown) as string;
      chunks.push({
        id: `chunk-md-${index++}`,
        type: 'markdown',
        content: trailingMarkdown,
        renderedHtml: this.sanitizer.sanitize(rawHtml),
      });
    }

    return chunks;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
