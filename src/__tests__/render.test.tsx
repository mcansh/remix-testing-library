import { screen } from "@testing-library/dom";
import { afterEach, expect, it } from "vitest";
import type { RemixNode } from "@remix-run/component";

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

it("can manually dispose the rendered UI", () => {
  const { container, dispose } = render(<div>Hello world</div>);
  screen.getByText("Hello world");
  dispose();
  expect(container).toBeEmptyDOMElement();
});

it("supports fragments", () => {
  function TestComponent() {
    return () => {
      return (
        <div>
          <code>DocumentFragment</code> is pretty cool!
        </div>
      );
    };
  }

  const { asFragment } = render(<TestComponent />);
  expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <code>
            DocumentFragment
          </code>
           is pretty cool!
        </div>
      </DocumentFragment>
    `);
});

it("can be called multiple times on the same container", () => {
  const container = document.createElement("div");

  const { dispose } = render(<strong />, { container });

  expect(container).toContainHTML("<strong></strong>");

  render(<em />, { container });

  expect(container).toContainHTML("<em></em>");

  dispose();

  expect(container).toBeEmptyDOMElement();
});

it("renders options.wrapper around node", () => {
  function WrapperComponent() {
    return ({ children }: { children: RemixNode }) => <div data-testid="wrapper">{children}</div>;
  }

  const { container } = render(<div data-testid="inner" />, { wrapper: WrapperComponent });

  expect(screen.getByTestId("wrapper")).toBeInTheDocument();
  expect(container.firstChild).toMatchInlineSnapshot(`
    <div
      data-testid="wrapper"
    >
      <div
        data-testid="inner"
      />
    </div>
  `);
});
