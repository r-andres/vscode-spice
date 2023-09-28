// @ts-check

// This script is run within the webview itself
(function () {
	// @ts-ignore
	const vscode = acquireVsCodeApi();

	

	class SpiceEditor {
		constructor( /** @type {HTMLElement | null} */ commntEditor,
		/** @type {HTMLElement | null} */ briefEditor,) {
			this.ready = false;

			this.editable = false;

			this.commntEditor = commntEditor;
			this.briefEditor = briefEditor;

			this._initElements();
		}

		_initElements() {
			this.saveButton = document.querySelector('#save');
			this.saveButton?.addEventListener('click', (e) => {
				vscode.postMessage(
					{ type: 'update-comment',
					  body: {
						value: this.commntEditor?.innerText
					  }
					}
				)
			});

			this.briefButton = document.querySelector('#brief');
			this.briefButton?.addEventListener('click', (e) => {
				this.setBriefMode();
			});

			this.commntButton = document.querySelector('#commnt');
			this.commntButton?.addEventListener('click', (e) => {
				this.setCommentMode();
			});
			
		}

		setCommnt(/** @type {string} */ content) {
			if (this.commntEditor != null ) {
				this.commntEditor.innerHTML = content;
			}
		}

		setBrief(/** @type {string} */ content) {
			if (this.briefEditor != null ) {
				this.briefEditor.innerHTML = content;
			}
		}

		setBriefMode() {
			this.setVisibility(this.briefEditor, 'block');
			this.setVisibility(this.commntEditor, 'none');
			this.setVisibility(this.saveButton, 'none');
			this.setVisibility(this.briefButton, 'none');
			this.setVisibility(this.commntButton, 'block');

			
		}

		setCommentMode() {
			this.setVisibility(this.briefEditor, 'none');
			this.setVisibility(this.commntEditor, 'block');
			this.setVisibility(this.saveButton, 'block');
			this.setVisibility(this.briefButton, 'block');
			this.setVisibility(this.commntButton, 'none');
		}

		setVisibility(element, visibility) {
			if (element != null ) {
				element.style.display = visibility;
			}
		}
	}

	const editor = new SpiceEditor(document.querySelector('#editor'), document.querySelector('#briefEditor'));

	// Handle messages from the extension
	window.addEventListener('message', async e => {
		const { type, body, requestId } = e.data;
		switch (type) {
			case 'init':
				{
					editor.setCommnt(body.commnt);
					editor.setBrief(body.brief);
					editor.setCommentMode();
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