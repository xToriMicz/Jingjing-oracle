# Playwright — Web Automation Quick Reference

> Learned: 2026-03-07 | Source: microsoft/playwright

## What is Playwright?

Cross-browser automation library by Microsoft. Supports Chromium, Firefox, WebKit. Auto-waits for elements, runs tests in parallel, handles modern web (SPA, iframes, shadow DOM).

## Setup

```bash
# Init project with test runner
bun create playwright
# or
npm init playwright@latest

# Install browsers
npx playwright install
```

## Core API

```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('https://example.com');
await page.screenshot({ path: 'screenshot.png' });
await browser.close();
```

## Locators (Preferred Order)

```typescript
// Best — accessible, user-facing
page.getByRole('button', { name: 'Submit' })
page.getByText('Welcome')
page.getByLabel('Email')
page.getByPlaceholder('Enter email')
page.getByAltText('Logo')
page.getByTitle('Help')
page.getByTestId('submit-btn')

// Fallback — CSS/XPath
page.locator('.submit-btn')
page.locator('//button[@type="submit"]')

// Chaining & filtering
page.getByRole('listitem').filter({ hasText: 'Product' }).getByRole('link')
```

## Actions

```typescript
await page.getByRole('button').click();
await page.getByLabel('Email').fill('test@example.com');
await page.getByLabel('Email').press('Enter');
await page.getByRole('checkbox').check();
await page.getByRole('combobox').selectOption('blue');
await page.getByLabel('Upload').setInputFiles('file.pdf');
await page.getByText('Item').hover();
```

## Auto-Waiting

Playwright auto-waits for elements to be:
- Visible, Stable, Enabled, Editable
- Receives events, Attached to DOM

No need for manual `waitFor` in most cases.

## Assertions

```typescript
import { expect } from '@playwright/test';

await expect(page).toHaveTitle(/Dashboard/);
await expect(page).toHaveURL(/\/dashboard/);
await expect(page.getByRole('heading')).toBeVisible();
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByText('Items')).toHaveCount(3);
await expect(page.getByRole('textbox')).toHaveValue('hello');
```

## Test Runner

```typescript
import { test, expect } from '@playwright/test';

test('basic flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await expect(page).toHaveURL('/login');
});

test.describe('auth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login success', async ({ page }) => {
    await page.getByLabel('Email').fill('user@test.com');
    await page.getByLabel('Password').fill('pass');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Welcome')).toBeVisible();
  });
});
```

## Network Interception

```typescript
// Mock API response
await page.route('**/api/users', route =>
  route.fulfill({
    status: 200,
    body: JSON.stringify([{ name: 'Mock User' }]),
  })
);

// Intercept and modify
await page.route('**/api/data', route => {
  route.continue({ headers: { ...route.request().headers(), 'X-Custom': 'value' } });
});

// Wait for response
const response = await page.waitForResponse('**/api/users');
```

## Screenshots & PDF

```typescript
await page.screenshot({ path: 'full.png', fullPage: true });
await page.locator('.card').screenshot({ path: 'card.png' });
await page.pdf({ path: 'page.pdf', format: 'A4' }); // Chromium only
```

## Browser Contexts (Isolation)

```typescript
// Each context = isolated session (cookies, storage)
const context1 = await browser.newContext();
const context2 = await browser.newContext();

// Reuse auth state
await context.storageState({ path: 'auth.json' });
const authedContext = await browser.newContext({ storageState: 'auth.json' });
```

## Best Practices

1. **Use locators, not selectors** — `getByRole` > `.css-class`
2. **Don't use `page.waitForTimeout`** — Use auto-waiting or `waitForResponse`
3. **Use test fixtures** for setup/teardown
4. **One assertion focus per test** — Keep tests focused
5. **Use Page Object Model** for complex pages
6. **Run in parallel** — Tests are isolated by default
7. **Use `--trace on`** for debugging — Time-travel debugging

## Codegen (Generate Tests)

```bash
npx playwright codegen https://example.com
```

Records browser actions and generates test code automatically.
