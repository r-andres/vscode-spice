import * as vscode from 'vscode';

export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function getSPICEUtilityPath(): string {
	const value = vscode.workspace.getConfiguration().get<string>('vscode-spice.SpiceUtilitiesPath');
	return (value == undefined) ?  '' : value;
}