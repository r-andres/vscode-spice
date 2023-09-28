import * as vscode from 'vscode';
import { Disposable, disposeAll } from './dispose';
import { getNonce, getSPICEUtilityPath, getSpiceBrief, getSpiceComment, getSpiceInfo, saveSpiceComment } from './util';
import * as cp from 'child_process';
import { existsSync } from 'fs';

/**
 * Define the type of edits used in paw draw files.
 */

interface spiceBinaryDocumentDelegate {
	getFileData(): Promise<Uint8Array>;
}

/**
 * Define the document (the data model) used for paw draw files.
 */
class SpiceBinaryDocument extends Disposable implements vscode.CustomDocument {

	static async create(
		uri: vscode.Uri,
		backupId: string | undefined,
		delegate: spiceBinaryDocumentDelegate,
	): Promise<SpiceBinaryDocument | PromiseLike<SpiceBinaryDocument>> {
		
		const briefData = await SpiceBinaryDocument.getSpiceInfo(uri);
		const commntData = await SpiceBinaryDocument.getSpiceComment(uri);
		
		return new SpiceBinaryDocument(uri, commntData, briefData, delegate);
	}

	private static async getSpiceInfo(uri: vscode.Uri): Promise<string> {
		if (uri.scheme === 'untitled') {
			return '';
		}
		return getSpiceInfo(uri.fsPath);
	}

	private static async getSpiceComment(uri: vscode.Uri): Promise<string> {
		if (uri.scheme === 'untitled') {
			return '';
		}
		return getSpiceComment(uri.fsPath);
	}

	private readonly _uri: vscode.Uri;

	private _commntData: string;
	private _briefData: string;
	
	private _edits: Array<SpiceBinaryDocument> = [];
	private _savedEdits: Array<SpiceBinaryDocument> = [];

	private readonly _delegate: spiceBinaryDocumentDelegate;

	private constructor(
		uri: vscode.Uri,
		commntData: string,
		briefData: string,
		delegate: spiceBinaryDocumentDelegate
	) {
		super();
		this._uri = uri;
		this._commntData = commntData;
		this._briefData = briefData;
		this._delegate = delegate;
	}

	public get uri() { return this._uri; }

	public get briefData(): string { return this._briefData; }
	public get commntData(): string { return this._commntData; }
	

	private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());
	/**
	 * Fired when the document is disposed of.
	 */
	public readonly onDidDispose = this._onDidDispose.event;

	private readonly _onDidChangeDocument = this._register(new vscode.EventEmitter<{
		readonly content?: string;
	}>());
	/**
	 * Fired to notify webviews that the document has changed.
	 */
	public readonly onDidChangeContent = this._onDidChangeDocument.event;

	private readonly _onDidChange = this._register(new vscode.EventEmitter<{
		readonly label: string,
		undo(): void,
		redo(): void,
	}>());
	/**
	 * Fired to tell VS Code that an edit has occurred in the document.
	 *
	 * This updates the document's dirty indicator.
	 */
	public readonly onDidChange = this._onDidChange.event;

	/**
	 * Called by VS Code when there are no more references to the document.
	 *
	 * This happens when all editors for it have been closed.
	 */
	dispose(): void {
		this._onDidDispose.fire();
		super.dispose();
	}

	
	/**
	 * Called by VS Code when the user saves the document.
	 */
	async save(cancellation: vscode.CancellationToken): Promise<void> {
		vscode.window.showErrorMessage('SPICE binary save not implemented');
	}

	/**
	 * Called by VS Code when the user saves the document to a new location.
	 */
	async saveAs(targetResource: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
		vscode.window.showErrorMessage('SPICE binary save not implemented');
	}

	/**
	 * Called by VS Code when the user calls `revert` on a document.
	 */
	async revert(_cancellation: vscode.CancellationToken): Promise<void> {
		const commntData = await SpiceBinaryDocument.getSpiceComment(this.uri);
		this._commntData = commntData;
		this._edits = this._savedEdits;
		this._onDidChangeDocument.fire({
			content: commntData
		});
	}

	/**
	 * Called by VS Code to backup the edited document.
	 *
	 * These backups are used to implement hot exit.
	 */
	async backup(destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
		// await this.saveAs(destination, cancellation);

		return {
			id: destination.toString(),
			delete: async () => {
				try {
					await vscode.workspace.fs.delete(destination);
				} catch {
					// noop
				}
			}
		};
	}
}

/**
 * Provider for SPICE Binary editors.
 *
 * SPICE Binary editors are used for binary SPICE kernels, they display the comments inside it.
 *
 * Additionally, this provider implements:
 * - TBW
 */
export class SpiceBinaryEditorProvider implements vscode.CustomEditorProvider<SpiceBinaryDocument> {

	private static newPawDrawFileId = 1;

	public static register(context: vscode.ExtensionContext): vscode.Disposable {


		return vscode.window.registerCustomEditorProvider(
			SpiceBinaryEditorProvider.viewType,
			new SpiceBinaryEditorProvider(context),
			{
				// For this demo extension, we enable `retainContextWhenHidden` which keeps the
				// webview alive even when it is not visible. You should avoid using this setting
				// unless is absolutely required as it does have memory overhead.
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false,
			});
	}

	private static readonly viewType =  'spiceCustom.binary';

	/**
	 * Tracks all known webviews
	 */
	private readonly webviews = new WebviewCollection();

	constructor(
		private readonly _context: vscode.ExtensionContext
	) { }

	//#region CustomEditorProvider

	async openCustomDocument(
		uri: vscode.Uri,
		openContext: { backupId?: string },
		_token: vscode.CancellationToken
	): Promise<SpiceBinaryDocument> {
		const document: SpiceBinaryDocument = await SpiceBinaryDocument.create(uri, openContext.backupId, {
			getFileData: async () => {
				const webviewsForDocument = Array.from(this.webviews.get(document.uri));
				if (!webviewsForDocument.length) {
					throw new Error('Could not find webview to save for');
				}
				const panel = webviewsForDocument[0];
				const response = await this.postMessageWithResponse<number[]>(panel, 'getFileData', {});
				return new Uint8Array(response);
			}
		});

		const listeners: vscode.Disposable[] = [];

		listeners.push(document.onDidChange(e => {
			// Tell VS Code that the document has been edited by the use.
			this._onDidChangeCustomDocument.fire({
				document,
				...e,
			});
		}));

		listeners.push(document.onDidChangeContent(e => {
			// Update all webviews when the document changes
			for (const webviewPanel of this.webviews.get(document.uri)) {
				this.postMessage(webviewPanel, 'update', {
					content: e.content,
				});
			}
		}));

		document.onDidDispose(() => disposeAll(listeners));

		return document;
	}

	async resolveCustomEditor(
		document: SpiceBinaryDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		// Add the webview to our internal set of active webviews
		this.webviews.add(document.uri, webviewPanel);

		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};

		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

		// Wait for the webview to be properly ready before we init
		webviewPanel.webview.onDidReceiveMessage(e => {
			if (e.type === 'ready') {

				if (document.uri.scheme === 'untitled') {
					this.postMessage(webviewPanel, 'init', {
						untitled: true,
						editable: true,
					});
				} else {
					const editable = vscode.workspace.fs.isWritableFileSystem(document.uri.scheme);
					this.postMessage(webviewPanel, 'init', {
						commnt: document.commntData,
						brief: document.briefData,
						value: document.commntData,
						editable,
					});
				}
			}
		});
	}

	private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<SpiceBinaryDocument>>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

	public saveCustomDocument(document: SpiceBinaryDocument, cancellation: vscode.CancellationToken): Thenable<void> { 
		return document.save(cancellation);
	}

	public saveCustomDocumentAs(document: SpiceBinaryDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.saveAs(destination, cancellation);
	}

	public revertCustomDocument(document: SpiceBinaryDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.revert(cancellation);
	}

	public backupCustomDocument(document: SpiceBinaryDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		return document.backup(context.destination, cancellation);
	}

	//#endregion

	/**
	 * Get the static HTML used for in our editor's webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {

		// Local path to script and css for the webview
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this._context.extensionUri, 'media', 'spice_editor.js'));
		
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this._context.extensionUri, 'media', 'reset.css'));

		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this._context.extensionUri, 'media', 'vscode.css'));

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return /* html */`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<link href="${styleResetUri}" rel="stylesheet" />
				<link href="${styleVSCodeUri}" rel="stylesheet" />

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>SPICE Binary file</title>
			</head>
			<body>
			<div class="notes">
				<div class="add-button">
					<button id="save">Save Comment</button>
					<button id="brief">View Brief</button>
					<button id="commnt">View Comment</button>
				</div>
			</div>
			<div id="editor" contenteditable></div>
			<div id="briefEditor"></div>
			
			<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}

	private _requestId = 1;
	private readonly _callbacks = new Map<number, (response: any) => void>();

	private postMessageWithResponse<R = unknown>(panel: vscode.WebviewPanel, type: string, body: any): Promise<R> {
		const requestId = this._requestId++;
		const p = new Promise<R>(resolve => this._callbacks.set(requestId, resolve));
		panel.webview.postMessage({ type, requestId, body });
		return p;
	}

	private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
		panel.webview.postMessage({ type, body });
	}

	private onMessage(document: SpiceBinaryDocument, message: any) {
		switch (message.type) {
			case 'ready':
				{
					console.log(message);
				}
			case 'response':
				{
					const callback = this._callbacks.get(message.requestId);
					callback?.(message.body);
					return;
				}
			case 'update-comment':
				{
					const content = message.body.value;
					const binaryPath = document.uri.fsPath;
					const promise = saveSpiceComment(binaryPath, content);
					promise.then((result)=> {
						if (result) {
							vscode.window.showInformationMessage('Comment updated!');
						} else {
							vscode.window.showErrorMessage('The comment cannot be updated');
						}
					})
				}
		}
	}

}

/**
 * Tracks all webviews.
 */
class WebviewCollection {

	private readonly _webviews = new Set<{
		readonly resource: string;
		readonly webviewPanel: vscode.WebviewPanel;
	}>();

	/**
	 * Get all known webviews for a given uri.
	 */
	public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
		const key = uri.toString();
		for (const entry of this._webviews) {
			if (entry.resource === key) {
				yield entry.webviewPanel;
			}
		}
	}

	/**
	 * Add a new webview to the collection.
	 */
	public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
		const entry = { resource: uri.toString(), webviewPanel };
		this._webviews.add(entry);

		webviewPanel.onDidDispose(() => {
			this._webviews.delete(entry);
		});
	}
}
