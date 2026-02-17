/**
 * Auto-registers the toBeAccessible() matcher with Playwright's expect.
 *
 * Usage in a test file:
 *   import "@accesslint/playwright";
 *   await expect(page).toBeAccessible();
 */
import { expect } from "@playwright/test";
import { accesslintMatchers } from "./matchers";
import type { AccessibleMatcherOptions } from "./audit";

expect.extend(accesslintMatchers);

export { accesslintAudit, formatViolation } from "./audit";
export type { AccessibleMatcherOptions, AuditResult, AuditViolation } from "./audit";
export { accesslintMatchers, toBeAccessible } from "./matchers";

declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      toBeAccessible(options?: AccessibleMatcherOptions): Promise<R>;
    }
  }
}
