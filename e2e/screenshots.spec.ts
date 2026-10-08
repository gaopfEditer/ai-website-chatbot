import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const OUT = path.join(process.cwd(), "docs/screenshots");

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test("capture portfolio screenshots", async ({ page }) => {
  await page.goto("/demo");
  await page.waitForSelector('[data-testid="sitebot-toggle"]');
  await page.screenshot({ path: path.join(OUT, "01-demo-site-with-widget.png"), fullPage: true });

  await page.getByTestId("sitebot-toggle").click();
  await expect(page.getByTestId("sitebot-panel")).toBeVisible();

  await page.getByTestId("sitebot-input").fill("How much is in-office whitening?");
  await page.getByTestId("sitebot-send").click();
  await expect(page.locator(".sitebot-bot").last()).toContainText(/450|whitening/i, { timeout: 15_000 });
  await page.screenshot({ path: path.join(OUT, "02-answer-with-citation.png") });

  await page.getByTestId("sitebot-input").fill("Do you offer orthodontic braces?");
  await page.getByTestId("sitebot-send").click();
  await expect(page.getByTestId("sitebot-lead")).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: path.join(OUT, "03-lead-capture-fallback.png") });

  await page.locator('#sitebot-lead input[name="name"]').fill("Alex Demo");
  await page.locator('#sitebot-lead input[name="email"]').fill("alex@example.com");
  await page.locator('#sitebot-lead textarea[name="need"]').fill("Interested in braces referral");
  await page.locator("#sitebot-lead button[type=submit]").click();
  await expect(page.locator(".sitebot-bot").last()).toContainText(/thanks|touch/i, { timeout: 15_000 });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Admin/i })).toBeVisible();
  await page.screenshot({ path: path.join(OUT, "04-admin-leads-view.png"), fullPage: true });
});
