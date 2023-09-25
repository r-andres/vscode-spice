// @ts-check

// This script is run within the webview itself
(function () {
	// @ts-ignore
	const vscode = acquireVsCodeApi();

	

	class SpiceEditor {
		constructor( /** @type {HTMLElement | null} */ parent) {
			this.ready = false;

			this.editable = false;

			this._initElements(parent);
		}

		_initElements(/** @type {HTMLElement | null} */ parent) {
			this.saveButton = document.querySelector('#save');
			this.saveButton?.addEventListener('click', (e) => {
				vscode.postMessage(
					{ type: 'update-comment',
					  body: {
						value: parent?.innerText
					  }
					}
				)
			});

			this.editor = parent;
		}

		setReadOnly(/** @type {string} */ content) {
			if (this.editor != null ) {
				this.editor.innerHTML = content;
			}
		}

	}

	const editor = new SpiceEditor(document.querySelector('#editor'));

	// Handle messages from the extension
	window.addEventListener('message', async e => {
		const { type, body, requestId } = e.data;
		switch (type) {
			case 'init':
				{
					editor.setReadOnly(body.value);
					return;
				}
			case 'update':
				{
					console.log(e)
					return;
				}
			case 'getFileData':
				{
					return;
				}
		}
	});

	// Signal to VS Code that the webview is initialized.
	vscode.postMessage({ type: 'ready' });
}());