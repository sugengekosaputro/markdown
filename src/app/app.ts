import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStore } from './core/services/workspace.store';
import { KeyboardShortcutsService } from './core/services/keyboard-shortcuts.service';
import { HeaderComponent } from './features/shell/header.component';
import { MainLayoutComponent } from './features/shell/main-layout.component';
import { SearchDialogComponent } from './features/search/search-dialog.component';
import { ImportDialogComponent } from './features/import/import-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    MainLayoutComponent,
    SearchDialogComponent,
    ImportDialogComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private workspaceStore = inject(WorkspaceStore);
  private shortcutsService = inject(KeyboardShortcutsService);

  readonly isInitialized = this.workspaceStore.isInitialized;
  readonly showSearchModal = signal(false);
  readonly showImportModal = signal(false);

  ngOnInit(): void {
    this.workspaceStore.initialize();

    this.shortcutsService.shortcutTriggered$.subscribe((action) => {
      switch (action) {
        case 'search':
          this.showSearchModal.set(true);
          break;
        case 'import':
          this.showImportModal.set(true);
          break;
        case 'toggle-editor':
          const currentMode = this.workspaceStore.layoutMode();
          if (currentMode === 'default') {
            this.workspaceStore.setLayoutMode('viewer-dominant');
          } else {
            this.workspaceStore.setLayoutMode('default');
          }
          break;
        case 'save':
          this.workspaceStore.forceSave();
          break;
      }
    });
  }

  openSearch(): void {
    this.showSearchModal.set(true);
  }

  openImport(): void {
    this.showImportModal.set(true);
  }
}
