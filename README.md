# Remix Testing Library

a small wrapper around DOM Testing Library for use with Remix v3

## Installation

```sh
npm install --save-dev @mcansh/remix-testing-library
```

```sh
pnpm add --save-dev @mcansh/remix-testing-library
```

```sh
yarn add --dev @mcansh/remix-testing-library
```

You will also need a DOM environment for your test runner. For example, with [Vitest](https://vitest.dev/) and [happy-dom](https://github.com/capricorn86/happy-dom):

```sh
npm install --save-dev vitest happy-dom
```

```js
// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true, // required for auto-cleanup after each test
  },
});
```

## Usage

### Basic render

```tsx
import { render, screen } from "@mcansh/remix-testing-library";

it("renders a greeting", () => {
  function Greeting() {
    return (props: { name: string }) => <p>Hello, {props.name}!</p>;
  }

  render(<Greeting name="world" />);

  screen.getByText("Hello, world!");
});
```

### Rerendering

```tsx
import { render, screen } from "@mcansh/remix-testing-library";

it("updates when rerendered with new props", () => {
  function Greeting() {
    return (props: { message: string }) => <div>{props.message}</div>;
  }

  const { rerender } = render(<Greeting message="hi" />);
  screen.getByText("hi");

  rerender(<Greeting message="hey" />);
  screen.getByText("hey");
});
```

### Interactive components

> **Note:** The interactive example below uses [`@testing-library/user-event`](https://testing-library.com/docs/user-event/intro), which must be installed separately:
> ```sh
> npm install --save-dev @testing-library/user-event
> ```

```tsx
import { on, pressEvents, type Handle } from "@remix-run/component";
import { userEvent } from "@testing-library/user-event";
import { render, screen } from "@mcansh/remix-testing-library";

it("increments a counter on click", async () => {
  let user = userEvent.setup();

  function Counter(handle: Handle) {
    let count = 0;
    return () => (
      <button
        mix={[
          pressEvents(),
          on(pressEvents.press, async () => {
            count += 1;
            await handle.update();
          }),
        ]}
      >
        Clicked {count} time{count === 1 ? "" : "s"}
      </button>
    );
  }

  render(<Counter />);

  const button = screen.getByRole("button");
  expect(button.textContent).toBe("Clicked 0 times");

  await user.click(button);

  expect(button.textContent).toBe("Clicked 1 time");
});
```

## API

### `render(ui, options?)`

Renders a Remix component into a container appended to `document.body` and returns an object with:

| Property | Description |
| --- | --- |
| `container` | The `div` element the component was rendered into |
| `baseElement` | `document.body` (or the custom `baseElement` option if provided) |
| `debug(el?, maxLength?, options?)` | Logs a pretty-printed DOM snapshot to the console |
| `rerender(ui)` | Re-renders the component with new props |
| `dispose()` | Unmounts the component |
| `asFragment()` | Returns a `DocumentFragment` snapshot of the current DOM |
| `...queries` | All [DOM Testing Library queries](https://testing-library.com/docs/queries/about) bound to `baseElement` |

**Options:**

| Option | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Custom container element (defaults to a new `div` appended to `baseElement`) |
| `baseElement` | `HTMLElement` | Custom base element for queries (defaults to `document.body`) |
| `wrapper` | component | Wraps the rendered UI with the given component |
| `queries` | `Queries` | Custom queries to bind to `baseElement` (defaults to all `@testing-library/dom` queries) |
| `virtualRootOptions` | `VirtualRootOptions` | Options forwarded to `createRoot` from `@remix-run/component` |

### `cleanup()`

Unmounts all components rendered with `render` and removes their containers from `document.body`. This is called automatically after each test only when a *global* `afterEach` or `teardown` function is available on `globalThis`. Jest provides this by default; in Vitest, you must enable `test.globals: true` in your Vitest config — simply importing `afterEach` in a test file is not sufficient. Import from `@mcansh/remix-testing-library/pure` to opt out of auto-cleanup.

### Pure imports (no auto-cleanup)

If you prefer to manage cleanup yourself, import from the `pure` entry point:

```ts
import { render, cleanup } from "@mcansh/remix-testing-library/pure";
```

You can also disable auto-cleanup globally by setting the `RTL_SKIP_AUTO_CLEANUP` environment variable to `"true"`.

## Re-exports

`@mcansh/remix-testing-library` re-exports everything from [`@testing-library/dom`](https://testing-library.com/docs/dom-testing-library/intro), including all queries (e.g. `screen`, `getByText`, `findByRole`) and utilities (e.g. `waitFor`, `fireEvent`).
