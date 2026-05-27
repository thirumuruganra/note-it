# NoteIt

<p align="center">
	<img src="./icon.png" alt="NoteIt icon" width="128" height="128">
</p>

NoteIt is a VS Code extension that treats a workspace-root `NoteIt.md` file as a persistent scratchpad. When a workspace finishes loading, the extension ensures that file exists and opens it in a dedicated webview panel titled `scratchpad`.

## Features

- Automatically creates `NoteIt.md` in the primary workspace folder if the file does not already exist.
- Opens a dedicated scratchpad webview on startup with an editable markdown pane and a rendered preview.
- Saves edits from the webview back to `NoteIt.md` immediately.
- Keeps timestamped quick notes in `NoteIt.md` while hiding those timestamps from the rendered preview.
- Adds a `NoteIt: Note and Exit` command that prompts for a quick note, appends a timestamped markdown bullet, and closes the window.
- Ships a default keybinding for the command: `Ctrl+Shift+Q` on Windows/Linux and `Cmd+Shift+Q` on macOS.

## Usage

1. Open a workspace in VS Code.
2. Let NoteIt create or load `NoteIt.md` in the primary workspace folder.
3. Type directly into the `scratchpad` panel. Changes are written back to the file on every input event and the preview updates with rendered markdown.
4. Run `NoteIt: Note and Exit` from the Command Palette when you want to capture the next task before closing the window.

## Packaging

- Publisher: `thirumuruganra`
- License: `GPL-3.0`

## Development

- `npm run check-types` validates the TypeScript project.
- `npm run lint` runs ESLint.
- `npm test` runs the extension test workflow.
- `npx @vscode/vsce package` builds the VSIX package.
