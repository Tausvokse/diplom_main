import { test, expect } from '@playwright/test';

test.describe('Master QA Loop', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a Master (Slesar)
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'slesar@kai.edu.ua');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/master/**', { timeout: 10000 });
  });

  test('can view repairs dashboard', async ({ page }) => {
    // Should see repairs page tab in sidebar
    await expect(page.getByRole('link', { name: 'Ремонти' })).toBeVisible();
  });
});
