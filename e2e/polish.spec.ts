import { expect, test } from '@playwright/test';

test('sound is off by default, and the choice is remembered', async ({ page }) => {
  await page.goto('./');
  const sound = page.getByRole('button', { name: 'Sound' });
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sound' })).toHaveAttribute('aria-pressed', 'true');
});

test('reduced motion: no transitions, and interstitials appear at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?seed=1');
  await page.getByRole('button', { name: 'Begin' }).click();
  const main = page.getByRole('main');
  await expect(main).toHaveCSS('animation-name', 'none');
  // The typed copy is aria-hidden; check its last line is fully visible straight away.
  const lastLine = main.locator('[aria-hidden="true"] p').last();
  await expect(lastLine).toHaveText(/quickly\.$/);
  await expect(lastLine.locator('span')).toHaveText('');
});

test('chapter screens animate in when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./?seed=1');
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByRole('main')).not.toHaveCSS('animation-name', 'none');
});
