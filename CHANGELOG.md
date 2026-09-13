# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-09-13

### Added
- **Copy / Clipboard Feature for Code Blocks & Diagrams**:
  - **Code Blocks**: Added a sleek `.code-block-wrapper` header with uppercase language badge (`TYPESCRIPT`, `JSON`, `MARKDOWN`, etc.) and an interactive "Copy" button.
  - Clicking "Copy" extracts the raw code, copies to clipboard (with fallback support), and gives interactive feedback ("Copied!" with checkmark and green glow for 2 seconds).
  - **Mermaid Diagrams**:
    - Added a dedicated "Copy" button in the diagram toolbar header.
    - Added a "Copy Source" button inside the raw source view card.
    - 1-click copying of Mermaid diagram definition directly to clipboard.
  - Sanitizer updated to allow SVG elements, buttons, and copy attributes in DOMPurify.

### Fixed
- **Light Mode Active Document Contrast**: Fixed active document item in Explorer panel by replacing hardcoded `#ffffff` text with dynamic `--color-doc-active-text` (`#312e81`), restoring crystal-clear readability.
- **Light Mode CodeMirror Gutter**: Scoped `.cm-gutters` styling to dark mode so that light mode editor now displays an elegant light background (`#f8fafc`) with slate line numbers (`#64748b`), eliminating the pitch-black gutter strip in light mode.
- **Dark Mode TreeView Diagram Contrast**: Resolved dark/black text bug on Section 40 TreeView (and beta SVG diagrams) by updating theme variables (`textColor`, `nodeTextColor`), adding comprehensive CSS SVG overrides, and dynamically transforming dark fills/strokes in dark mode to bright silver/white (`#f8fafc`).

## [1.0.3] - 2026-09-13

### Changed
- **Dark Mode Chrome & Shell High Contrast Overhaul**:
  - Upgraded global dark theme CSS tokens: `--color-border` (`#3b4d6e`), `--color-border-subtle` (`#273650`), `--color-text-secondary` (`#cbd5e1`), `--color-text-tertiary` (`#94a3b8`), `--color-bg-surface-elevated` (`#1a2538`), and `--color-bg-subtle` (`#141f33`).
  - Added `:root[data-theme='dark'], [data-theme='dark'], .dark-theme` selectors for bulletproof theme variable inheritance.
  - **Explorer & Resources Panel**:
    - Converted document list items and outline tree items to high-contrast crisp text (`#ffffff` / `#cbd5e1`), eliminating previously washed-out dark gray text.
    - Added high-contrast level badges (`H1`–`H6`) with accent color indicators.
    - Enhanced active document styling with a vibrant 3px accent left border (`#6366f1`) and highlighted background.
    - Added dedicated rounded filter box with clear search icon and high-contrast placeholder in the Explorer panel.
    - Improved `SYSTEM` badge with custom elevated pill styling and bright border.
    - Added crisp 1px separation borders between Explorer, Viewer, and Editor panels with enhanced resize splitter handles.
  - **Top Header**:
    - Increased search input trigger border contrast, icon prominence, and elevated `⌘P` shortcut badge.
    - Upgraded action buttons (`Import`, `Export ZIP`) and theme toggle button with clear borders and distinct hover feedback.
    - Active layout switcher button now features solid primary background with white icon.
  - **Code Editor (CodeMirror)**:
    - Overrode gutter numbers with bright silver `#cbd5e1` text on dark surface `#0b1120`, making line numbers instantly legible.
    - Upgraded editor toolbar title, save status badges, and action icon buttons.
  - **Search & Import Modals**:
    - Elevated dialog backdrop blur and added crisp border outlines (`#3b4d6e`) and deep box-shadows.
    - Search results now feature high-contrast code snippet cards (`#e2e8f0` on dark badge) and distinct selection styling.

## [1.0.2] - 2026-09-13

### Fixed
- **Event Modeling Title Parsing**:
  - Fixed syntax error (`Expecting token of type 'EOF' but found title`) by switching Event Modeling title declaration to standard Mermaid frontmatter (`--- title: ... ---`).
  - Added runtime preprocessing in `MermaidRendererComponent` to automatically transform any legacy inline `title` in `eventmodeling` into frontmatter format.
  - Added automatic IndexedDB data migration in `WorkspaceStore.initialize()` to upgrade existing stored workspace documents.
- **Concurrent Render Cascade & `Cannot read properties of null (reading 'firstChild')`**:
  - Replaced overbroad error cleanup selector (`div[id^="dmermaid-"]`) with strict element-isolated cleanup (`#d${elementId}, #${elementId}`), preventing errored diagrams from removing the temporary DOM containers of adjacent in-flight diagrams.
  - Implemented a serialized promise render queue (`enqueueRender`) in `MermaidRendererComponent` ensuring thread-safe Mermaid execution without race conditions on shared diagram singleton databases.
  - Fixed rendering for Treemap, Venn, Ishikawa, Wardley Map, Cynefin Framework, and TreeView diagrams.

## [1.0.1] - 2026-09-12

### Fixed
- **Mermaid Light Mode Theme**: Fixed Mermaid theme caching so switching between Light and Dark mode dynamically re-renders diagrams with high-contrast light blue nuances in Light Mode and deep indigo in Dark Mode.
- **Toggle Source / Diagram Bug**: Fixed issue where switching from Source view back to Diagram view caused the diagram to disappear; DOM node and rendered SVG state are now preserved using hidden attributes.
- **Requirement Diagram & ZenUML Support**:
  - Integrated `@mermaid-js/mermaid-zenuml` plugin to enable complete native ZenUML sequence diagram rendering.
  - Fixed syntax quoting for `id` and `docref` in Requirement Diagram fixtures.
  - Added automatic IndexedDB migration for existing workspace documents.
- **Diagram Error Isolation**: Cleaned up Mermaid error SVG orphan nodes and improved the isolated error banner with syntax error details and raw source toggle.
- **Code Block Contrast**: Upgraded code block styling to high-contrast dark IDE theme (`#0b0f19`) with vibrant syntax highlighting tokens, and increased contrast for inline code in both light and dark modes.

## [1.0.0] - 2026-09-08

### Added
- **Local-First Core**:
  - Full browser-local persistence using IndexedDB (`sections`, `documents`).
  - Safe fallback system section (`Unassigned`) that cannot be deleted or renamed.
  - Zero required backend, zero cloud accounts, zero third-party telemetry.
  - LocalStorage integration for persisting layout preferences (panel widths, active tab, theme, layout modes).
- **Interactive Markdown Viewer**:
  - Full GitHub Flavored Markdown (GFM) rendering with `marked` (tables, task lists, blockquotes, inline code, horizontal rules).
  - Code syntax highlighting for 180+ languages using `highlight.js`.
  - Heading slugification and anchor navigation with smooth scrolling.
  - Strict XSS security and link sanitization using `DOMPurify`.
- **Mermaid 11.17.2 Integration**:
  - Exact pinned Mermaid baseline `11.17.2`.
  - Comprehensive support for 30+ diagram families: Flowchart, Swimlanes, Sequence, Class, State, ERD, Journey, Gantt, Pie, Quadrant, Requirement, GitGraph, C4 (Context, Container, Component, Dynamic, Deployment), Mindmap, Timeline, ZenUML, Sankey, XY Chart, Block, Packet, Kanban, Architecture, Radar, Event Modeling, Treemap, Venn, Ishikawa, Wardley, Cynefin, and TreeView.
  - Per-diagram interactive controls: Zoom In (+), Zoom Out (-), Reset Zoom (100%), Fit to Container, and Fullscreen modal.
  - Interactive Diagram / Raw Source code toggle.
  - Complete Error Isolation: malformed diagrams display a syntax error alert with a *[View Raw Source]* button while surrounding Markdown renders cleanly.
  - Dynamic Mermaid theme synchronization (Light / Dark).
- **Markdown Editor**:
  - Raw Markdown code editor built with CodeMirror 6.
  - Live debounced preview (~350ms) synchronizing content with viewer and outline in real-time.
  - Visual autosave status pill (*Editing*, *Saving locally...*, *Saved locally*, *Save error*).
  - Line wrapping, history (undo/redo), search in document, and bracket matching.
- **Resource Management & Drag and Drop**:
  - Section accordion (Create, Rename, Delete with document preservation options, Reorder).
  - Document management (Create, Rename, Move, Reorder, Delete with confirmation).
  - Angular CDK Drag & Drop for reordering sections and transferring documents across sections.
  - Direct file drag & drop into individual sections or the general workspace.
  - Duplicate filename resolution (*Replace*, *Keep Both* with numbered copies).
- **Outline (Table of Contents)**:
  - Automatic hierarchical H1–H6 extraction rendered in the Explorer tab.
  - Click-to-scroll to corresponding heading anchors.
- **Full-Text & Filename Search**:
  - Command palette modal (`Cmd/Ctrl + P`) with instantaneous search.
  - Contextual snippet previews with highlighted search matches and match count.
- **Export Engine**:
  - Single document `.md` download.
  - Section archive export as `.zip`.
  - Full workspace export as `.zip` with folder structure (`Unassigned/`, `[SectionName]/`).
- **Layout & Theming**:
  - 3-panel resizable layout with draggable splitters.
  - 5 layout modes: *3-Panel*, *Viewer Dominant*, *Viewer Only*, *Editor Only*, *Viewer + Editor*.
  - Full Light, Dark, and System theme switching.
