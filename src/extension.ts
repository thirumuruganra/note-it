import * as vscode from 'vscode';
import {
	appendQuickNote,
	buildScratchpadHtml,
	ensureNoteFile,
	NoteFileSecurityError,
	readNoteContent,
	writeNoteContent,
} from './noteIt';

const NOTE_PANEL_VIEW_TYPE = 'noteItPopup';
const NOTE_PANEL_TITLE = 'Scratchpad';
const NOTE_AND_EXIT_COMMAND = 'noteit.noteAndExit';
const NOTE_PROMPT = 'What are you working on next?';

export function activate(context: vscode.ExtensionContext) {
	let panel: vscode.WebviewPanel | undefined;

	const workspaceRoot = getPrimaryWorkspaceRoot();
	if (workspaceRoot) {
		void openScratchpadForWorkspace(workspaceRoot, panel, context).then((createdPanel) => {
			panel = createdPanel;
		});
	}

	const noteAndExitCommand = vscode.commands.registerCommand(NOTE_AND_EXIT_COMMAND, async () => {
		const commandWorkspaceRoot = getPrimaryWorkspaceRoot();
		if (!commandWorkspaceRoot) {
			return;
		}

		const quickNote = await vscode.window.showInputBox({ prompt: NOTE_PROMPT });
		if (!quickNote?.trim()) {
			return;
		}

		let noteFilePath: string;
		try {
			noteFilePath = ensureNoteFile(commandWorkspaceRoot);
			appendQuickNote(noteFilePath, quickNote);
		} catch (error: unknown) {
			handleNoteFileError(error);
			return;
		}

		await vscode.commands.executeCommand('workbench.action.closeWindow');
	});

	context.subscriptions.push(noteAndExitCommand);
}

export function deactivate() {}

async function openScratchpadForWorkspace(
	workspaceRoot: string,
	existingPanel: vscode.WebviewPanel | undefined,
	context: vscode.ExtensionContext
): Promise<vscode.WebviewPanel | undefined> {
	try {
		const noteFilePath = ensureNoteFile(workspaceRoot);
		return await createOrRevealScratchpad(noteFilePath, existingPanel, context);
	} catch (error: unknown) {
		handleNoteFileError(error);
		return undefined;
	}
}

function getPrimaryWorkspaceRoot(): string | undefined {
	return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function handleNoteFileError(error: unknown): void {
	if (error instanceof NoteFileSecurityError) {
		void vscode.window.showErrorMessage(error.message);
		return;
	}

	throw error;
}

async function createOrRevealScratchpad(
	noteFilePath: string,
	existingPanel: vscode.WebviewPanel | undefined,
	context: vscode.ExtensionContext
	): Promise<vscode.WebviewPanel> {
	const noteContent = readNoteContent(noteFilePath);
	const renderedContent = await renderMarkdownContent(noteContent);

	if (existingPanel) {
		existingPanel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
		existingPanel.webview.html = buildScratchpadHtml(noteContent, renderedContent);
		existingPanel.reveal(vscode.ViewColumn.Active);
		return existingPanel;
	}

	const panel = vscode.window.createWebviewPanel(
		NOTE_PANEL_VIEW_TYPE,
		NOTE_PANEL_TITLE,
		vscode.ViewColumn.Active,
		{ enableScripts: true }
	);

	panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
	panel.webview.html = buildScratchpadHtml(noteContent, renderedContent);

	const messageSubscription = panel.webview.onDidReceiveMessage(async (message: unknown) => {
		if (!isUpdateMessage(message)) {
			return;
		}

		writeNoteContent(noteFilePath, message.content);
		const updatedRenderedContent = await renderMarkdownContent(message.content);
		await panel.webview.postMessage({
			type: 'rendered-note',
			content: updatedRenderedContent,
			version: message.version,
		});
	});

	const disposeSubscription = panel.onDidDispose(() => {
		messageSubscription.dispose();
		disposeSubscription.dispose();
	});

	context.subscriptions.push(messageSubscription, disposeSubscription, panel);
	return panel;
}

async function renderMarkdownContent(markdown: string): Promise<string> {
	const previewMarkdown = stripPreviewTimestamps(markdown);

	try {
		const renderedContent = await vscode.commands.executeCommand<string>('markdown.api.render', previewMarkdown);
		return renderedContent ?? buildPlaintextPreview(previewMarkdown);
	} catch {
		return buildPlaintextPreview(previewMarkdown);
	}
}

export function stripPreviewTimestamps(markdown: string): string {
	return markdown.replace(
		/^(\s*[-*+]\s+)\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s+/gm,
		'$1'
	);
}

function buildPlaintextPreview(markdown: string): string {
	return `<pre>${escapeHtml(markdown)}</pre>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function isUpdateMessage(
	message: unknown
): message is { type: 'update-note'; content: string; version: number } {
	if (!message || typeof message !== 'object') {
		return false;
	}

	const candidate = message as { type?: unknown; content?: unknown; version?: unknown };
	return (
		candidate.type === 'update-note' &&
		typeof candidate.content === 'string' &&
		typeof candidate.version === 'number'
	);
}
