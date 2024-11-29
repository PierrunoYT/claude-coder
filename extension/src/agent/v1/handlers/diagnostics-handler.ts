import * as vscode from "vscode"
import * as path from "path"
import { getCwd } from "../utils"

export class DiagnosticsHandler {
	private static instance: DiagnosticsHandler

	private constructor() {
		// Private constructor to prevent direct instantiation
	}

	public static getInstance(): DiagnosticsHandler {
		if (!DiagnosticsHandler.instance) {
			DiagnosticsHandler.instance = new DiagnosticsHandler()
		}
		return DiagnosticsHandler.instance
	}

	public getDiagnostics(paths: string[]): { key: string; errorString: string | null, quickFixes: string[] }[] {
		const results: { key: string; errorString: string | null, quickFixes: string[] }[] = []

		for (const filePath of paths) {
			const uri = vscode.Uri.file(path.resolve(getCwd(), filePath))
			const diagnostics = vscode.languages.getDiagnostics(uri)
			const errors = diagnostics.filter((diag) => diag.severity === vscode.DiagnosticSeverity.Error)

			let errorString: string | null = null
			let quickFixes: string[] = []

			if (errors.length > 0) {
				errorString = this.formatDiagnostics(uri, errors)
				quickFixes = this.getQuickFixSuggestions(uri, errors)
			}

			results.push({ key: filePath, errorString, quickFixes })
		}

		return results
	}

	private formatDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): string {
		const relativePath = vscode.workspace.asRelativePath(uri.fsPath).replace(/\\/g, "/")
		let result = `Errors in ${relativePath}:\n`

		for (const diagnostic of diagnostics) {
			const line = diagnostic.range.start.line + 1 // VSCode lines are 0-indexed
			const message = diagnostic.message
			result += `- Line ${line}: ${message}\n`
		}

		return result.trim()
	}

	private getQuickFixSuggestions(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): string[] {
		const quickFixes: string[] = []

		for (const diagnostic of diagnostics) {
			const codeActions = vscode.commands.executeCommand<vscode.CodeAction[]>(
				"vscode.executeCodeActionProvider",
				uri,
				diagnostic.range
			)

			if (codeActions) {
				for (const action of codeActions) {
					if (action.kind && action.kind.contains(vscode.CodeActionKind.QuickFix)) {
						quickFixes.push(action.title)
					}
				}
			}
		}

		return quickFixes
	}
}
