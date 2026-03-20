import type { Handle } from "@remix-run/component"
import { on, pressEvents } from "@remix-run/component"
import { userEvent } from "@testing-library/user-event"
import { expect, it } from "vite-plus/test"

import { render, screen } from "../pure.ts"

it("rerender will re-render the element", () => {
	function Greeting() {
		return (props: { message: string }) => <div>{props.message}</div>
	}

	const { container, rerender } = render(<Greeting message="hi" />)

	expect(container.firstChild).toHaveTextContent("hi")

	rerender(<Greeting message="hey" />)

	expect(container.firstChild).toHaveTextContent("hey")
})

it("re-renders when handle.update is called", async () => {
	let user = userEvent.setup()

	function Button(handle: Handle) {
		let count = 0
		return () => {
			return (
				<button
					mix={[
						pressEvents(),
						on(pressEvents.press, async () => {
							count += 1
							await handle.update()
						}),
					]}
				>
					Clicked {count} time{count === 1 ? "" : "s"}
				</button>
			)
		}
	}

	render(<Button />)

	const button = screen.getByRole("button")
	expect(button.textContent).toBe("Clicked 0 times")

	await user.click(button)

	expect(button.textContent).toBe("Clicked 1 time")
})
