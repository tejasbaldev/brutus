import { expect, test } from '@playwright/test';

test('title screen renders', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Robin');
});
