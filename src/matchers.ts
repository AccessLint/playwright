/**
 * Custom Playwright matcher for accessibility assertions.
 *
 * Pure export — no side effects. Import from "@accesslint/playwright/matchers"
 * when you want to register manually with expect.extend().
 *
 * For auto-registration, import "@accesslint/playwright" instead.
 */
import type { Page, Locator } from "@playwright/test";
import { accesslintAudit, formatViolation } from "./audit";
import type { AccessibleMatcherOptions } from "./audit";

export type { AccessibleMatcherOptions } from "./audit";

export async function toBeAccessible(
  target: Page | Locator,
  options?: AccessibleMatcherOptions,
) {
  const result = await accesslintAudit(target, options);
  const pass = result.violations.length === 0;

  return {
    pass,
    name: "toBeAccessible",
    message: () => {
      if (pass) {
        return "Expected accessibility violations, but none were found";
      }
      const summary = result.violations.map(formatViolation).join("\n\n");
      return (
        `Expected no accessibility violations, ` +
        `but found ${result.violations.length}:\n\n${summary}`
      );
    },
  };
}

export const accesslintMatchers = { toBeAccessible };
