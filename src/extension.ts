import * as vscode from 'vscode';
import { SpiceBinaryEditorProvider } from './spiceBinaryEditor';

export function activate(context: vscode.ExtensionContext) {
	// Register our custom editor providers
	context.subscriptions.push(SpiceBinaryEditorProvider.register(context));
}
