import { expect, test } from '@playwright/test';

test.describe('Landing page (/)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ON TIME/);
  });

  test('renders brush-calligraphy Hero title', async ({ page }) => {
    await page.goto('/');
    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toHaveAttribute('aria-label', '残業を過去にする。');
    // 9 文字（残業を過去にする。）が char span として存在
    const chars = heroTitle.locator('.char');
    await expect(chars).toHaveCount(9);
  });

  test('has SVG ink-filter in DOM', async ({ page }) => {
    await page.goto('/');
    const filter = page.locator('#ink-filter');
    await expect(filter).toBeAttached();
  });

  test('renders all 7 bento tech cards', async ({ page }) => {
    await page.goto('/');
    const bentoCards = page.locator('.bento-card[data-target]');
    await expect(bentoCards).toHaveCount(7);
  });

  test('footer shows copyright', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.copyright')).toContainText('ON TIME');
  });
});

test.describe('Diagnosis page (/check)', () => {
  test('loads with diagnosis title', async ({ page }) => {
    await page.goto('/check');
    await expect(page).toHaveTitle(/課題診断/);
  });

  test('shows 5-step progress with step 1 active', async ({ page }) => {
    await page.goto('/check');
    const step1 = page.locator('.step-dot[data-step="1"]');
    await expect(step1).toHaveClass(/active/);
    const allSteps = page.locator('.step-dot');
    await expect(allSteps).toHaveCount(5);
  });

  test('industry selection advances to step 2', async ({ page }) => {
    await page.goto('/check');
    // 業種カード（最初）を選択
    await page.locator('#industry-grid .sel-card').first().click();
    // Step 2 が active
    const step2 = page.locator('#step-2');
    await expect(step2).toHaveClass(/active/);
  });

  test('renders 12 industries in step 1', async ({ page }) => {
    await page.goto('/check');
    const industries = page.locator('#industry-grid .sel-card');
    await expect(industries).toHaveCount(12);
  });
});

test.describe('Navigation', () => {
  test('index → check via CTA button', async ({ page }) => {
    await page.goto('/');
    await page.locator('a.cta-btn:has-text("課題を診断する")').first().click();
    await expect(page).toHaveURL(/\/check\/?$/);
    await expect(page).toHaveTitle(/課題診断/);
  });

  test('check → index via TOP link', async ({ page }) => {
    await page.goto('/check');
    await page.locator('.back-link').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle(/ON TIME/);
  });
});
