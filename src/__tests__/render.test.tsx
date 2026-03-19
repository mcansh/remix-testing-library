import { screen } from "@testing-library/dom";
import { afterEach, expect, it } from "vitest";

import { cleanup, render } from "../pure.ts";

afterEach(cleanup);

it("renders the UI", () => {
  render(<div>Hello world</div>);
  screen.getByText("Hello world");
});

it("returns baseElement which defaults to document.body", () => {
  const { baseElement } = render(<div />);
  expect(baseElement).toBe(document.body);
});
