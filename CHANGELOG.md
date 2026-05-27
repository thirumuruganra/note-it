# Change Log

All notable changes to the "Note It" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.0.0] - 2026-05-27

### Added

- Initial release of Note It.
- Automatic creation of a workspace-root `NoteIt.md` scratchpad file.
- Scratchpad webview with editable markdown input and live rendered preview.
- `NoteIt: Note and Exit` command for capturing the next task before closing the VS Code window.
- Default keybinding for quick note capture: `Ctrl+Shift+Q` on Windows/Linux and `Cmd+Shift+Q` on macOS.

### Changed

- Scratchpad webview title is now shown as `Scratchpad`.
- Extension packaging updated for the `1.0.0` release.

### Security

- Hardened `NoteIt.md` file handling to reject unsafe symlinks that resolve outside the workspace.
