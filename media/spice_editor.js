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
			this.__showResume('Analyzed with HTMLDiff');
		}

		showDifferencesMethod2() {

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
			  const resume = `Analyzed with DiffJs: Added ${added} Removed ${removed}`;
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
			this.lastSaved = '';

			this.commntEditor = commntEditor;
			this.commntEditor.addEventListener('keyup', () => {
				this.checkModified();
			})
			this.briefEditor = briefEditor;
			this.diffDiv = diffEditor;
			this.diffSection = document.querySelector('#diffSection')

			this.diffEditor =  new DiffEditor(this.diffDiv, this.commntEditor);

			this._initElements();
		}

		_initElements() {
			this.saveButton = document.querySelector('#save');
			// @ts-ignore
			this.saveButton?.addEventListener('click', () => this.doSave());

			this.briefButton = document.querySelector('#brief');
			// @ts-ignore
			this.briefButton?.addEventListener('click', () => this.setBriefMode());

			this.commntButton = document.querySelector('#commnt');
			// @ts-ignore
			this.commntButton?.addEventListener('click', () => this.setCommentMode());
			
			this.diffButton = document.querySelector('#diff');
			// @ts-ignore
			this.diffButton?.addEventListener('click', () => this.doDiff());
			
			this.resetButton = document.querySelector('#reset');
			// @ts-ignore
			this.resetButton?.addEventListener('click', () => this.doReset());
		}

		setCommnt(/** @type {string} */ content) {
			if (this.commntEditor != null ) {
				this.commntEditor.innerHTML = content;
			}
			this.diffEditor.setOriginal(content);
			this.lastSaved = content;
		}

		setBrief(/** @type {string} */ content) {
			if (this.briefEditor != null ) {
				this.briefEditor.innerHTML = content;
			}
		}

		setBriefMode() {
			this.setVisible(this.briefEditor, true);
			this.setVisible(this.commntButton, true);

			this.setVisible(this.commntEditor, false);
			this.setVisible(this.diffSection, false);
			this.setVisible(this.saveButton, false);
			this.setVisible(this.briefButton, false);
			this.setVisible(this.diffButton, false);
			this.setVisible(this.resetButton, false);
		}

		setCommentMode() {
			
			this.setVisible(this.commntEditor, true);
			this.setVisible(this.briefButton, true);

			this.setVisible(this.briefEditor, false);
			this.setVisible(this.diffSection, false);
			this.setVisible(this.saveButton, false);
			this.setVisible(this.commntButton, false);

			this.checkModified();
		}

		setDiffMode() {

			this.setVisible(this.briefEditor, false);
			this.setVisible(this.commntEditor, false);
			this.setVisible(this.diffSection, true);
			this.setVisible(this.saveButton, true);
			this.setVisible(this.briefButton, false);
			this.setVisible(this.commntButton, true);
			this.setVisible(this.diffButton, false);
			this.setVisible(this.resetButton, false);
			
		}

		setVisible(element, visible) {
			const displayMode = visible ? 'block' : 'none';
			if (element != null ) {
				element.style.display = displayMode;
			}
		}

		checkModified() {
			const modified = this.commntEditor.innerText !== this.lastSaved;
			this.setVisible(this.diffButton, modified);
			this.setVisible(this.resetButton, modified);
		}

		doReset() {
			if (this.commntEditor) {
				this.commntEditor.innerText = this.lastSaved;
			}
			this.checkModified();
		}

		doDiff() {
			this.setDiffMode();
			this.diffEditor.showDifferencesMethod2();
		}

		doSave() {
			const editorContent = this.commntEditor?.innerText;
			vscode.postMessage(
				{ type: 'update-comment',
				  body: {
					value: editorContent
				  }
				}
			);
			this.lastSaved = editorContent;
			this.diffEditor.setOriginal(editorContent);
			this.setCommentMode();
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