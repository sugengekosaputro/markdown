import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { MarkdownDocument, Section } from '../models/workspace.models';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  exportSingleDocument(doc: MarkdownDocument): void {
    const filename = doc.fileName.endsWith('.md') ? doc.fileName : `${doc.fileName}.md`;
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, filename);
  }

  async exportSectionAsZip(section: Section, docs: MarkdownDocument[]): Promise<void> {
    const zip = new JSZip();
    const folderName = this.sanitizeFolderName(section.name);
    const folder = zip.folder(folderName) || zip;

    for (const doc of docs) {
      const filename = doc.fileName.endsWith('.md') ? doc.fileName : `${doc.fileName}.md`;
      folder.file(filename, doc.content);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${folderName}-export.zip`);
  }

  async exportWorkspaceAsZip(sections: Section[], docs: MarkdownDocument[]): Promise<void> {
    const zip = new JSZip();

    for (const section of sections) {
      const folderName = this.sanitizeFolderName(section.name);
      const folder = zip.folder(folderName) || zip;
      const sectionDocs = docs.filter((d) => d.sectionId === section.id);

      for (const doc of sectionDocs) {
        const filename = doc.fileName.endsWith('.md') ? doc.fileName : `${doc.fileName}.md`;
        folder.file(filename, doc.content);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'workspace-export.zip');
  }

  private sanitizeFolderName(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Section';
  }
}
