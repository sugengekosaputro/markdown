# 05. UI/UX & Design System Specification
**Project:** Nobody Markdown Viewer (v1.0.5+)  
**Category:** User Interface Architecture, Design System Tokens & Responsive Ergonomics

---

## 1. Arsitektur Layout 3-Panel (Workspace Shell)

Antarmuka utama diatur oleh [`MainLayoutComponent`](file:///Users/mypro/gengs/ai-research/markdown-viewer/src/app/features/shell/main-layout.component.ts) dengan layout horizontal 3 kolom yang dipisahkan oleh splitter interaktif:

```text
+---------------------------------------------------------------------------------------------------------+
|                                             TOP HEADER BAR                                              |
| [Logo Nobody] [⌘P Search...]                   [Status Pill]               [Import] [Export ZIP] [Layout] [Theme]|
+-----------------------+---+---------------------------------------------------+---+---------------------+
|    RESOURCE PANEL     | S |                  MARKDOWN VIEWER                  | S |   MARKDOWN EDITOR   |
| (Explorer / Outline)  | P |               (Pembaca Dokumen & Diagram)         | P |  (CodeMirror 6 Live)|
|                       | L |                                                   | L |                     |
| - Files / Outline Tab | I | - Header Meta & Title                             | I | - Toolbar Actions   |
| - Section Accordions  | T | - Rendered GFM HTML Content                       | T | - Save Status Dot   |
| - Document Drag/Drop  | T | - Code Blocks with Copy Button                    | T | - Line Numbers      |
| - Filter Input Box    | E | - Interactive Mermaid Renderers                   | E | - Markdown Syntax   |
|                       | R | - Error-Isolated Diagram Boundaries               | R | - History Undo/Redo |
| (Width: 200px-500px)  | 1 | (Flex: 1, Min-Width: 320px)                       | 2 | (Width: 240px-600px)|
+-----------------------+---+---------------------------------------------------+---+---------------------+
```

---

## 2. Lima (5) Mode Preset Layout

Pengguna dapat berpindah antar layout melalui toggle di header atau hotkey:

| Mode Layout | Resource Panel | Viewer Panel | Editor Panel | Kasus Penggunaan Ideal |
|---|:---:|:---:|:---:|---|
| **Default (3 Panels)** | Aktif | Aktif | Aktif | Membaca dokumen sembari melakukan penyuntingan dan navigasi file. |
| **Viewer Dominant** | Aktif | Aktif | Terlipat | Fokus membaca dan menavigasi dokumen dengan layar lega. |
| **Viewer Only** | Terlipat | Aktif | Terlipat | Mode presentasi atau membaca penuh (*distraction-free reading*). |
| **Editor Only** | Terlipat | Terlipat | Aktif | Mode penulisan murni dokumen teknis tanpa distraksi visual. |
| **Viewer + Editor** | Terlipat | Aktif | Aktif | Kolaborasi visual: menulis di kanan dan melihat live preview di kiri. |

---

## 3. Mesin Splitter Resizable (Draggable Dividers)

- **Splitter Kiri (Resource ↔ Viewer):**
  - Mengubah `resourcePanelWidth` (rentang dibatasi via `Math.max(200, Math.min(500, width))`).
- **Splitter Kanan (Viewer ↔ Editor):**
  - Mengubah `editorPanelWidth` (rentang dibatasi via `Math.max(240, Math.min(600, width))`).
- **Ergonomi Interaksi:**
  - Saat proses drag berlangsung, kelas `.resizing` dipasang pada root container untuk menonaktifkan seleksi teks (`user-select: none`) dan event pointer pada iframe/diagram, menjamin pergeseran divider 60 FPS tanpa stutter.
  - Dimensi panel otomatis disimpan ke LocalStorage secara permanen.

---

## 4. Design Tokens & Palet Warna (High-Contrast Theme System)

Didefinisikan di [`src/styles.scss`](file:///Users/mypro/gengs/ai-research/markdown-viewer/src/styles.scss):

### 4.1 Perbandingan Token Tema Terang (Light) vs Gelap (Dark)

| Token CSS | Mode Light (Terang) | Mode Dark (Gelap) | Rasio Kontras & Catatan |
|---|---|---|---|
| `--color-bg-app` | `#f8fafc` (Slate 50) | `#080c14` (Deep Obsidian) | Latar belakang kanvas aplikasi |
| `--color-bg-surface` | `#ffffff` | `#0f172a` (Slate 900) | Panel explorer, kartu, dan editor |
| `--color-bg-surface-elevated` | `#ffffff` | `#1a2538` | Dialog modal, dropdown, popover |
| `--color-bg-subtle` | `#f8fafc` | `#141f33` | Header toolbar editor & section |
| `--color-border` | `#cbd5e1` (Slate 300) | `#3b4d6e` (Crisp Navy Border) | Pembatas panel & kartu (dipertegas) |
| `--color-text-primary` | `#0f172a` (Slate 900) | `#ffffff` (Pure White) | Teks heading, item aktif, dan kode |
| `--color-text-secondary` | `#334155` (Slate 700) | `#cbd5e1` (Bright Silver) | Teks paragraf, deskripsi, label |
| `--color-text-tertiary` | `#64748b` (Slate 500) | `#94a3b8` (Muted Slate) | Timestamp, placeholder, icon |
| `--color-primary` | `#4f46e5` (Indigo 600) | `#6366f1` (Indigo 500) | Aksen utama, tombol aksi, seleksi |
| `--color-doc-active-bg` | `rgba(99, 102, 241, 0.12)` | `rgba(99, 102, 241, 0.25)` | Highlight dokumen aktif di explorer |
| `--color-doc-active-text` | `#312e81` (Deep Indigo) | `#ffffff` (Pure White) | Kontras teks dokumen aktif (> 8.5:1) |
| `--color-success` | `#059669` (Emerald 600) | `#34d399` (Emerald 400) | Status pill tersimpan & badge 'Copied!' |

---

## 5. Tipografi & Skala Hierarkis

- **Font Antarmuka (UI):** `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
  - Body: `14px / 1.5`, letter-spacing `-0.01em`
  - H1: `2rem (32px) / 1.25`, font-weight `700`
  - H2: `1.5rem (24px) / 1.3`, font-weight `600`, border-bottom `1px solid var(--color-border-subtle)`
  - H3: `1.25rem (20px) / 1.35`, font-weight `600`
- **Font Monospace (Code & Diagram):** `'Fira Code', 'JetBrains Mono', Consolas, monospace`
  - Blok Kode: `13px / 1.6`, font-feature-settings `"liga" 1`

---

## 6. Aksesibilitas & Status Interaktif (A11y & Micro-Interactions)

1. **Focus Rings:** Seluruh tombol dan input interaktif memiliki outline fokus yang konsisten (`outline: 2px solid var(--color-border-focus)`).
2. **Keyboard Traps Elimination:** Semua dialog modal (`SearchDialog`, `ImportDialog`) dapat ditutup dengan tombol `ESC`.
3. **Pointer-Events Protection pada Tombol Copy:** Aturan `.code-copy-btn * { pointer-events: none; }` memastikan klik mouse pada ikon SVG di dalam tombol tidak pernah terdistorsi dan selalu mengeksekusi aksi salin.
