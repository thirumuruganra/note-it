import * as fs from 'fs';
import * as path from 'path';

export const NOTE_FILE_NAME = 'NoteIt.md';
export const DEFAULT_NOTE_CONTENT = '# NoteIt\n\n';

export class NoteFileSecurityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NoteFileSecurityError';
	}
}

export function getNoteFilePath(workspaceRoot: string): string {
	return path.join(workspaceRoot, NOTE_FILE_NAME);
}

export function ensureNoteFile(workspaceRoot: string): string {
	const noteFilePath = getNoteFilePath(workspaceRoot);
	const existingEntry = getExistingNoteFileEntry(noteFilePath);

	if (!existingEntry) {
		assertPathConfinedToWorkspace(workspaceRoot, noteFilePath);
		fs.writeFileSync(noteFilePath, DEFAULT_NOTE_CONTENT, 'utf8');
		return noteFilePath;
	}

	assertSafeExistingNoteFile(workspaceRoot, noteFilePath, existingEntry);
	return noteFilePath;
}

export function readNoteContent(noteFilePath: string): string {
	assertSafeExistingNoteFile(path.dirname(noteFilePath), noteFilePath);
	return fs.readFileSync(noteFilePath, 'utf8');
}

export function writeNoteContent(noteFilePath: string, content: string): void {
	assertSafeExistingNoteFile(path.dirname(noteFilePath), noteFilePath);
	fs.writeFileSync(noteFilePath, content, 'utf8');
}

export function appendQuickNote(noteFilePath: string, note: string, now: Date = new Date()): void {
	const existingEntry = getExistingNoteFileEntry(noteFilePath);
	const existingContent = existingEntry
		? (assertSafeExistingNoteFile(path.dirname(noteFilePath), noteFilePath, existingEntry), fs.readFileSync(noteFilePath, 'utf8'))
		: '';
	const leadingNewline = existingContent.length > 0 && !existingContent.endsWith('\n')
		? '\n'
		: '';

	assertPathConfinedToWorkspace(path.dirname(noteFilePath), noteFilePath);
	fs.appendFileSync(noteFilePath, formatQuickNote(note, now, leadingNewline), 'utf8');
}


export function formatQuickNote(
	note: string,
	now: Date = new Date(),
	leadingNewline = ''
): string {
	const trimmedNote = note.trim();
	return `${leadingNewline}- [${formatTimestamp(now)}] ${trimmedNote}\n`;
}

export function formatTimestamp(now: Date = new Date()): string {
	return now.toISOString().slice(0, 16).replace('T', ' ');
}

export function buildScratchpadHtml(initialContent: string, renderedContent: string): string {
	const escapedContent = escapeHtml(initialContent);
	const nonce = getNonce();

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta
		http-equiv="Content-Security-Policy"
		content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"
	/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Scratchpad</title>
	<style>
		:root {
			color-scheme: light dark;
		}

		body {
			margin: 0;
			padding: 16px;
			background: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
			font-family: var(--vscode-font-family);
		}

		.layout {
			display: grid;
			grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr);
			gap: 16px;
			height: calc(100vh - 32px);
		}

		.panel {
			display: flex;
			flex-direction: column;
			min-height: 0;
		}

		.panel-header {
			margin-bottom: 8px;
			font-size: 12px;
			font-weight: 600;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--vscode-descriptionForeground);
		}

		textarea {
			box-sizing: border-box;
			width: 100%;
			height: 100%;
			resize: none;
			padding: 16px;
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 8px;
			outline: none;
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			font: inherit;
			line-height: 1.5;
		}

		.preview {
			overflow: auto;
			padding: 16px;
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 8px;
			background: var(--vscode-editor-background);
			line-height: 1.6;
		}

		.preview > :first-child {
			margin-top: 0;
		}

		.preview > :last-child {
			margin-bottom: 0;
		}

		.preview a {
			color: var(--vscode-textLink-foreground);
		}

		.preview code {
			font-family: var(--vscode-editor-font-family);
			font-size: 0.95em;
			padding: 0.1em 0.3em;
			border-radius: 4px;
			background: var(--vscode-textCodeBlock-background);
		}

		.preview pre {
			overflow: auto;
			padding: 12px;
			border-radius: 8px;
			background: var(--vscode-textCodeBlock-background);
		}

		.preview pre code {
			padding: 0;
			background: transparent;
		}

		.preview blockquote {
			margin-left: 0;
			padding-left: 12px;
			border-left: 4px solid var(--vscode-textBlockQuote-border);
			color: var(--vscode-textBlockQuote-foreground);
		}

		.preview hr {
			border: 0;
			border-top: 1px solid var(--vscode-panel-border);
		}

		.preview table {
			width: 100%;
			border-collapse: collapse;
		}

		.preview th,
		.preview td {
			padding: 8px 10px;
			border: 1px solid var(--vscode-panel-border);
		}

		.preview-empty {
			color: var(--vscode-descriptionForeground);
		}

		@media (max-width: 900px) {
			.layout {
				grid-template-columns: 1fr;
			}
		}
	</style>
</head>
<body>
	<div class="layout">
		<section class="panel">
			<div class="panel-header">Markdown</div>
			<textarea id="note-input" spellcheck="false">${escapedContent}</textarea>
		</section>
		<section class="panel">
			<div class="panel-header">Preview</div>
			<article id="note-preview" class="preview">${renderedContent}</article>
		</section>
	</div>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const textarea = document.getElementById('note-input');
		const preview = document.getElementById('note-preview');
		const emptyPreviewHtml = '<p class="preview-empty">Markdown preview appears here.</p>';
		let nextVersion = 0;
		let renderedVersion = 0;

		const setPreviewContent = (html) => {
			preview.innerHTML = html && html.trim() ? html : emptyPreviewHtml;
		};

		setPreviewContent(preview.innerHTML);

		textarea.addEventListener('input', () => {
			nextVersion += 1;
			vscode.postMessage({
				type: 'update-note',
				content: textarea.value,
				version: nextVersion,
			});
		});

		window.addEventListener('message', (event) => {
			const message = event.data;

			if (
				!message ||
				message.type !== 'rendered-note' ||
				typeof message.content !== 'string' ||
				typeof message.version !== 'number' ||
				message.version < renderedVersion
			) {
				return;
			}

			renderedVersion = message.version;
			setPreviewContent(message.content);
		});
	</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function getNonce(): string {
	return Math.random().toString(36).slice(2, 12);
}

function getExistingNoteFileEntry(noteFilePath: string): fs.Stats | undefined {
	try {
		return fs.lstatSync(noteFilePath);
	} catch (error: unknown) {
		if (isMissingPathError(error)) {
			return undefined;
		}

		throw error;
	}
}

function assertSafeExistingNoteFile(
	workspaceRoot: string,
	noteFilePath: string,
	existingEntry: fs.Stats = getRequiredExistingNoteFileEntry(noteFilePath)
): void {
	if (existingEntry.isSymbolicLink()) {
		throw new NoteFileSecurityError('NoteIt refused to use NoteIt.md because it is a symbolic link.');
	}

	if (!existingEntry.isFile()) {
		throw new NoteFileSecurityError('NoteIt refused to use NoteIt.md because it is not a regular file.');
	}

	assertPathConfinedToWorkspace(workspaceRoot, fs.realpathSync(noteFilePath));
}

function getRequiredExistingNoteFileEntry(noteFilePath: string): fs.Stats {
	const existingEntry = getExistingNoteFileEntry(noteFilePath);
	if (!existingEntry) {
		throw new NoteFileSecurityError('NoteIt could not find NoteIt.md.');
	}

	return existingEntry;
}

function assertPathConfinedToWorkspace(workspaceRoot: string, filePath: string): void {
	const resolvedWorkspaceRoot = normalizePath(fs.realpathSync(workspaceRoot));
	const resolvedFilePath = normalizePath(path.resolve(filePath));
	const relativePath = path.relative(resolvedWorkspaceRoot, resolvedFilePath);

	if (relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))) {
		return;
	}

	throw new NoteFileSecurityError('NoteIt refused to use NoteIt.md because it resolves outside the workspace root.');
}

function normalizePath(filePath: string): string {
	return process.platform === 'win32' ? filePath.toLowerCase() : filePath;
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
	return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}