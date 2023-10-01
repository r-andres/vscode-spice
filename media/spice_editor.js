// @ts-ignore
import {config} from 'diff';
import {htmlDiff} from 'htmldiff-js';


const Diff_HtmlDiff = htmlDiff[0].exports.default;



const JsDiff = config['JsDiff'];

// This script is run within the webview itself
(function () {

	

	// @ts-ignore
	const vscode = acquireVsCodeApi();

	
	class DiffEditor {

		constructor(diffEditor, commntEditor) {
			this.original = ''
			this.commntEditor = commntEditor,
			this.display = diffEditor;
		}

		setOriginal(original) {
			this.original = original;
		}
		setEdited(edited) {
			this.edited = edited;
		}

		__cleanUp() {
			if (this.display) {
				this.display.innerHTML = '';
			}
		}
		__appendPart(text, color) {
			const span = document.createElement('span');
				span.style.color = color;
				span.appendChild(document
				  .createTextNode(text));
			if (this.display) {
				this.display.appendChild(span);
			}
		}

		showDifferences () {
			const edited = this.commntEditor?.innerText;
			const diffs = new Diff_HtmlDiff(this.original, edited).build();
			this.display.innerHTML = diffs;
		}

		showDifferencesOld() {

			this.__cleanUp();
			
			const edited = this.commntEditor?.innerText;

			// @ts-ignore
			
			const diff = JsDiff.diffWordsWithSpace(this.original, edited);

			let added = 0;
			let removed = 0;
			diff.forEach((part) => {
				added += part.added ? 1 : 0;
				removed += part.removed ? 1 : 0;
				// green for additions, red for deletions
				// grey for common parts
				const color = part.added ? 'green' :
				  part.removed ? 'red' : 'grey';
				this.__appendPart(part.value, color);
			  });
			  const resume = ` Added ${added} Removed ${removed}`;
			  this.__showResume(resume);
		}

		__showResume(resume) {
			const resumeSpan = document.querySelector('#diffResume');
			resumeSpan.innerHTML = resume;
		}
	}


	class SpiceEditor {
		constructor( 
			/** @type {HTMLElement | null} */ commntEditor,
			/** @type {HTMLElement | null} */ briefEditor,
			/** @type {HTMLElement | null} */ diffEditor
		) {
			this.ready = false;

			this.editable = false;

			this.commntEditor = commntEditor;
			this.briefEditor = briefEditor;
			this.diffDiv = diffEditor;
			this.diffSection = document.querySelector('#diffSection')

			this.diffEditor =  new DiffEditor(this.diffDiv, this.commntEditor);

			this._initElements();
		}

		_initElements() {
			this.saveButton = document.querySelector('#save');
			// @ts-ignore
			this.saveButton?.addEventListener('click', (e) => {
				const newCommnt = this.commntEditor?.innerText;
				vscode.postMessage(
					{ type: 'update-comment',
					  body: {
						value: this.commntEditor?.innerText
					  }
					}
				);
				this.diffEditor.setOriginal(newCommnt);
				this.setCommentMode();
			});

			this.briefButton = document.querySelector('#brief');
			// @ts-ignore
			this.briefButton?.addEventListener('click', (e) => {
				this.setBriefMode();
			});

			this.commntButton = document.querySelector('#commnt');
			// @ts-ignore
			this.commntButton?.addEventListener('click', (e) => {
				this.setCommentMode();
			});
			
			this.diffButton = document.querySelector('#diff');
			// @ts-ignore
			this.diffButton?.addEventListener('click', (e) => {
				this.setDiffMode();
				this.diffEditor.showDifferences();
			});
		}

		setCommnt(/** @type {string} */ content) {
			if (this.commntEditor != null ) {
				this.commntEditor.innerHTML = content;
			}
			this.diffEditor.setOriginal(content);
		}

		setBrief(/** @type {string} */ content) {
			if (this.briefEditor != null ) {
				this.briefEditor.innerHTML = content;
			}
		}

		setBriefMode() {
			this.setVisibility(this.briefEditor, 'block');
			this.setVisibility(this.commntEditor, 'none');
			this.setVisibility(this.diffSection, 'none');
			this.setVisibility(this.saveButton, 'none');
			this.setVisibility(this.briefButton, 'none');
			this.setVisibility(this.commntButton, 'block');
			this.setVisibility(this.diffButton, 'none');
		}

		setCommentMode() {
			this.setVisibility(this.briefEditor, 'none');
			this.setVisibility(this.commntEditor, 'block');
			this.setVisibility(this.diffSection, 'none');
			this.setVisibility(this.saveButton, 'none');
			this.setVisibility(this.briefButton, 'block');
			this.setVisibility(this.commntButton, 'none');
			this.setVisibility(this.diffButton, 'block');
		}

		setDiffMode() {
			this.setVisibility(this.briefEditor, 'none');
			this.setVisibility(this.commntEditor, 'none');
			this.setVisibility(this.diffSection, 'block');
			this.setVisibility(this.saveButton, 'block');
			this.setVisibility(this.briefButton, 'none');
			this.setVisibility(this.commntButton, 'block');
			this.setVisibility(this.diffButton, 'none');
			
		}

		setVisibility(element, visibility) {
			if (element != null ) {
				element.style.display = visibility;
			}
		}
	}

	const editor = new SpiceEditor(
		document.querySelector('#editor'), 
		document.querySelector('#briefEditor'),
		document.querySelector('#diffEditor'));
	

	// Handle messages from the extension
	window.addEventListener('message', async e => {
		// @ts-ignore
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