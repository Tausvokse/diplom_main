import { test, expect } from '@playwright/test';

test.describe('Student QA Loop', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a student
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'pool1@kai.edu.ua');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for the dashboard to load
    await page.waitForURL('**/student/**', { timeout: 10000 });
  });

  test('can view dashboard and navigate to services', async ({ page }) => {
    // Basic rendering check for the sidebar
    await expect(page.getByRole('link', { name: 'Головна' })).toBeVisible();

    // Navigate to services
    await page.getByRole('link', { name: 'Послуги' }).click();
    await page.waitForURL('**/student/services', { timeout: 10000 });
  });

  test('can view financial info', async ({ page }) => {
    await page.getByRole('link', { name: 'Оплата' }).click();
    await page.waitForURL('**/student/financials', { timeout: 10000 });
  });
});
