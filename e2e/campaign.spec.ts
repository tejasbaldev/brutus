import { expect, test, type Page } from '@playwright/test';

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** Fire at cells in order until the result panel appears (or the cells run out). */
async function fireUntilDone(page: Page, board: string) {
  const done = page.getByRole('region', { name: 'Result' });
  const cells = page.getByRole('grid', { name: board }).getByRole('gridcell');
  for (let i = 0; i < 100; i++) {
    if (await done.isVisible()) break;
    await expect(page.getByText(/> (your move|done)/)).toBeVisible();
    if (await done.isVisible()) break;
    if ((await cells.nth(i).getAttribute('aria-disabled')) === 'true') continue;
    await cells.nth(i).click();
  }
  await expect(done).toBeVisible();
}

test('chapter 4: keep fighting escalates, teaming up resolves the incident', async ({ page }) => {
  await page.goto('./?chapter=4&seed=3&delay=0');
  await button(page, 'Begin').click();
  await expect(h1(page)).toHaveText('The pager');
  await button(page, 'Continue').click();

  await expect(h1(page)).toHaveText('What now?');
  await button(page, 'Keep fighting').click();
  await button(page, 'Shuffle').click();
  await button(page, 'Start').click();
  await expect(h1(page)).toHaveText('Still fighting');
  await fireUntilDone(page, 'Their board');
  await expect(page.getByText('The pager goes off again.')).toBeVisible();
  await button(page, 'Continue').click();

  await expect(h1(page)).toHaveText('It is getting worse');
  await button(page, 'Continue').click();
  await expect(h1(page)).toHaveText('What now?');
  await button(page, 'Team up').click();

  await expect(h1(page)).toHaveText('Production incident');
  await expect(page.getByRole('grid', { name: 'Your board' })).toHaveCount(0);
  await expect(page.getByText('where the AI thinks the incident is hiding')).toBeVisible();
  await fireUntilDone(page, 'The incident');
  await expect(page.getByText('Incident resolved. Nobody did it alone.')).toBeVisible();
  await button(page, 'Continue').click();

  await expect(h1(page)).toHaveText('Incident resolved');
  await expect(
    page.getByRole('paragraph').filter({ hasText: 'You kept fighting for a while first.' }),
  ).toBeAttached();
  await button(page, 'Start over').click();
  await expect(button(page, 'Begin')).toBeVisible();
});

test('progress survives a reload', async ({ page }) => {
  await page.goto('./?seed=5&delay=0');
  await button(page, 'Begin').click();
  await button(page, 'Continue').click();
  await expect(h1(page)).toHaveText('Lay out your work');

  await page.reload();
  await button(page, 'Continue').click();
  await expect(h1(page)).toHaveText('Lay out your work');

  await page.reload();
  await button(page, 'Start over').click();
  await expect(h1(page)).toHaveText('Standup');
});

test('a corrupt save is ignored', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('brutus:save', '{"version":1,"campaign":{"chapter":7}}');
  });
  await page.reload();
  await expect(button(page, 'Begin')).toBeVisible();
});
