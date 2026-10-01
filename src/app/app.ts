import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStore } from './core/services/workspace.store';
import { JsonWorkspaceStore } from './core/services/json-workspace.store';
import { PreferencesService } from './core/storage/preferences.service';
import { KeyboardShortcutsService } from './core/services/keyboard-shortcuts.service';
import { HeaderComponent } from './features/shell/header.component';
import { MainLayoutComponent } from './features/shell/main-layout.component';
import { JsonMainLayoutComponent } from './features/json-previewer/json-main-layout.component';
import { SearchDialogComponent } from './features/search/search-dialog.component';
import { ImportDialogComponent } from './features/import/import-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    MainLayoutComponent,
    JsonMainLayoutComponent,
    SearchDialogComponent,
    ImportDialogComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private workspaceStore = inject(WorkspaceStore);
  private jsonStore = inject(JsonWorkspaceStore);
  private prefService = inject(PreferencesService);
  private shortcutsService = inject(KeyboardShortcutsService);

  readonly activeWorkspace = signal<'markdown' | 'json'>(
    this.prefService.getActiveWorkspace()
  );

  readonly isInitialized = computed(() => {
    return this.workspaceStore.isInitialized() && this.jsonStore.isInitialized();
  });

  readonly showSearchModal = signal(false);
  readonly showImportModal = signal(false);

  ngOnInit(): void {
    this.workspaceStore.initialize();
    this.jsonStore.initialize();

    this.shortcutsService.shortcutTriggered$.subscribe((action) => {
      switch (action) {
        case 'workspace-markdown':
          this.switchWorkspace('markdown');
          break;
        case 'workspace-json':
          this.switchWorkspace('json');
          break;
        case 'search':
          this.showSearchModal.set(true);
          break;
        case 'import':
          this.showImportModal.set(true);
          break;
        case 'toggle-editor':
          if (this.activeWorkspace() === 'markdown') {
            const currentMode = this.workspaceStore.layoutMode();
            this.workspaceStore.setLayoutMode(
              currentMode === 'default' ? 'viewer-dominant' : 'default'
            );
          } else {
            const currentMode = this.jsonStore.layoutMode();
            this.jsonStore.setLayoutMode(
              currentMode === 'default' ? 'viewer-dominant' : 'default'
            );
          }
          break;
        case 'save':
          if (this.activeWorkspace() === 'markdown') {
            this.workspaceStore.forceSave();
          } else {
            this.jsonStore.forceSave();
          }
          break;
      }
    });
  }

  switchWorkspace(mode: 'markdown' | 'json'): void {
    this.activeWorkspace.set(mode);
    this.prefService.setActiveWorkspace(mode);
  }

  openSearch(): void {
    this.showSearchModal.set(true);
  }

  openImport(): void {
    this.showImportModal.set(true);
  }
}
