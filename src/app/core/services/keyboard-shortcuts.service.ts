import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';

export type ShortcutAction =
  | 'import'
  | 'search'
  | 'toggle-editor'
  | 'save'
  | 'export-current'
  | 'workspace-markdown'
  | 'workspace-json';

@Injectable({
  providedIn: 'root',
})
export class KeyboardShortcutsService {
  private shortcutTriggeredSubject = new Subject<ShortcutAction>();
  readonly shortcutTriggered$ = this.shortcutTriggeredSubject.asObservable();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        if (modKey && !e.altKey) {
          const key = e.key.toLowerCase();

          // Cmd/Ctrl + 1 (Markdown Workspace)
          if (key === '1') {
            e.preventDefault();
            this.shortcutTriggeredSubject.next('workspace-markdown');
          }
          // Cmd/Ctrl + 2 (JSON Workspace)
          else if (key === '2') {
            e.preventDefault();
            this.shortcutTriggeredSubject.next('workspace-json');
          }
          // Cmd/Ctrl + S
          else if (key === 's') {
            e.preventDefault();
            if (e.shiftKey) {
              this.shortcutTriggeredSubject.next('export-current');
            } else {
              this.shortcutTriggeredSubject.next('save');
            }
          }
          // Cmd/Ctrl + O
          else if (key === 'o' && !e.shiftKey) {
            e.preventDefault();
            this.shortcutTriggeredSubject.next('import');
          }
          // Cmd/Ctrl + P
          else if (key === 'p' && !e.shiftKey) {
            e.preventDefault();
            this.shortcutTriggeredSubject.next('search');
          }
          // Cmd/Ctrl + E
          else if (key === 'e' && !e.shiftKey) {
            e.preventDefault();
            this.shortcutTriggeredSubject.next('toggle-editor');
          }
        }
      });
    }
  }

  trigger(action: ShortcutAction): void {
    this.shortcutTriggeredSubject.next(action);
  }
}
