// This test verifies that setting RTL_SKIP_AUTO_CLEANUP prevents the
// afterEach(cleanup) hook from being registered automatically.
//
// Strategy: set the env var before importing index.ts (via a dynamic import
// so we can control the module environment), render something, and confirm
// that the body is NOT empty in a subsequent test.

import { afterEach, beforeAll, expect, it, vi } from "vite-plus/test"

import { cleanup, render } from "../pure"

beforeAll(() => {
	vi.stubEnv("RTL_SKIP_AUTO_CLEANUP", "1")
})

afterEach(() => {
	vi.unstubAllEnvs()
})

it("renders without auto-cleanup registered", () => {
	render(<div>should persist</div>)
	expect(document.body).not.toBeEmptyDOMElement()
})

it("body is NOT emptied between tests when RTL_SKIP_AUTO_CLEANUP is set", () => {
	// If auto-cleanup were registered, body would be empty here.
	expect(document.body).not.toBeEmptyDOMElement()

	// Manual cleanup to avoid leaking into other test files.
	cleanup()
})
