/**
 * Core audit logic — IIFE injection, audit execution, and formatting.
 *
 * Works with both Page and Locator targets.
 */
import { createRequire } from "node:module";
import { getRuleById } from "@accesslint/core";
import type { Page, Locator } from "@playwright/test";

const require = createRequire(import.meta.url);
const iifePath = require.resolve("@accesslint/core/iife");

export interface AccessibleMatcherOptions {
  disabledRules?: string[];
}

export interface AuditViolation {
  ruleId: string;
  selector: string;
  html: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  message: string;
}

export interface AuditResult {
  url: string;
  timestamp: number;
  violations: AuditViolation[];
  ruleCount: number;
}

function isPage(target: Page | Locator): target is Page {
  return typeof (target as Page).goto === "function";
}

function getPage(target: Page | Locator): Page {
  if (isPage(target)) return target;
  return target.page();
}

async function ensureInjected(page: Page): Promise<void> {
  const hasAccessLint = await page.evaluate(() => typeof (window as any).AccessLint !== "undefined");
  if (!hasAccessLint) {
    await page.addScriptTag({ path: iifePath });
  }
}

export async function accesslintAudit(
  target: Page | Locator,
  options?: AccessibleMatcherOptions,
): Promise<AuditResult> {
  const page = getPage(target);
  await ensureInjected(page);

  let result: AuditResult;

  if (isPage(target)) {
    result = await page.evaluate(() => {
      const { runAudit } = (window as any).AccessLint;
      const raw = runAudit(document);
      return {
        url: raw.url,
        timestamp: raw.timestamp,
        ruleCount: raw.ruleCount,
        violations: raw.violations.map((v: any) => ({
          ruleId: v.ruleId,
          selector: v.selector,
          html: v.html,
          impact: v.impact,
          message: v.message,
        })),
      };
    });
  } else {
    result = await target.evaluate((el) => {
      const { runAudit } = (window as any).AccessLint;
      const raw = runAudit(document);
      const scoped = raw.violations.filter((v: any) => {
        try {
          const violationEl = el.ownerDocument.querySelector(v.selector);
          return violationEl && el.contains(violationEl);
        } catch {
          return false;
        }
      });
      return {
        url: raw.url,
        timestamp: raw.timestamp,
        ruleCount: raw.ruleCount,
        violations: scoped.map((v: any) => ({
          ruleId: v.ruleId,
          selector: v.selector,
          html: v.html,
          impact: v.impact,
          message: v.message,
        })),
      };
    });
  }

  if (options?.disabledRules?.length) {
    const disabled = new Set(options.disabledRules);
    result.violations = result.violations.filter((v) => !disabled.has(v.ruleId));
  }

  return result;
}

export function formatViolation(v: AuditViolation): string {
  const rule = getRuleById(v.ruleId);
  const wcag = rule?.wcag?.length ? ` (${rule.wcag.join(", ")})` : "";
  const level = rule?.level ? ` [${rule.level}]` : "";
  return `  ${v.ruleId}${level}${wcag}: ${v.message}\n    ${v.selector}`;
}
