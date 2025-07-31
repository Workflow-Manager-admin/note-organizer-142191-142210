import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

/**
 * Utilities to get robust references to all key UI parts of the app.
 * Now uses data-testid for unambiguous selection.
 */
function setup() {
  render(<App />);
  const getSidebar = () => screen.getByRole("navigation");
  const getSidebarNotes = () => (
    within(getSidebar()).queryAllByTestId(/^sidebar-note-/)
  );
  const getCreateButton = () =>
    screen.getByTestId("create-note-btn");
  const getSearchInput = () =>
    screen.getByTestId("sidebar-searchbox");
  const getMainContent = () =>
    screen.getByTestId("main-content");
  const getNoteTitleInput = () =>
    screen.getByTestId("note-title-input");
  const getNoteContentInput = () =>
    screen.getByTestId("note-content-input");
  const getSaveButton = () =>
    screen.getByTestId("note-save-btn");
  const getCancelButton = () =>
    screen.getByTestId("note-cancel-btn");
  const getEditButton = () =>
    screen.queryByTestId("note-edit-btn");
  const getDeleteButton = () =>
    screen.queryByTestId("note-delete-btn");
  const getSidebarFab = () =>
    screen.queryByTestId("sidebar-fab");
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
    getSidebarFab,
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
    expect(
      within(notes[0]).getByTestId(/^sidebar-note-title-/)
    ).toHaveTextContent("Welcome to Note Organizer");
    expect(
      within(notes[1]).getByTestId(/^sidebar-note-title-/)
    ).toHaveTextContent("Features");
  });

  test("Selecting a note shows the note in main content", async () => {
    const { getSidebarNotes, getMainContent, getEditButton, getDeleteButton } = setup();
    const user = userEvent.setup();
    const notes = getSidebarNotes();
    // Select the second "Features" note
    await user.click(notes[1]);
    await waitFor(() =>
      expect(within(getMainContent()).getByTestId("note-display-title")).toHaveTextContent("Features")
    );
    expect(within(getMainContent()).getByTestId("note-display-content")).toHaveTextContent("Beautiful, responsive UI");
    // Action buttons present in main
    expect(getEditButton()).toBeInTheDocument();
    expect(getDeleteButton()).toBeInTheDocument();
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
    expect(screen.getByTestId("note-form-heading")).toHaveTextContent("Create Note");

    // Fill out form
    await user.type(getNoteTitleInput(), "Shopping List");
    await user.type(getNoteContentInput(), "Milk\nEggs\nBread");
    await user.click(getSaveButton());

    // Wait for sidebar update, new note first
    await waitFor(() => {
      const notes = getSidebarNotes();
      expect(within(notes[0]).getByTestId(/^sidebar-note-title-/)).toHaveTextContent("Shopping List");
    });
    // Main content reflects new note
    expect(screen.getByTestId("note-display-title")).toHaveTextContent("Shopping List");
    expect(screen.getByTestId("note-display-content")).toHaveTextContent(/milk/i);
  });

  test("Create note - empty title triggers alert, does not save", async () => {
    const { getCreateButton, getNoteTitleInput, getSaveButton } = setup();
    const user = userEvent.setup();

    await user.click(getCreateButton());
    await user.clear(getNoteTitleInput());
    await user.click(getSaveButton());
    expect(window.alert).toBeCalledWith(expect.stringMatching(/title cannot be empty/i));
    // Remains on form (not main view)
    expect(screen.getByTestId("note-form-heading")).toHaveTextContent("Create Note");
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
    expect(screen.getByTestId("note-form-heading")).toHaveTextContent("Edit Note");
    expect(getNoteTitleInput()).toHaveValue(expect.stringContaining("Welcome"));

    // Edit title and content
    await user.clear(getNoteTitleInput());
    await user.type(getNoteTitleInput(), "First Welcome (Edited)");
    await user.clear(getNoteContentInput());
    await user.type(getNoteContentInput(), "All new content");
    await user.click(getSaveButton());

    // The title is updated in both main and sidebar; wait for sidebar/main updates
    await waitFor(() => {
      expect(screen.getByTestId("note-display-title")).toHaveTextContent("First Welcome (Edited)");
    });
    expect(screen.getByTestId("note-display-content")).toHaveTextContent("All new content");
    // The sidebar note title updated (target only in sidebar)
    const sidebarTitles = screen.getAllByText("First Welcome (Edited)");
    expect(sidebarTitles.length).toBeGreaterThan(0);
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
    const { getSearchInput, getSidebarNotes, getCreateButton, getNoteTitleInput, getSaveButton } = setup();
    const user = userEvent.setup();

    // Add one more note for clear difference
    await user.click(getCreateButton());
    await user.type(getNoteTitleInput(), "Banana Bread Recipe");
    await user.click(getSaveButton());

    // Search for "features" - only that note should be visible
    await user.type(getSearchInput(), "features");
    let visibleNotes;
    await waitFor(() => {
      visibleNotes = getSidebarNotes();
      expect(visibleNotes).toHaveLength(1);
    });
    expect(within(visibleNotes[0]).getByTestId(/^sidebar-note-title-/)).toHaveTextContent(/features/i);

    // Search for "banana"
    await user.clear(getSearchInput());
    await user.type(getSearchInput(), "banana");
    await waitFor(() => {
      visibleNotes = getSidebarNotes();
      expect(visibleNotes).toHaveLength(1);
    });
    expect(within(visibleNotes[0]).getByTestId(/^sidebar-note-title-/)).toHaveTextContent(/banana bread recipe/i);

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
    const { getSidebar, getSidebarFab } = setup();
    const user = userEvent.setup();

    // Sidebar starts closed
    expect(getSidebar().className).not.toMatch(/open/);

    // Open sidebar via FAB
    const sidebarFab = getSidebarFab();
    expect(sidebarFab).toBeInTheDocument();
    await user.click(sidebarFab);
    await waitFor(() =>
      expect(getSidebar().className).toMatch(/open/)
    );

    // Close sidebar using sidebar toggle button
    const navBtn = screen.getByTestId("sidebar-toggle");
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
      getMainContent,
      getSidebarNotes,
    } = setup();
    const user = userEvent.setup();

    // Test create cancel
    await user.click(getCreateButton());
    expect(screen.getByTestId("note-form-heading")).toHaveTextContent("Create Note");
    await user.click(getCancelButton());
    await waitFor(() =>
      expect(getMainContent()).toHaveTextContent(/select a note/i)
    );

    // Test edit cancel
    // Select note, click edit
    await user.click(getSidebarNotes()[0]);
    await user.click(getEditButton());
    await user.click(getCancelButton());
    await waitFor(() =>
      expect(getMainContent()).toHaveTextContent(/welcome to note organizer/i)
    );
  });

  test("Clicking 'React Notes App' footer link opens correct URL", async () => {
    setup();
    // Link in sidebar footer
    const footerLink = screen.getByTestId("sidebar-footer-link");
    expect(footerLink).toHaveAttribute("href", "https://reactjs.org/");
    expect(footerLink).toHaveAttribute("target", "_blank");
    expect(footerLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(footerLink).toHaveTextContent("React Notes App");
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
      expect(
        within(li).getByText(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
      ).toBeInTheDocument();
    }

    // Main view date format
    await user.click(notes[0]);
    expect(screen.getByTestId("note-display-date").textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });
});
