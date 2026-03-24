import * as cp from "node:child_process"

export function logAndExec(command: string, captureOutput = false): string {
	console.log(`$ ${command}`)
	if (captureOutput) {
		return cp.execSync(command, { stdio: "pipe", encoding: "utf-8" }).trim()
	} else {
		cp.execSync(command, { stdio: "inherit" })
		return ""
	}
}
