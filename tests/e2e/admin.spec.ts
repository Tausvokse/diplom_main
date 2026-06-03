import { test, expect } from '@playwright/test';

test.describe('Admin QA Loop', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Super Admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'admin@npp.kai.edu.ua');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin/**', { timeout: 10000 });
  });

  test('can view admin dashboard', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Гуртожитки' })).toBeVisible();
  });

  test('can navigate to applications review', async ({ page }) => {
    await page.getByRole('link', { name: 'Заяви' }).click();
    await page.waitForURL('**/admin/applications', { timeout: 10000 });
  });
  
  test('can navigate to allocation dashboard', async ({ page }) => {
    await page.getByRole('link', { name: 'Поселення' }).click();
    await page.waitForURL('**/admin/allocation', { timeout: 10000 });
  });
});
