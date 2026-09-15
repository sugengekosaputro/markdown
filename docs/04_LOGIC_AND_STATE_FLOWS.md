# 04. Logic, State Management & Application Flows
**Project:** Nobody Markdown Viewer (v1.0.5+)  
**Category:** State Management, Data Flow & Lifecycle Specification

---

## 1. Arsitektur Reaktivitas Angular Signals

Aplikasi sepenuhnya mengadopsi primitif reaktivitas Angular modern (**Signals**, **Computed**, dan **Effects**) di dalam [`WorkspaceStore`](file:///Users/mypro/gengs/ai-research/markdown-viewer/src/app/core/services/workspace.store.ts):

```mermaid
graph TD
    subgraph Writable Signals [State Utama (Writable Signals)]
        S1["sections: Signal&lt;Section[]&gt;"]
        S2["documents: Signal&lt;MarkdownDocument[]&gt;"]
        S3["activeDocumentId: Signal&lt;string \| null&gt;"]
        S4["saveStatus: Signal&lt;SaveStatus&gt;"]
        S5["theme: Signal&lt;ThemeMode&gt;"]
        S6["themeVersion: Signal&lt;number&gt;"]
        S7["layoutMode: Signal&lt;LayoutMode&gt;"]
    end

    subgraph Computed Signals [State Turunan (Computed Signals)]
        C1["activeDocument: computed()"]
        C2["outline: computed&lt;OutlineItem[]&gt;"]
        C3["chunks: computed&lt;ViewerChunk[]&gt; (in Viewer)"]
    end

    subgraph Effects & UI [Reaksi & Sinkronisasi]
        E1["DOM [data-theme] Attribute Sync"]
        E2["Mermaid Re-render on themeVersion"]
        E3["CodeMirror Compartment Reconfiguration"]
        E4["Debounced Autosave Pipeline (350ms)"]
    end

    S2 --> C1
    S3 --> C1
    C1 --> C2
    C1 --> C3
    S5 --> E1
    S6 --> E2
    S5 --> E3
```

---

## 2. Alur Inisialisasi Workspace & Seeding (Startup Flow)

Saat aplikasi pertama kali dibuka di browser pengguna, urutan inisialisasi berjalan sebagai berikut:

```mermaid
sequenceDiagram
    autonumber
    participant UI as App Root (app.ts)
    participant Store as WorkspaceStore
    participant Prefs as PreferencesService
    participant IDB as IndexedDbService
    participant Fixture as Static /fixtures

    UI->>Store: initialize()
    Store->>Prefs: loadPreferences()
    Prefs-->>Store: return { theme, layoutMode, activeDocumentId, ... }
    Store->>Store: applyThemeToDom(theme)

    Store->>IDB: getAllSections() & getAllDocuments()
    IDB-->>Store: return sections[], documents[]

    alt Section 'Unassigned' belum ada
        Store->>IDB: saveSection(unassignedSection)
    end

    alt Workspace kosong (documents.length === 0)
        Store->>Fixture: fetch('/fixtures/markdown-viewer-example.md')
        Fixture-->>Store: return fixtureContent (atau default markdown)
        Store->>IDB: saveSection('Demo & Panduan')
        Store->>IDB: saveDocument(fixtureDoc)
        Store->>IDB: getAllSections() & getAllDocuments()
    else Dokumen sudah ada
        Store->>Store: autoPatchSyntax(documents) (Migrasi sintaks Mermaid lama)
    end

    Store->>Store: set(sections), set(documents)
    Store->>Store: setActiveDocument(lastActiveId || documents[0].id)
    Store->>UI: isInitialized.set(true)
```

---

## 3. Alur Autosave & Mutasi Konten (Debounced Autosave Pipeline)

Mengetik di editor CodeMirror memicu alur penyimpanan ter-debounce untuk menghemat I/O IndexedDB:

```mermaid
sequenceDiagram
    autonumber
    participant User as Pengguna (Mengetik)
    participant Editor as MarkdownEditorComponent
    participant Store as WorkspaceStore
    participant Subject as autosaveSubject (RxJS)
    participant IDB as IndexedDbService

    User->>Editor: Mengetik karakter baru di CodeMirror
    Editor->>Store: updateDocumentContent(docId, newContent)
    Store->>Store: saveStatus.set('editing')
    Store->>Store: documents.set(updatedDocs) (Reaktif ke Viewer)
    Store->>Subject: next({ id: docId, content: newContent })

    Note over Subject: debounceTime(350ms) menunggu jeda mengetik

    Subject->>Store: persistDocumentContent(id, content)
    Store->>Store: saveStatus.set('saving')
    Store->>IDB: saveDocument({ ...doc, content })
    IDB-->>Store: Transaksi berhasil (resolve)
    Store->>Store: saveStatus.set('saved')
    
    Note over Store: setTimeout(2000ms)
    Store->>Store: saveStatus.set('idle')
```

---

## 4. Alur Manajemen Dokumen & Penanganan Duplikasi Nama

Setiap dokumen di dalam section yang sama dijamin memiliki nama yang unik:

```mermaid
flowchart TD
    Start["Request Create/Import/Rename Document"] --> CheckExt{"Apakah nama berkas<br/>berakhiran .md?"}
    CheckExt -- Tidak --> AddExt["Tambahkan ekstensi .md"]
    CheckExt -- Ya --> CheckDup{"Apakah nama sudah ada<br/>di section target?"}
    AddExt --> CheckDup
    CheckDup -- Tidak --> SaveDoc["Simpan Dokumen dengan Nama Asli"]
    CheckDup -- Ya --> LoopCount["Cari penomoran unik:<br/>base (counter).md"]
    LoopCount --> SaveDoc
    SaveDoc --> PersistDB["Simpan ke IndexedDB & Update Signal"]
    PersistDB --> SetActive["Set sebagai Dokumen Aktif"]
```

---

## 5. Alur Pencarian Cepat Global (Full-Text Search Engine)

Pencarian dijalankan secara in-memory melintasi seluruh koleksi dokumen di Signal `documents()`:

```mermaid
sequenceDiagram
    autonumber
    participant User as Pengguna (⌘P)
    participant Dialog as SearchDialogComponent
    participant Store as WorkspaceStore

    User->>Dialog: Mengetik query pencarian (misal: 'architecture')
    Dialog->>Store: search('architecture')
    loop Untuk setiap doc in documents()
        Store->>Store: Cek filenameMatch (toLowerCase().includes)
        Store->>Store: Cek contentMatch & Hitung matchCount
        opt Jika contentMatch
            Store->>Store: Ekstrak cuplikan snippet (-40 karakter s/d +60 karakter)
        end
        opt Jika filenameMatch atau contentMatch
            Store->>Store: push to SearchResult[]
        end
    end
    Store-->>Dialog: return SearchResult[] (terurut)
    Dialog->>User: Render daftar hasil dengan badge jumlah kecocokan & snippet
```

---

## 6. Alur Salin Kode ke Clipboard (Copy Pipeline & Fallback)

Diimplementasikan pada [`clipboard.util.ts`](file:///Users/mypro/gengs/ai-research/markdown-viewer/src/app/core/utils/clipboard.util.ts) dan [`MarkdownViewerComponent`](file:///Users/mypro/gengs/ai-research/markdown-viewer/src/app/features/markdown-viewer/markdown-viewer.component.ts):

```mermaid
flowchart TD
    Click["Klik tombol 'Copy' pada Blok Kode"] --> GetCode["Ambil data-code (decodeURIComponent)"]
    GetCode --> TryModern{"Apakah navigator.clipboard<br/>tersedia & isSecureContext?"}
    
    TryModern -- Ya --> ExecModern["navigator.clipboard.writeText(code)"]
    ExecModern -- Berhasil --> Feedback["Tampilkan 'Copied!' & Glow Hijau (2 Detik)"]
    ExecModern -- Gagal / Exception --> Fallback
    
    TryModern -- Tidak --> Fallback["Fallback DOM In-Viewport"]
    Fallback --> CreateTA["Buat elemen &lt;textarea&gt; fixed di DOM<br/>(opacity: 0.01; pointer-events: none)"]
    CreateTA --> SelectTA["textArea.focus() & textArea.select()"]
    SelectTA --> ExecCmd["document.execCommand('copy')"]
    ExecCmd --> RemoveTA["textArea.remove()"]
    RemoveTA --> Feedback
```
