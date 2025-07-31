import React, { useEffect, useState, useMemo } from "react";
import "./App.css";

// PUBLIC_INTERFACE
/**
 * The main Notes application component.
 * Features: Sidebar nav, search, create/edit/delete note, responsive layout, modern minimal design.
 */
function App() {
  // Simulated notes data (acts as a mock API/database for now)
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState("view"); // view | create | edit
  const [theme] = useState("light"); // theme toggling possible later

  // For editing/creating
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Responsive sidebar toggle
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Seed with a few dummy notes on first load
  useEffect(() => {
    if (notes.length === 0) {
      setNotes([
        {
          id: "note1",
          title: "Welcome to Note Organizer",
          content: "This is your first note. Start organizing your thoughts!",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "note2",
          title: "Features",
          content: "- Create, edit, delete notes\n- Search instantly\n- Beautiful, responsive UI",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    }
  }, [notes.length]);

  // Derived: Sorted and filtered notes
  const filteredNotes = useMemo(() => {
    if (!searchTerm) return notes.sort(sortByRecent);
    return notes
      .filter(
        note =>
          note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort(sortByRecent);
  }, [notes, searchTerm]);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  // PUBLIC_INTERFACE
  function handleSelectNote(note) {
    setSelectedNoteId(note.id);
    setMode("view");
    // Autofill for edit
    setEditTitle(note.title);
    setEditContent(note.content);
  }

  // PUBLIC_INTERFACE
  function handleCreateNoteClick() {
    setMode("create");
    setEditTitle("");
    setEditContent("");
    setSelectedNoteId(null);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  }

  // PUBLIC_INTERFACE
  function handleEditNoteClick() {
    if (!selectedNote) return;
    setMode("edit");
    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content);
  }

  // PUBLIC_INTERFACE
  function handleDeleteNoteClick(noteId) {
    if (window.confirm("Are you sure you want to delete this note?")) {
      setNotes(notes.filter(n => n.id !== noteId));
      setSelectedNoteId(null);
      setMode("view");
    }
  }

  // PUBLIC_INTERFACE
  function handleSaveNote(e) {
    e.preventDefault();
    if (!editTitle.trim()) {
      alert("Note title cannot be empty");
      return;
    }

    if (mode === "edit" && selectedNote) {
      setNotes(notes =>
        notes.map(n =>
          n.id === selectedNote.id
            ? {
                ...n,
                title: editTitle,
                content: editContent,
                updatedAt: new Date().toISOString()
              }
            : n
        )
      );
      setSelectedNoteId(selectedNote.id);
    } else if (mode === "create") {
      const newNote = {
        id: "note_" + Date.now(),
        title: editTitle,
        content: editContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setNotes([newNote, ...notes]);
      setSelectedNoteId(newNote.id);
    }
    setMode("view");
  }

  // PUBLIC_INTERFACE
  function handleSidebarToggle() {
    setSidebarOpen(open => !open);
  }

  // PUBLIC_INTERFACE
  function handleSearchChange(e) {
    setSearchTerm(e.target.value);
  }

  return (
    <div className={`NotesApp theme--${theme}`}>
      <Sidebar
        open={sidebarOpen}
        onToggle={handleSidebarToggle}
        notes={filteredNotes}
        selectedNoteId={selectedNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNoteClick}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
      />
      <MainContent
        mode={mode}
        note={selectedNote}
        editTitle={editTitle}
        editContent={editContent}
        setEditTitle={setEditTitle}
        setEditContent={setEditContent}
        onEdit={handleEditNoteClick}
        onDelete={handleDeleteNoteClick}
        onSave={handleSaveNote}
        onCancel={() => setMode("view")}
      />
      {/* Sidebar overlay (mobile) */}
      {!sidebarOpen && (
        <button
          className="sidebar-fab"
          title="Open navigation"
          aria-label="Open navigation"
          onClick={handleSidebarToggle}
        >
          ☰
        </button>
      )}
    </div>
  );
}

// Utilities
function sortByRecent(a, b) {
  return new Date(b.updatedAt) - new Date(a.updatedAt);
}

// --- Sidebar component ---
// PUBLIC_INTERFACE
function Sidebar({
  open,
  onToggle,
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  searchTerm,
  onSearchChange
}) {
  return (
    <nav className={`Sidebar${open ? " open" : ""}`}>
      <div className="Sidebar-header">
        <span className="Sidebar-title">📝 Notes</span>
        <button
          className="Sidebar-toggle"
          onClick={onToggle}
          title={open ? "Close navigation" : "Open navigation"}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? "←" : "☰"}
        </button>
      </div>
      <div className="Sidebar-controls">
        <button className="btn btn-accent" onClick={onCreateNote}>
          + New Note
        </button>
        <input
          className="Sidebar-search"
          type="search"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={onSearchChange}
          aria-label="Search notes"
        />
      </div>
      <ul className="Sidebar-notes-list">
        {notes.length === 0 && (
          <li className="Sidebar-note-empty">
            <span>No notes found.</span>
          </li>
        )}
        {notes.map(note => (
          <li
            className={
              "Sidebar-note" +
              (note.id === selectedNoteId ? " Sidebar-note--selected" : "")
            }
            key={note.id}
            onClick={() => onSelectNote(note)}
          >
            <div className="Sidebar-note-title">{note.title}</div>
            <div className="Sidebar-note-date">
              {new Date(note.updatedAt).toLocaleDateString()}{" "}
              {new Date(note.updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
          </li>
        ))}
      </ul>
      <div className="Sidebar-footer">
        <span>
          <a
            href="https://reactjs.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="Sidebar-link"
          >
            React Notes App
          </a>
        </span>
      </div>
    </nav>
  );
}

// --- Main Content component ---
// PUBLIC_INTERFACE
function MainContent({
  mode,
  note,
  editTitle,
  editContent,
  setEditTitle,
  setEditContent,
  onEdit,
  onDelete,
  onSave,
  onCancel
}) {
  if (mode === "create" || (mode === "edit" && note)) {
    return (
      <main className="MainContent">
        <form className="NoteForm" onSubmit={onSave} autoComplete="off">
          <h2>{mode === "create" ? "Create Note" : "Edit Note"}</h2>
          <input
            className="NoteForm-title"
            type="text"
            placeholder="Title"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            required
            autoFocus
          />
          <textarea
            className="NoteForm-content"
            rows="10"
            placeholder="Write your note here..."
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
          />
          <div className="NoteForm-actions">
            <button className="btn btn-primary" type="submit">
              Save
            </button>
            <button className="btn btn-secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </main>
    );
  }

  if (!note) {
    return (
      <main className="MainContent MainContent--empty">
        <h2>Get Started</h2>
        <p>Select a note or create a new one.</p>
      </main>
    );
  }

  // Default: display selected note
  return (
    <main className="MainContent">
      <div className="NoteDisplay">
        <div className="NoteDisplay-meta">
          <div className="NoteDisplay-date">
            Last updated:{" "}
            {new Date(note.updatedAt).toLocaleDateString()}{" "}
            {new Date(note.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </div>
        </div>
        <h2 className="NoteDisplay-title">{note.title}</h2>
        <pre className="NoteDisplay-content">{note.content}</pre>
        <div className="NoteDisplay-actions">
          <button className="btn btn-primary" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-secondary" onClick={() => onDelete(note.id)}>
            Delete
          </button>
        </div>
      </div>
    </main>
  );
}

export default App;
