import { expect, it } from "vitest";

import { render } from "..";

// This just verifies that by importing RTL in an
// environment which supports afterEach (like jest)
// we'll get automatic cleanup between tests.
it("first", () => {
  render(<div>hi</div>);
});

it("second", () => {
  expect(document.body).toBeEmptyDOMElement();
});
