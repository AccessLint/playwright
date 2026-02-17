import type { AccessibleMatcherOptions } from "./dist/matchers";

declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      toBeAccessible(options?: AccessibleMatcherOptions): Promise<R>;
    }
  }
}
