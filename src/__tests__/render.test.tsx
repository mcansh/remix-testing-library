import type { RemixNode } from "@remix-run/component"
import { screen } from "@testing-library/dom"
import { afterEach, expect, it, vi } from "vite-plus/test"

import { cleanup, render } from "../pure.ts"

afterEach(cleanup)

it("renders the UI", () => {
	render(<div>Hello world</div>)
	screen.getByText("Hello world")
})

it("returns baseElement which defaults to document.body", () => {
	const { baseElement } = render(<div />)
	expect(baseElement).toBe(document.body)
})

it("can manually dispose the rendered UI", () => {
	const { container, dispose } = render(<div>Hello world</div>)
	screen.getByText("Hello world")
	dispose()
	expect(container).toBeEmptyDOMElement()
})

it("supports fragments", () => {
	function TestComponent() {
		return () => {
			return (
				<div>
					<code>DocumentFragment</code> is pretty cool!
				</div>
			)
		}
	}

	const { asFragment } = render(<TestComponent />)
	expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <code>
            DocumentFragment
          </code>
           is pretty cool!
        </div>
      </DocumentFragment>
    `)
})

it("can be called multiple times on the same container", () => {
	const container = document.createElement("div")

	const { dispose } = render(<strong />, { container })

	expect(container).toContainHTML("<strong></strong>")

	render(<em />, { container })

	expect(container).toContainHTML("<em></em>")

	dispose()

	expect(container).toBeEmptyDOMElement()
})

it("renders options.wrapper around node", () => {
	function WrapperComponent() {
		return ({ children }: { children: RemixNode }) => <div data-testid="wrapper">{children}</div>
	}

	const { container } = render(<div data-testid="inner" />, { wrapper: WrapperComponent })

	expect(screen.getByTestId("wrapper")).toBeInTheDocument()
	expect(container.firstChild).toMatchInlineSnapshot(`
    <div
      data-testid="wrapper"
    >
      <div
        data-testid="inner"
      />
    </div>
  `)
})

it("renders with a custom baseElement", () => {
	const baseElement = document.createElement("div")
	document.body.appendChild(baseElement)

	const { baseElement: returnedBaseElement } = render(<span>custom base</span>, { baseElement })

	expect(returnedBaseElement).toBe(baseElement)
	expect(returnedBaseElement).toContainElement(screen.getByText("custom base"))
})

it("debug() logs a single element", () => {
	const spy = vi.spyOn(console, "log").mockImplementation(() => {})
	const { debug, baseElement } = render(<div>debug me</div>)

	debug(baseElement)

	expect(spy).toHaveBeenCalledOnce()
	spy.mockRestore()
})

it("debug() accepts an array of elements and logs each one", () => {
	const spy = vi.spyOn(console, "log").mockImplementation(() => {})
	const { debug, container } = render(
		<div>
			<p id="a">a</p>
			<p id="b">b</p>
		</div>,
	)

	const a = container.querySelector<HTMLElement>("#a")
	const b = container.querySelector<HTMLElement>("#b")

	// Pass an array to exercise the `Array.isArray(el)` branch in debug()
	debug([a, b])

	expect(spy).toHaveBeenCalledTimes(2)
	spy.mockRestore()
})

it("asFragment() falls back to <template> when document.createRange is unavailable", () => {
	const original = document.createRange
	// @ts-expect-error – intentionally removing to trigger the fallback branch
	document.createRange = undefined

	const { asFragment } = render(<div>fallback</div>)
	const fragment = asFragment()

	expect(fragment).toBeInstanceOf(DocumentFragment)
	expect(fragment.querySelector("div")?.textContent).toBe("fallback")

	document.createRange = original
})

it("cleanup() skips removeChild when container is not a direct body child", () => {
	const outer = document.createElement("section")
	document.body.appendChild(outer)
	const container = document.createElement("div")
	outer.appendChild(container)

	render(<p>detached</p>, { container })

	// container is a grandchild of body, not a direct child —
	// cleanup() should not throw and the container should survive
	expect(() => cleanup()).not.toThrow()

	// container was not removed because it is not a direct body child
	expect(outer.contains(container)).toBe(true)

	// manual teardown
	document.body.removeChild(outer)
})
