import { expect, test, type Page } from '@playwright/test';

// Fixed tier and seed, no AI pause: deterministic and fast.
const URL = './?tier=1&seed=1&delay=0';

const begin = async (page: Page, url = URL) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Standup');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lay out your work');
};

const ownBoard = (page: Page) => page.getByRole('grid', { name: 'Your board' });
const theirBoard = (page: Page) => page.getByRole('grid', { name: 'Their board' });

test('places the whole fleet by keyboard', async ({ page }) => {
  await begin(page);
  const status = page.getByRole('status');
  await ownBoard(page).getByRole('gridcell', { name: /^A1,/ }).focus();

  // One ship per row, top to bottom: Enter places, ArrowDown moves on.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Enter');
    await expect(status).toContainText('Placed');
    await page.keyboard.press('ArrowDown');
  }
  await expect(
    ownBoard(page).getByRole('gridcell', { name: 'A1, The Side Project' }),
  ).toBeVisible();
  await expect(
    ownBoard(page).getByRole('gridcell', { name: 'E2, The Weekend Hack' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled();
});

test('rotates and rejects placements that do not fit', async ({ page }) => {
  await begin(page);
  const status = page.getByRole('status');
  await ownBoard(page).getByRole('gridcell', { name: /^A8,/ }).focus();

  await page.keyboard.press('Enter'); // 5 long across from column 8: off the board
  await expect(status).toHaveText("Doesn't fit there.");

  await page.keyboard.press('r');
  await expect(status).toHaveText('Rotated: down.');
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('Placed The Side Project at A8, down.');

  // Next ship (The Promotion) across from A7 would overlap at A8.
  await page.keyboard.press('r');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('That overlaps another ship.');
  await expect(page.getByRole('button', { name: 'Start' })).toBeDisabled();
});

test('plays chapter 1 to a result, with commentary, and moves on to chapter 2', async ({
  page,
}) => {
  await begin(page);
  await page.getByRole('button', { name: 'Shuffle' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Standup');

  const playAgain = page.getByRole('button', { name: 'Continue' });
  const cells = theirBoard(page).getByRole('gridcell');
  await expect(cells).toHaveCount(100);

  for (let i = 0; i < 100; i++) {
    // The AI replies on a timer, so wait for the turn to settle before reading the result.
    await expect(page.getByText(/^(your move|done)$/)).toBeVisible();
    if (await playAgain.isVisible()) break;
    await cells.nth(i).click();
    if (i === 0) await expect(page.getByRole('log')).toContainText('ai: ');
  }

  await expect(playAgain).toBeVisible();
  await expect(playAgain).toBeFocused();
  await playAgain.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The 2am commit');
});

test('cells announce coordinates and state; fired cells are disabled', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Shuffle' }).click();
  await page.getByRole('button', { name: 'Start' }).click();

  const a1 = theirBoard(page).getByRole('gridcell', { name: /^A1,/ });
  await expect(a1).toHaveAccessibleName('A1, not fired at');
  await a1.click();
  await expect(page.getByRole('log')).toContainText('You → A1');
  await expect(a1).toHaveAttribute('aria-disabled', 'true');
  await expect(a1).not.toHaveAccessibleName('A1, not fired at');
});

test('arrow keys move focus across the target grid', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Shuffle' }).click();
  await page.getByRole('button', { name: 'Start' }).click();

  await theirBoard(page).getByRole('gridcell', { name: /^A1,/ }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(theirBoard(page).getByRole('gridcell', { name: /^B2,/ })).toBeFocused();
  await page.keyboard.press('End');
  await expect(theirBoard(page).getByRole('gridcell', { name: /^B10,/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('log')).toContainText('You → B10');
});

const labels = async (page: Page, name: string) => {
  const cells = await page.getByRole('grid', { name }).getByRole('gridcell').all();
  return Promise.all(cells.map((c) => c.getAttribute('aria-label')));
};

const resume = async (page: Page) => {
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
};

test('a reload resumes the layout being placed', async ({ page }) => {
  await begin(page);
  await ownBoard(page).getByRole('gridcell', { name: /^A1,/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Placed');

  await resume(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lay out your work');
  await expect(
    ownBoard(page).getByRole('gridcell', { name: 'A1, The Side Project' }),
  ).toBeVisible();
});

test('a reload resumes the battle, shot for shot', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Shuffle' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  const cells = theirBoard(page).getByRole('gridcell');
  for (let i = 0; i < 4; i++) {
    await expect(page.getByText(/^your move$/)).toBeVisible();
    await cells.nth(i * 11).click();
  }
  await expect(page.getByText(/^your move$/)).toBeVisible();
  const before = [await labels(page, 'Their board'), await labels(page, 'Your board')];

  await resume(page);
  await expect(page.getByText(/^your move$/)).toBeVisible();
  expect([await labels(page, 'Their board'), await labels(page, 'Your board')]).toEqual(before);
});
