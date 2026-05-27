import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { stripPreviewTimestamps } from '../extension';
import {
	DEFAULT_NOTE_CONTENT,
	NOTE_FILE_NAME,
	NoteFileSecurityError,
	appendQuickNote,
	buildScratchpadHtml,
	ensureNoteFile,
	formatQuickNote,
} from '../noteIt';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	let tempDir: string;

	setup(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'note-it-'));
	});

	teardown(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	test('ensureNoteFile rejects NoteIt.md symlinks that resolve outside the workspace root', () => {
		const outsideFilePath = path.join(os.tmpdir(), `note-it-outside-${Date.now()}.md`);
		fs.writeFileSync(outsideFilePath, 'outside content', 'utf8');
		fs.symlinkSync(outsideFilePath, path.join(tempDir, NOTE_FILE_NAME));

		assert.throws(
			() => ensureNoteFile(tempDir),
			(error: unknown) =>
				error instanceof NoteFileSecurityError &&
				error.message.includes('symbolic link')
		);
		assert.strictEqual(fs.readFileSync(outsideFilePath, 'utf8'), 'outside content');

		fs.rmSync(outsideFilePath, { force: true });
	});

	test('ensureNoteFile creates NoteIt.md with default content', () => {
		const noteFilePath = ensureNoteFile(tempDir);

		assert.strictEqual(noteFilePath, path.join(tempDir, NOTE_FILE_NAME));
		assert.strictEqual(fs.readFileSync(noteFilePath, 'utf8'), DEFAULT_NOTE_CONTENT);
	});

	test('ensureNoteFile preserves existing note content', () => {
		const noteFilePath = path.join(tempDir, NOTE_FILE_NAME);
		fs.writeFileSync(noteFilePath, 'existing content', 'utf8');

		ensureNoteFile(tempDir);

		assert.strictEqual(fs.readFileSync(noteFilePath, 'utf8'), 'existing content');
	});

	test('formatQuickNote renders a timestamped markdown bullet', () => {
		const quickNote = formatQuickNote(
			'Review autosave flow',
			new Date('2026-05-27T14:05:00.000Z')
		);

		assert.strictEqual(quickNote, '- [2026-05-27 14:05] Review autosave flow\n');
	});

	test('appendQuickNote adds a separating newline when needed', () => {
		const noteFilePath = path.join(tempDir, NOTE_FILE_NAME);
		fs.writeFileSync(noteFilePath, '# NoteIt', 'utf8');

		appendQuickNote(noteFilePath, 'Finish release notes', new Date('2026-05-27T15:20:00.000Z'));

		assert.strictEqual(
			fs.readFileSync(noteFilePath, 'utf8'),
			'# NoteIt\n- [2026-05-27 15:20] Finish release notes\n'
		);
	});

	test('appendQuickNote rejects NoteIt.md symlinks before appending', () => {
		const outsideFilePath = path.join(os.tmpdir(), `note-it-append-${Date.now()}.md`);
		fs.writeFileSync(outsideFilePath, 'outside content', 'utf8');
		fs.symlinkSync(outsideFilePath, path.join(tempDir, NOTE_FILE_NAME));

		assert.throws(
			() => appendQuickNote(path.join(tempDir, NOTE_FILE_NAME), 'Do not write here'),
			(error: unknown) =>
				error instanceof NoteFileSecurityError &&
				error.message.includes('symbolic link')
		);
		assert.strictEqual(fs.readFileSync(outsideFilePath, 'utf8'), 'outside content');

		fs.rmSync(outsideFilePath, { force: true });
	});

	test('stripPreviewTimestamps hides quick-note timestamps in preview content only', () => {
		const previewContent = stripPreviewTimestamps(
			'# NoteIt\n- [2026-05-27 15:20] Finish release notes\n- Add package metadata\n'
		);

		assert.strictEqual(previewContent, '# NoteIt\n- Finish release notes\n- Add package metadata\n');
	});

	test('buildScratchpadHtml escapes textarea content and wires preview updates', () => {
		const html = buildScratchpadHtml('<tag>&note', '<h1>Preview</h1>');

		assert.ok(html.includes('&lt;tag&gt;&amp;note'));
		assert.ok(html.includes('<title>Scratchpad</title>'));
		assert.ok(html.includes('<article id="note-preview" class="preview"><h1>Preview</h1></article>'));
		assert.ok(html.includes("type: 'update-note'"));
		assert.ok(html.includes("type !== 'rendered-note'"));
		assert.ok(html.includes('version: nextVersion'));
		assert.ok(html.includes('acquireVsCodeApi()'));
	});
});
