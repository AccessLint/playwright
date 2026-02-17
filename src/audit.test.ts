import { test, expect } from "@playwright/test";
import { accesslintAudit } from "./index";

const ACCESSIBLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Accessible Page</title></head>
<body>
  <main>
    <h1>Hello World</h1>
    <p>This page is accessible.</p>
  </main>
</body>
</html>`;

const INACCESSIBLE_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Inaccessible Page</title></head>
<body>
  <main>
    <img src="test.png">
    <h1>Hello World</h1>
  </main>
</body>
</html>`;

const SCOPED_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Scoped Test</title></head>
<body>
  <main>
    <div id="good">
      <h2>Good Section</h2>
      <p>All accessible here.</p>
    </div>
    <div id="bad">
      <img src="bad.png">
    </div>
  </main>
</body>
</html>`;

test.describe("accesslintAudit", () => {
  test("accessible page has no violations", async ({ page }) => {
    await page.setContent(ACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    expect(result.violations).toHaveLength(0);
    expect(result.ruleCount).toBeGreaterThan(0);
  });

  test("inaccessible page has violations", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    expect(result.violations.length).toBeGreaterThan(0);
    const ruleIds = result.violations.map((v) => v.ruleId);
    // accesslint-011 = img missing alt, accesslint-080 = html missing lang
    expect(ruleIds).toContain("accesslint-011");
    expect(ruleIds).toContain("accesslint-080");
  });

  test("violations do not contain element property", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    for (const v of result.violations) {
      expect(v).not.toHaveProperty("element");
    }
  });

  test("locator scoping — good section has no violations", async ({ page }) => {
    await page.setContent(SCOPED_HTML);
    const result = await accesslintAudit(page.locator("#good"));
    expect(result.violations).toHaveLength(0);
  });

  test("locator scoping — bad section has violations", async ({ page }) => {
    await page.setContent(SCOPED_HTML);
    const result = await accesslintAudit(page.locator("#bad"));
    expect(result.violations.length).toBeGreaterThan(0);
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain("accesslint-011");
  });

  test("disabledRules filters out specified rules", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    const result = await accesslintAudit(page, {
      disabledRules: ["accesslint-011"],
    });
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).not.toContain("accesslint-011");
    // accesslint-080 (html-has-lang) should still be present
    expect(ruleIds).toContain("accesslint-080");
  });

  test("re-injection guard — no duplicate script tags", async ({ page }) => {
    await page.setContent(ACCESSIBLE_HTML);
    await accesslintAudit(page);
    await accesslintAudit(page);
    const scriptCount = await page.evaluate(() =>
      document.querySelectorAll("script").length,
    );
    expect(scriptCount).toBe(1);
  });
});

test.describe("toBeAccessible matcher", () => {
  test("passes for accessible page", async ({ page }) => {
    await page.setContent(ACCESSIBLE_HTML);
    await expect(page).toBeAccessible();
  });

  test("fails for inaccessible page", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).not.toBeAccessible();
  });

  test("works with locator", async ({ page }) => {
    await page.setContent(SCOPED_HTML);
    await expect(page.locator("#good")).toBeAccessible();
    await expect(page.locator("#bad")).not.toBeAccessible();
  });

  test("respects disabledRules", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    // Disable all known violations — should pass
    await expect(page).toBeAccessible({
      disabledRules: ["accesslint-011", "accesslint-080"],
    });
  });
});
