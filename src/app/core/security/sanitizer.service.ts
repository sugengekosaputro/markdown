import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';

@Injectable({
  providedIn: 'root',
})
export class SanitizerService {
  constructor() {
    // Configure DOMPurify hook to ensure all links are safe
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        // If external link (http/https), force target="_blank" and safe rel
        if (/^https?:\/\//i.test(href)) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        } else if (/^javascript:/i.test(href) || /^data:/i.test(href)) {
          node.removeAttribute('href');
        }
      }
    });
  }

  sanitize(html: string): string {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true, svg: true },
      ADD_TAGS: ['input', 'button', 'span', 'svg', 'path', 'polyline', 'line', 'rect', 'circle'],
      ADD_ATTR: [
        'type',
        'checked',
        'disabled',
        'target',
        'rel',
        'class',
        'id',
        'data-copy-btn',
        'title',
        'viewBox',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'd',
        'points',
        'x',
        'y',
        'width',
        'height',
        'rx',
        'ry',
        'x1',
        'y1',
        'x2',
        'y2',
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });
  }

  isSafeUrl(url: string): boolean {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html')) {
      return false;
    }
    return true;
  }
}
