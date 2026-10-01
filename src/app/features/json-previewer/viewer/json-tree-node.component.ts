import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JsonTreeNode } from '../../../core/models/json-workspace.models';

@Component({
  selector: 'app-json-tree-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tree-node" [style.padding-left.px]="node.depth * 18">
      <div
        class="node-row"
        [class.matched]="node.matched"
        (click)="onNodeClick($event)"
      >
        <!-- Expand / Collapse chevron for compound objects -->
        @if (isCompound) {
          <button
            class="toggle-btn"
            (click)="toggleExpand($event)"
            [title]="node.isExpanded ? 'Collapse' : 'Expand'"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              [class.expanded]="node.isExpanded"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        } @else {
          <span class="leaf-spacer"></span>
        }

        <!-- Key name -->
        <span class="node-key" (click)="selectPath($event)">{{ node.key }}</span>
        <span class="colon">:</span>

        <!-- Value display based on type -->
        @if (isCompound) {
          <span class="compound-meta" (click)="toggleExpand($event)">
            @if (node.type === 'object') {
              <span class="bracket">&#123;</span>
              @if (!node.isExpanded) {
                <span class="item-count">{{ node.itemCount }} {{ node.itemCount === 1 ? 'key' : 'keys' }}</span>
                <span class="bracket">&#125;</span>
              }
            } @else {
              <span class="bracket">[</span>
              @if (!node.isExpanded) {
                <span class="item-count">{{ node.itemCount }} {{ node.itemCount === 1 ? 'item' : 'items' }}</span>
                <span class="bracket">]</span>
              }
            }
          </span>
        } @else {
          <span
            class="primitive-val"
            [class.val-string]="node.type === 'string'"
            [class.val-number]="node.type === 'number'"
            [class.val-boolean]="node.type === 'boolean'"
            [class.val-null]="node.type === 'null'"
          >
            @if (node.type === 'string') {
              "{{ node.value }}"
            } @else if (node.type === 'null') {
              null
            } @else {
              {{ node.value }}
            }
          </span>
        }

        <!-- Type badge pill -->
        <span class="type-badge" [class]="'badge-' + node.type">
          {{ node.type }}
        </span>

        <!-- Quick actions hover bar -->
        <div class="hover-actions" (click)="$event.stopPropagation()">
          <button class="action-btn" (click)="copyValue()" title="Copy Value">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button class="action-btn" (click)="copyJsonPath()" title="Copy JSONPath (e.g. {{ node.path }})">
            <span class="jsonpath-icon">&dollar;</span>
          </button>
          <button class="action-btn" (click)="copyKey()" title="Copy Key Name">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2l-2 2m-1-1l-3 3m5 5l-2 2m-1-1l-3 3M3 13v8h8l9-9-8-8-9 9z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Recursive children if compound and expanded -->
      @if (isCompound && node.isExpanded && node.children) {
        <div class="children-block">
          @for (child of node.children; track child.id) {
            <app-json-tree-node
              [node]="child"
              (pathSelected)="pathSelected.emit($event)"
              (nodeCopied)="nodeCopied.emit($event)"
            />
          }
          <div class="closing-bracket" [style.padding-left.px]="node.depth * 18 + 18">
            <span class="bracket">{{ node.type === 'object' ? '}' : ']' }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-mono, monospace);
      font-size: 13px;
      line-height: 24px;
      user-select: text;
    }

    .tree-node {
      position: relative;
    }

    .node-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 1px 8px;
      border-radius: var(--radius-xs, 4px);
      transition: background-color var(--transition-fast, 150ms ease);
      position: relative;

      &:hover {
        background-color: var(--color-bg-surface-hover, rgba(99, 102, 241, 0.08));

        .hover-actions {
          opacity: 1;
          pointer-events: auto;
        }
      }

      &.matched {
        background-color: rgba(245, 158, 11, 0.2);
        border: 1px dashed rgba(245, 158, 11, 0.6);
      }
    }

    .toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-radius: 3px;

      &:hover {
        background-color: var(--color-bg-subtle);
        color: var(--color-text-primary);
      }

      svg {
        width: 12px;
        height: 12px;
        transition: transform 150ms ease;

        &.expanded {
          transform: rotate(90deg);
        }
      }
    }

    .leaf-spacer {
      width: 18px;
      display: inline-block;
    }

    .node-key {
      font-weight: 600;
      color: var(--color-primary);
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .colon {
      color: var(--color-text-tertiary);
      margin-right: 4px;
    }

    .compound-meta {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .bracket {
      color: var(--color-text-secondary);
      font-weight: 700;
    }

    .item-count {
      font-size: 11px;
      color: var(--color-text-tertiary);
      background-color: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      padding: 0 5px;
      border-radius: 10px;
    }

    .primitive-val {
      word-break: break-all;
      white-space: pre-wrap;

      &.val-string {
        color: #10b981; // emerald
      }
      &.val-number {
        color: #f59e0b; // amber
      }
      &.val-boolean {
        color: #8b5cf6; // purple
        font-weight: 600;
      }
      &.val-null {
        color: #94a3b8; // slate
        font-style: italic;
      }
    }

    .type-badge {
      font-size: 9.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0px 5px;
      border-radius: 4px;
      opacity: 0.7;
      margin-left: 6px;

      &.badge-string {
        background-color: rgba(16, 185, 129, 0.12);
        color: #10b981;
      }
      &.badge-number {
        background-color: rgba(245, 158, 11, 0.12);
        color: #f59e0b;
      }
      &.badge-boolean {
        background-color: rgba(139, 92, 246, 0.12);
        color: #8b5cf6;
      }
      &.badge-null {
        background-color: rgba(148, 163, 184, 0.12);
        color: #94a3b8;
      }
      &.badge-object {
        background-color: rgba(99, 102, 241, 0.12);
        color: var(--color-primary);
      }
      &.badge-array {
        background-color: rgba(6, 182, 212, 0.12);
        color: #06b6d4;
      }
    }

    .hover-actions {
      display: flex;
      align-items: center;
      gap: 3px;
      margin-left: auto;
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--transition-fast, 150ms ease);
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      border: 1px solid var(--color-border);
      background-color: var(--color-bg-surface);
      color: var(--color-text-secondary);
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;

      &:hover {
        background-color: var(--color-primary);
        color: #ffffff;
        border-color: var(--color-primary);
      }

      svg {
        width: 11px;
        height: 11px;
      }
    }

    .jsonpath-icon {
      font-size: 11px;
      font-weight: 800;
    }

    .children-block {
      display: flex;
      flex-direction: column;
    }

    .closing-bracket {
      line-height: 20px;
    }
  `],
})
export class JsonTreeNodeComponent {
  @Input({ required: true }) node!: JsonTreeNode;
  @Output() pathSelected = new EventEmitter<string>();
  @Output() nodeCopied = new EventEmitter<{ text: string; label: string }>();

  get isCompound(): boolean {
    return this.node.type === 'object' || this.node.type === 'array';
  }

  toggleExpand(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.isCompound) {
      this.node.isExpanded = !this.node.isExpanded;
    }
  }

  onNodeClick(event: MouseEvent): void {
    this.selectPath(event);
  }

  selectPath(event: Event): void {
    event.stopPropagation();
    this.pathSelected.emit(this.node.path);
  }

  copyValue(): void {
    const text =
      this.isCompound
        ? JSON.stringify(this.node.value, null, 2)
        : String(this.node.value);
    this.nodeCopied.emit({ text, label: 'Value copied to clipboard' });
  }

  copyKey(): void {
    this.nodeCopied.emit({ text: this.node.key, label: 'Key copied to clipboard' });
  }

  copyJsonPath(): void {
    this.nodeCopied.emit({ text: this.node.path, label: 'JSONPath copied' });
  }
}
