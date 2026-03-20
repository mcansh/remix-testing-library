import * as matchers from "@testing-library/jest-dom/matchers"
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"
import { expect } from "vite-plus/test"

expect.extend(matchers)

declare module "vite-plus/test" {
	interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
	interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
}
