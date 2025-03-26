import vscode from 'vscode';

interface Headers {
	headers: string[],
	startIndex: number,
	endIndex: number,
}

interface ParsedHeaders {
	system: string[],
	user: string[],
};

const includeDetected = (lines: string[], index: number) => {
	for (let i = index; i < lines.length; i++) {
		if (lines[i].includes("#include")) {
			return true;
		}
	}
	return false;
};

const getHeaders = (lines: string[]): Headers => {
	let startIndex = -1;
	let endIndex = -1;

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes("#include")) {
			if (startIndex === -1) {
				startIndex = i;
			}
			endIndex = i;
		} else {
			if (!includeDetected(lines, i)) {
				break;
			}
		}
	}

	return { headers: lines.slice(startIndex, endIndex + 1), startIndex, endIndex };
};

const parseHeaders = (includeBlock: string[]): ParsedHeaders => {
	let system: string[] = [];
	let user: string[] = [];

	includeBlock.map((line) => {
		if (line.includes("<")) {
			system.push(line);
		} else if (line.length > 0) {
			user.push(line);
		}
	});
	return { system: system.sort(), user: user.sort() };
};

const getIncludeBlock = (parsedHeaders: ParsedHeaders): string[] => {
	let headerBlock: string[] = [];

	if (parsedHeaders.system.length > 0) {
		headerBlock.push(...parsedHeaders.system);
	}
	if (parsedHeaders.system.length > 0 && parsedHeaders.user.length > 0) {
		headerBlock.push("");
	}
	if (parsedHeaders.user.length > 0) {
		headerBlock.push(...parsedHeaders.user);
	}
	return headerBlock;
};

const sortHeaders = () => {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const document = editor.document;
	const text = document.getText();
	const lines = text.split('\n');

	const includes = getHeaders(lines);
	if (includes.startIndex === -1 || includes.endIndex === -1) {
		return;
	}

	const parsedHeaders = parseHeaders(includes.headers);
	const includesBlock = getIncludeBlock(parsedHeaders);

	const newLines = [
		...lines.slice(0, includes.startIndex),
		...includesBlock,
		...lines.slice(includes.endIndex + 1),
	].join('\n');

	editor.edit(editBuilder => {
		const fullRange = new vscode.Range(
			document.positionAt(0),
			document.positionAt(text.length)
		);
		editBuilder.replace(fullRange, newLines);
	});
};

export const activate = (context: vscode.ExtensionContext) => {
	const disposable = vscode.commands.registerCommand('extension.sortHeaders', sortHeaders);
	context.subscriptions.push(disposable);

    context.subscriptions.push(vscode.commands.registerCommand('extension.sortHeadersShortcut', sortHeaders));

    vscode.commands.executeCommand('setContext', 'extension.sortHeadersShortcut', true);

	vscode.workspace.onWillSaveTextDocument(event => {
		if (["c", "cpp"].includes(event.document.languageId)) {
			sortHeaders();
		}
	});
};

export function deactivate() {}
