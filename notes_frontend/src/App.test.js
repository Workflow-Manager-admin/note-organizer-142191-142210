import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// Utilities
function setup() {
  render(<App />);
  const getSidebar = () => screen.getByRole("navigation");
  const getSidebarNotes = () =>
    within(getSidebar()).getAllByRole("listitem");
  const getCreateButton = () =>
    within(getSidebar()).getByRole("button", { name: /\+ new note/i });
  const getSearchInput = () =>
    within(getSidebar()).getByRole("searchbox");
  const getMainContent = () => screen.getByRole("main");
  const getNoteTitleInput = () =>
    screen.getByPlaceholderText(/title/i);
  const getNoteContentInput = () =>
    screen.getByPlaceholderText(/write your note/i);
  const getSaveButton = () =>
    screen.getByRole("button", { name: /^save$/i });
  const getCancelButton = () =>
    screen.getByRole("button", { name: /^cancel$/i });
  // Edit/Delete button sometimes appears multiple times, make more specific via within main
  const getEditButton = () =>
    within(getMainContent()).getByRole("button", { name: /^edit$/i });
  const getDeleteButton = () =>
    within(getMainContent()).getByRole("button", { name: /^delete$/i });
  return {
    getSidebar,
    getSidebarNotes,
    getCreateButton,
    getSearchInput,
    getMainContent,
    getNoteTitleInput,
    getNoteContentInput,
    getSaveButton,
    getCancelButton,
    getEditButton,
    getDeleteButton,
  };
}

// Helper to confirm window.confirm and window.alert
beforeAll(() => {
  window.confirm = jest.fn(() => true);
  window.alert = jest.fn();
});
afterEach(() => {
  jest.clearAllMocks();
});

describe("Notes App UI", () => {
  test("Sidebar renders, initial notes displayed and correct nav", async () => {
    const { getSidebar, getSidebarNotes } = setup();
    expect(getSidebar()).toBeInTheDocument();
    // Wait for notes to seed
    await waitFor(() => {
      expect(getSidebarNotes().length).toBe(2);
    });
    const notes = getSidebarNotes();
    expect(within(notes[0]).getByText(/organizer/i)).toBeInTheDocument();
    expect(within(notes[1]).getByText(/features/i)).toBeInTheDocument();
  });

  test("Selecting a note shows the note in main content", async () => {
    const { getSidebarNotes, getMainContent } = setup();
    const user = userEvent.setup();
    const notes = getSidebarNotes();
    // Select the second "Features" note
    await user.click(notes[1]);
    await waitFor(() =>
      expect(getMainContent()).toHaveTextContent(/features/i)
    );
    expect(getMainContent()).toHaveTextContent(/beautiful, responsive ui/i);
    // Action buttons present in main
    expect(within(getMainContent()).getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(within(getMainContent()).getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  test("Create new note shows form, creates note and displays in sidebar", async () => {
    const {
      getCreateButton,
      getNoteTitleInput,
      getNoteContentInput,
      getSaveButton,
      getSidebarNotes,
    } = setup();
    const user = userEvent.setup();

    await user.click(getCreateButton());
    expect(screen.getByRole("heading", { name: /create note/i })).toBeInTheDocument();

    // Fill out form
    await user.type(getNoteTitleInput(), "Shopping List");
    await user.type(getNoteContentInput(), "Milk\nEggs\nBread");
    await user.click(getSaveButton());

    // Wait for sidebar update, new note first
    await waitFor(() => {
      const notes = getSidebarNotes();
      expect(within(notes[0]).getByText("Shopping List")).toBeInTheDocument();
    });
    // Main content reflects new note
    expect(screen.getByText("Shopping List")).toBeInTheDocument();
    expect(screen.getByText(/milk/i)).toBeInTheDocument();
  });

  test("Create note - empty title triggers alert, does not save", async () => {
    const { getCreateButton, getNoteTitleInput, getSaveButton } = setup();
    const user = userEvent.setup();

    await user.click(getCreateButton());
    await user.clear(getNoteTitleInput());
    await user.click(getSaveButton());
    expect(window.alert).toBeCalledWith(expect.stringMatching(/title cannot be empty/i));
    // Remains on form (not main view)
    expect(screen.getByRole("heading", { name: /create note/i })).toBeInTheDocument();
  });

  test("Edit a note, changes saved and listed correctly", async () => {
    const {
      getSidebarNotes,
      getEditButton,
      getNoteTitleInput,
      getNoteContentInput,
      getSaveButton,
    } = setup();
    const user = userEvent.setup();

    // Select note 0
    await user.click(getSidebarNotes()[0]);
    await user.click(getEditButton());
    // Should see edit form prefilled
    expect(screen.getByRole("heading", { name: /edit note/i })).toBeInTheDocument();
    expect(getNoteTitleInput()).toHaveValue(expect.stringContaining("Welcome"));

    // Edit title and content
    await user.clear(getNoteTitleInput());
    await user.type(getNoteTitleInput(), "First Welcome (Edited)");
    await user.clear(getNoteContentInput());
    await user.type(getNoteContentInput(), "All new content");
    await user.click(getSaveButton());

    // The title is updated in both main and sidebar; wait for sidebar/main updates
    await waitFor(() => {
      expect(screen.getByText("First Welcome (Edited)")).toBeInTheDocument();
    });
    expect(screen.getByText("All new content")).toBeInTheDocument();
    // The sidebar note title updated (target only in sidebar)
    const sidebarNotes = screen.getAllByText("First Welcome (Edited)");
    expect(sidebarNotes.length).toBeGreaterThan(0);
  });

  test("Delete a note removes it from sidebar and main view", async () => {
    const {
      getSidebarNotes,
      getDeleteButton,
      getSidebar,
    } = setup();
    const user = userEvent.setup();

    // Select a note
    await user.click(getSidebarNotes()[0]);
    await user.click(getDeleteButton());
    // window.confirm was called
    expect(window.confirm).toBeCalledWith(expect.stringMatching(/delete this note/i));
    // Note gone from sidebar and main returns to empty state or shows next note
    await waitFor(() =>
      expect(getSidebar()).not.toHaveTextContent(/welcome to note organizer/i)
    );
    // Since sidebar "features" note will be present, check it's visible
    expect(getSidebar()).toHaveTextContent(/features/i);
  });

  test("Sidebar search filters notes live", async () => {
    const { getSearchInput, getSidebarNotes, getCreateButton } = setup();
    const user = userEvent.setup();

    // Add one more note for clear difference
    await user.click(getCreateButton());
    await user.type(screen.getByPlaceholderText(/title/i), "Banana Bread Recipe");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    // Search for "features" - only that note should be visible
    await user.type(getSearchInput(), "features");
    let visibleNotes;
    await waitFor(() => {
      visibleNotes = getSidebarNotes();
      expect(visibleNotes).toHaveLength(1);
    });
    expect(within(visibleNotes[0]).getByText(/features/i)).toBeInTheDocument();

    // Search for "banana"
    await user.clear(getSearchInput());
    await user.type(getSearchInput(), "banana");
    await waitFor(() => {
      visibleNotes = getSidebarNotes();
      expect(visibleNotes).toHaveLength(1);
    });
    expect(within(visibleNotes[0]).getByText(/banana bread recipe/i)).toBeInTheDocument();

    // Search not found
    await user.clear(getSearchInput());
    await user.type(getSearchInput(), "xxxxxxxxx");
    await waitFor(() => {
      visibleNotes = getSidebarNotes();
      expect(visibleNotes).toHaveLength(1); // 'No notes found' dummy
      expect(visibleNotes[0]).toHaveTextContent(/no notes found/i);
    });
  });

  test("Sidebar toggles open/close on click (responsive)", async () => {
    // Set window innerWidth <= 768 for mobile sidebar state
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 500});
    window.dispatchEvent(new Event("resize"));
    const { getSidebar } = setup();
    const user = userEvent.setup();

    // Sidebar starts closed
    expect(getSidebar().className).not.toMatch(/open/);

    // Open sidebar via FAB
    const sidebarFab = screen.getByRole("button", { name: /open navigation/i, hidden: true });
    await user.click(sidebarFab);
    await waitFor(() =>
      expect(getSidebar().className).toMatch(/open/)
    );

    // Close sidebar using sidebar toggle button
    const navBtn = within(getSidebar()).getByRole("button", { name: /close navigation/i });
    await user.click(navBtn);
    await waitFor(() =>
      expect(getSidebar().className).not.toMatch(/open/)
    );
  });

  test("Canceling create or edit brings you back to view", async () => {
    const {
      getCreateButton,
      getCancelButton,
      getEditButton,
      getMainContent
    } = setup();
    const user = userEvent.setup();

    // Test create cancel
    await user.click(getCreateButton());
    expect(screen.getByRole("heading", { name: /create note/i })).toBeInTheDocument();
    await user.click(getCancelButton());
    await waitFor(() =>
      expect(getMainContent()).toHaveTextContent(/select a note/i)
    );

    // Test edit cancel
    // Select note, click edit
    await user.click(screen.getAllByRole("listitem")[0]);
    await user.click(getEditButton());
    await user.click(getCancelButton());
    await waitFor(() =>
      expect(getMainContent()).toHaveTextContent(/welcome to note organizer/i)
    );
  });

  test("Clicking 'React Notes App' footer link opens correct URL", async () => {
    setup();
    // Link in sidebar footer
    const sidebar = screen.getByRole("navigation");
    const link = within(sidebar).getByRole("link", { name: /react notes app/i });
    expect(link).toHaveAttribute("href", "https://reactjs.org/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("Dates displayed in human-readable format", async () => {
    const { getSidebarNotes } = setup();
    const user = userEvent.setup();

    // All sidebar notes show a date in format MM/DD/YYYY or similar
    await waitFor(() => {
      const notes = getSidebarNotes();
      expect(notes.length).toBeGreaterThan(0);
    });
    const notes = getSidebarNotes();
    for (let li of notes) {
      // Should have something like: 4/12/2024 10:43
      const dateEl = within(li).getByText(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
      expect(dateEl).toBeInTheDocument();
    }

    // Main view date format
    await user.click(notes[0]);
    expect(screen.getByText(/last updated/i).textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });
});
