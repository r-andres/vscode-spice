import {existsSync, writeFileSync, 
	    mkdtempSync, rmSync, 
		readdirSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import * as cp from 'child_process';


const SPICE_NOT_CONFIGURED_MESSAGE = `
SPICE Viewer not configured!                            
========================================================
Please, ensure to setup properly the SPICE utility path.
                                                        
Vscode-spice: Spice Utilities Path                      
Path to the folder containing the SPICE utilities.      
                                                        
Get commnt from:                                        
https://naif.jpl.nasa.gov/naif/utilities.html           
`;

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


export async function getSpiceComment(bspPath: string): Promise<string> {

	
		const utilitySPICEPath = getSPICEUtilityPath();
		console.log(`Utility path: ${utilitySPICEPath}`);
		let content = '';

		if (!existsSync(utilitySPICEPath + '/commnt')) {
			content = SPICE_NOT_CONFIGURED_MESSAGE;
		} else {

			const tmpDir = mkdtempSync(path.join(tmpdir(), 'commnt'));
			const tmpPath = path.join(tmpDir, 'commnt.txt'); 

			const commandLine = './commnt -e ' + bspPath + ' ' + tmpPath;
			console.log(`Exec-> ${commandLine}`);
			try {
				const { stdout, stderr } = await exec(commandLine, { 
					cwd: utilitySPICEPath
				});
				
				// We retrieve the file content
				const buffer = await readFileSync(tmpPath)
				content = buffer.toString();

			} catch (err: any) {
				content = 'commnt cannot be executed'
			}

			if (tmpDir) {
				rmSync(tmpDir, { recursive: true });
			}

		}
		return content;
	
}



export async function saveSpiceComment(binaryPath: string, content: string): Promise<boolean> {

	
	const utilitySPICEPath = getSPICEUtilityPath();
	let success = false;
	if (existsSync(path.join(utilitySPICEPath, 'commnt'))) {

		const tmpDir = mkdtempSync(path.join(tmpdir(), 'commnt'));
		const tmpPath = path.join(tmpDir, 'commnt.txt'); 
		
		await writeFileSync(tmpPath, content)
		
		const removeComment = './commnt -d ' + binaryPath;
		try {
			const { stdout, stderr } = await exec(removeComment, { 
				cwd: utilitySPICEPath
			});
		} catch (err: any) {
			return false;
		}

		const commandLine = './commnt -a ' + binaryPath + ' ' + tmpPath;
		try {
			const { stdout, stderr } = await exec(commandLine, { 
				cwd: utilitySPICEPath
			});
			success = true;
		} catch (err: any) {
			return false;
		}

		if (tmpDir) {
			rmSync(tmpDir, { recursive: true });
		}
	}
	return success;

}

export async function getSpiceInfo(path: string): Promise<string> {
	if (path.toLowerCase().endsWith('.bsp')
		|| path.toLowerCase().endsWith('.bpc')) {
		return getSpiceBrief(path);
	} else if (path.toLowerCase().endsWith('.bds')) {
		return getSpiceDskBrief(path);
	} else if (path.toLowerCase().endsWith('.bc')) {
		return getSpiceCkBrief(path);
	} 
	return new Promise<string>((resolve, reject) => {
		resolve('Extension not supported');
	  });
}


export async function getSpiceBrief(bspPath: string): Promise<string> {

	const utilitySPICEPath = getSPICEUtilityPath();
	console.log(`Utility path: ${utilitySPICEPath}`);
	let content = '';

	if (!existsSync(utilitySPICEPath + '/brief')) {
		content = SPICE_NOT_CONFIGURED_MESSAGE;
	} else {


		const commandLine = './brief ' + bspPath ;
		console.log(`Exec-> ${commandLine}`);
		try {
			const { stdout, stderr } = await exec(commandLine, { 
				cwd: utilitySPICEPath
			});
			content = stdout;
		} catch (err: any) {
			content = 'commnt cannot be executed'
		}
	}
	return content;

}

export async function getSpiceDskBrief(bspPath: string): Promise<string> {

	const utilitySPICEPath = getSPICEUtilityPath();
	console.log(`Utility path: ${utilitySPICEPath}`);
	let content = '';

	if (!existsSync(utilitySPICEPath + '/dskbrief')) {
		content = SPICE_NOT_CONFIGURED_MESSAGE;
	} else {


		const commandLine = './dskbrief -full ' + bspPath ;
		console.log(`Exec-> ${commandLine}`);
		try {
			const { stdout, stderr } = await exec(commandLine, { 
				cwd: utilitySPICEPath
			});
			content = stdout;
		} catch (err: any) {
			content = 'commnt cannot be executed'
		}
	}
	return content;

}

export async function getSpiceCkBrief(filePath: string): Promise<string> {

	const utilitySPICEPath = getSPICEUtilityPath();
	console.log(`Utility path: ${utilitySPICEPath}`);
	let content = '';


	const lskFile = search_latest(filePath, 'lsk', 'naif.*tls')
	const sclkFile = search_latest(filePath, 'sclk', '.*tsc')


	if (!existsSync(utilitySPICEPath + '/ckbrief')) {
		content = SPICE_NOT_CONFIGURED_MESSAGE;
	} else {
		const commandLine = `./ckbrief ${filePath} ${lskFile} ${sclkFile}`;
		console.log(`Exec-> ${commandLine}`);
		try {
			const { stdout, stderr } = await exec(commandLine, { 
				cwd: utilitySPICEPath
			});
			content = stdout;
		} catch (err: any) {
			content = 'commnt cannot be executed'
		}
	}
	return content;

}


async function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		cp.exec(command, options, (error, stdout, stderr) => {
			if (error) {
				reject({ error, stdout, stderr });
			}
			resolve({ stdout, stderr });
		});
	});
}

function search_latest(filePath: string, folder: string, pattern: string): string {

	const parentPath = path.resolve(path.dirname(filePath), '..');
	const root = path.join(parentPath, folder);

	if (!existsSync(root)) {
		console.log( root + ' DOES NOT EXIST')
		return '';
	}

	let candidate = ''
	readdirSync(root).forEach(file => {
		if (file.match(pattern)) {

			candidate = path.join(root, file);
		}
		console.log(file)
	});
    console.log(' Not lsk candidate for ' + pattern)
	return candidate;
}