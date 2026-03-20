import { expect, it } from "vite-plus/test"

import { render } from ".."

// This just verifies that by importing RTL in an
// environment which supports afterEach (like Vitest)
// we'll get automatic cleanup between tests.
it("first", () => {
	render(<div>hi</div>)
})

it("second", () => {
	expect(document.body).toBeEmptyDOMElement()
})
