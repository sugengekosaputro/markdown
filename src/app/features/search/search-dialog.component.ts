import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { SearchResult } from '../../core/models/workspace.models';

@Component({
  selector: 'app-search-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-backdrop" (click)="close.emit()">
      <div class="search-palette" (click)="$event.stopPropagation()">
        <!-- Search Input Bar -->
        <div class="palette-input-bar">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            #searchInput
            type="text"
            placeholder="Search documents or full-text content... (ESC to close)"
            [(ngModel)]="query"
            (ngModelChange)="onSearchChange()"
            (keydown.arrowdown)="moveSelection(1)"
            (keydown.arrowup)="moveSelection(-1)"
            (keydown.enter)="selectCurrent()"
            (keydown.escape)="close.emit()"
            autofocus
          />
          <span class="esc-badge">ESC</span>
        </div>

        <!-- Search Results List -->
        <div class="results-container">
          @if (query.trim()) {
            @if (results().length > 0) {
              <div class="results-list">
                @for (item of results(); track item.documentId; let idx = $index) {
                  <div
                    class="result-item"
                    [class.selected]="selectedIndex() === idx"
                    (click)="openResult(item)"
                    (mouseenter)="selectedIndex.set(idx)"
                  >
                    <div class="result-header">
                      <svg class="doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span class="result-filename">{{ item.fileName }}</span>
                      <span class="result-section">{{ item.sectionName }}</span>
                      @if (item.matchCount > 1) {
                        <span class="match-badge">{{ item.matchCount }} matches</span>
                      }
                    </div>
                    @if (item.snippet) {
                      <div class="result-snippet">
                        {{ item.snippet }}
                      </div>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="no-results">
                <p>No results found for "<strong>{{ query }}</strong>"</p>
              </div>
            }
          } @else {
            <div class="search-tip">
              <p>Type to search filenames or full-text content across all workspace documents.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background-color: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(5px);
      display: flex;
      justify-content: center;
      padding-top: 10vh;
    }

    .search-palette {
      width: 100%;
      max-width: 600px;
      height: fit-content;
      max-height: 75vh;
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-glass);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: scaleIn 0.15s ease-out;
    }

    .palette-input-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-bg-subtle);

      .search-icon {
        width: 18px;
        height: 18px;
        color: var(--color-primary);
        flex-shrink: 0;
      }

      input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 15px;
        color: var(--color-text-primary);
        padding: 0;
        box-shadow: none !important;

        &::placeholder {
          color: var(--color-text-tertiary);
        }
      }

      .esc-badge {
        font-size: 10px;
        font-family: var(--font-mono);
        color: var(--color-text-tertiary);
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xs);
        padding: 2px 6px;
      }
    }

    .results-container {
      max-height: calc(75vh - 65px);
      overflow-y: auto;
      padding: 8px;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .result-item {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover, &.selected {
        background-color: var(--color-primary-light);

        .result-filename {
          color: var(--color-primary);
        }
      }
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: 8px;

      .doc-icon {
        width: 15px;
        height: 15px;
        color: var(--color-text-tertiary);
      }

      .result-filename {
        font-size: 13.5px;
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .result-section {
        font-size: 11px;
        color: var(--color-text-tertiary);
        background-color: var(--color-bg-subtle);
        padding: 1px 6px;
        border-radius: var(--radius-xs);
      }

      .match-badge {
        margin-left: auto;
        font-size: 11px;
        color: var(--color-accent);
        font-weight: 500;
      }
    }

    .result-snippet {
      margin-top: 6px;
      margin-left: 23px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--color-text-secondary);
      font-family: var(--font-mono);
    }

    .no-results, .search-tip {
      padding: 36px 20px;
      text-align: center;
      color: var(--color-text-tertiary);
      font-size: 13px;
    }

    @keyframes scaleIn {
      from {
        transform: scale(0.97);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
  `],
})
export class SearchDialogComponent {
  private workspaceStore = inject(WorkspaceStore);

  @Output() close = new EventEmitter<void>();
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  query = '';
  readonly results = signal<SearchResult[]>([]);
  readonly selectedIndex = signal<number>(0);

  onSearchChange(): void {
    const res = this.workspaceStore.search(this.query);
    this.results.set(res);
    this.selectedIndex.set(0);
  }

  moveSelection(delta: number): void {
    const list = this.results();
    if (list.length === 0) return;
    const next = Math.max(0, Math.min(list.length - 1, this.selectedIndex() + delta));
    this.selectedIndex.set(next);
  }

  selectCurrent(): void {
    const list = this.results();
    const current = list[this.selectedIndex()];
    if (current) {
      this.openResult(current);
    }
  }

  openResult(result: SearchResult): void {
    this.workspaceStore.setActiveDocument(result.documentId);
    this.close.emit();
  }
}
