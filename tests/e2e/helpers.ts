import { expect, type Page } from "@playwright/test";

export async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

export async function shoot(page: Page, name: string) {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await noHorizontalScroll(page);
    await page.screenshot({
      path: `test-results/screens/${name}-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 375, height: 900 });
}

