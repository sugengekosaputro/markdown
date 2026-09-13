import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { OutlineItem } from '../../core/models/workspace.models';

@Component({
  selector: 'app-outline-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="outline-container">
      @if (outline().length > 0) {
        <nav class="outline-nav">
          @for (item of outline(); track item.id) {
            <a
              class="outline-item level-{{ item.level }}"
              (click)="onItemClick(item)"
              [title]="item.text"
            >
              <span class="level-indicator">H{{ item.level }}</span>
              <span class="outline-text">{{ item.text }}</span>
            </a>
          }
        </nav>
      } @else {
        <div class="outline-empty">
          <p>No headings found in the active document.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }

    .outline-container {
      padding: 12px 8px;
    }

    .outline-nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .outline-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 12.5px;
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        background-color: var(--color-bg-surface-hover);
        color: #ffffff;

        .level-indicator {
          border-color: var(--color-primary);
          color: var(--color-primary-hover);
        }
      }

      &.level-1 {
        padding-left: 8px;
        font-weight: 700;
        color: var(--color-text-primary);
        font-size: 13px;
      }
      &.level-2 {
        padding-left: 18px;
        font-weight: 600;
        color: var(--color-text-primary);
        font-size: 12.5px;
      }
      &.level-3 {
        padding-left: 28px;
        font-weight: 500;
        color: var(--color-text-primary);
        font-size: 12px;
      }
      &.level-4 {
        padding-left: 38px;
        font-size: 12px;
        color: var(--color-text-primary);
      }
      &.level-5 {
        padding-left: 48px;
        font-size: 11.5px;
        color: var(--color-text-primary);
      }
      &.level-6 {
        padding-left: 58px;
        font-size: 11px;
        color: var(--color-text-primary);
      }
    }

    .level-indicator {
      font-size: 9.5px;
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--color-accent);
      background-color: var(--color-bg-surface-elevated);
      border: 1px solid var(--color-border);
      padding: 1px 5px;
      border-radius: var(--radius-xs);
      flex-shrink: 0;
      transition: all var(--transition-fast);
    }

    .outline-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .outline-empty {
      padding: 30px 16px;
      text-align: center;
      font-size: 12.5px;
      color: var(--color-text-secondary);
      font-style: italic;
    }
  `],
})
export class OutlineTreeComponent {
  private workspaceStore = inject(WorkspaceStore);

  @Output() headingSelected = new EventEmitter<string>();

  readonly outline = this.workspaceStore.outline;

  onItemClick(item: OutlineItem): void {
    this.headingSelected.emit(item.slug);

    // Scroll viewer element if exists
    if (typeof document !== 'undefined') {
      const target = document.getElementById(item.slug);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
