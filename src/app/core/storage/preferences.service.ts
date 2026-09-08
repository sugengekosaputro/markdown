import { Injectable } from '@angular/core';
import { WorkspacePreferences } from '../models/workspace.models';

const PREFS_KEY = 'markdown_workspace_preferences';

const DEFAULT_PREFS: WorkspacePreferences = {
  theme: 'system',
  resourcePanelWidth: 280,
  editorPanelWidth: 360,
  layoutMode: 'default',
  resourceActiveTab: 'files',
};

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  loadPreferences(): WorkspacePreferences {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_PREFS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load preferences from localStorage:', e);
    }
    return { ...DEFAULT_PREFS };
  }

  savePreferences(prefs: WorkspacePreferences): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save preferences to localStorage:', e);
    }
  }
}
