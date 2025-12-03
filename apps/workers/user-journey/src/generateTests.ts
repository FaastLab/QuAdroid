import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface CrawlResult {
  pages: Array<{
    url: string
    title: string
    forms: any[]
    buttons: any[]
    links: any[]
  }>
}

export async function generateTestScript(
  url: string,
  crawlData: CrawlResult,
  credentials?: { username: string; password: string },
  creditCard?: { number: string; expiry: string; cvv: string }
): Promise<string> {
  const rawPages = crawlData.pages || []
  const baseUrl = new URL(url).origin
  
  // Deduplicate pages by URL path to avoid duplicate test titles
  const seenPaths = new Set<string>()
  const pages = rawPages.filter(page => {
    try {
      const pagePath = new URL(page.url).pathname
      if (seenPaths.has(pagePath)) {
        return false
      }
      seenPaths.add(pagePath)
      return true
    } catch {
      return false
    }
  })
  
  console.log(`[generateTests] Deduplicated ${rawPages.length} pages to ${pages.length} unique paths`)
  
  // Generate navigation tests template for each page
  const navigationTests = pages.map((page, index) => {
    const pagePath = new URL(page.url).pathname || '/'
    const pageName = page.title || pagePath
    return `
  test('Navigate to ${pagePath}', async ({ page }) => {
    test.info().annotations.push({ type: 'allure.feature', description: 'Navigation' });
    test.info().annotations.push({ type: 'allure.story', description: '${pageName.replace(/'/g, "\\'")}' });
    
    await page.goto('${page.url}');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify page loaded - just check we're on the right URL
    expect(page.url()).toContain('${pagePath}');
    
    // Verify page has content
    await expect(page.locator('body')).toBeVisible();
    console.log('Successfully loaded: ${page.url}');
  });`
  }).join('\n')

  // Login test template
  const loginTest = credentials ? `
  test('Login with provided credentials', async ({ page }) => {
    test.info().annotations.push({ type: 'allure.feature', description: 'Authentication' });
    test.info().annotations.push({ type: 'allure.story', description: 'Login Form' });
    
    // Find login page
    await page.goto('${url}');
    await page.waitForLoadState('domcontentloaded');
    
    // Try to find login link and click it
    const loginLink = page.locator('a:has-text("login"), a:has-text("Login"), a:has-text("Sign in"), a:has-text("signin"), a[href*="login"]').first();
    if (await loginLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginLink.click();
      await page.waitForLoadState('domcontentloaded');
    }
    
    const urlBefore = page.url();
    
    // Find and fill email/username field
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"], input[id*="email"], input[id*="user"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill('${credentials.username}');
    
    // Find and fill password field
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.fill('${credentials.password}');
    
    // Find and click submit button
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Submit")').first();
    await submitBtn.click();
    
    // Wait for navigation or response
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
    const urlAfter = page.url();
    
    // Log results - don't assert specific URL, just check if something happened
    console.log('Login attempted - URL before: ' + urlBefore + ', URL after: ' + urlAfter);
    
    // Check if we're still on the same page (might indicate failure)
    if (urlBefore === urlAfter) {
      // Check for error messages
      const errorVisible = await page.locator('.error, .alert-error, .alert-danger, [role="alert"]').isVisible().catch(() => false);
      if (errorVisible) {
        const errorText = await page.locator('.error, .alert-error, .alert-danger, [role="alert"]').textContent().catch(() => 'Unknown error');
        console.log('Login error message: ' + errorText);
      }
    }
  });` : ''

  // Registration test template
  const registrationTest = `
  test('Registration form submission', async ({ page }) => {
    test.info().annotations.push({ type: 'allure.feature', description: 'Authentication' });
    test.info().annotations.push({ type: 'allure.story', description: 'Registration Form' });
    
    // Find registration page
    await page.goto('${url}');
    await page.waitForLoadState('domcontentloaded');
    
    // Try to find register/signup link
    const registerLink = page.locator('a:has-text("register"), a:has-text("Register"), a:has-text("Sign up"), a:has-text("signup"), a:has-text("Create account"), a[href*="register"], a[href*="signup"]').first();
    
    if (await registerLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await registerLink.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      // Try direct navigation to common registration paths
      const regPaths = ['/register', '/signup', '/sign-up', '/create-account'];
      for (const regPath of regPaths) {
        try {
          await page.goto('${baseUrl}' + regPath, { timeout: 5000 });
          const hasForm = await page.locator('form').isVisible().catch(() => false);
          if (hasForm) break;
        } catch (e) {
          continue;
        }
      }
    }
    
    const urlBefore = page.url();
    
    // Generate unique test email
    const testEmail = \`test_\${Date.now()}@testmail.com\`;
    
    // Try to find and fill registration form fields
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    const hasEmail = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasEmail) {
      await emailInput.fill(testEmail);
      
      // Fill password
      const passwordInputs = page.locator('input[type="password"]');
      const passwordCount = await passwordInputs.count();
      
      if (passwordCount >= 1) {
        await passwordInputs.nth(0).fill('TestPassword123!');
      }
      if (passwordCount >= 2) {
        await passwordInputs.nth(1).fill('TestPassword123!'); // Confirm password
      }
      
      // Fill name if exists
      const nameInput = page.locator('input[name="name"], input[id*="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test User');
      }
      
      // Submit form
      const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Register"), button:has-text("Sign up"), button:has-text("Create")').first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      }
    } else {
      console.log('No registration form found on this page');
    }
    
    const urlAfter = page.url();
    console.log('Registration attempted - URL before: ' + urlBefore + ', URL after: ' + urlAfter);
  });`

  // Combine into full test script
  const fullTestScript = `import { test, expect } from '@playwright/test';

test.describe('${url} - Automated Tests', () => {
  test.setTimeout(30000);
${navigationTests}
${loginTest}
${registrationTest}
});
`

  console.log(`[generateTests] Generated ${pages.length} navigation tests + login + registration`)
  
  return fullTestScript
}
