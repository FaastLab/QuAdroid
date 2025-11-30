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
  const prompt = `
You are an expert in writing Playwright tests. Generate a comprehensive Playwright test script for the following website.

Website URL: ${url}

Crawled Data:
${JSON.stringify(crawlData, null, 2)}

${credentials ? `Login Credentials:\nUsername: ${credentials.username}\nPassword: ${credentials.password}\n` : ''}
${creditCard ? `Test Credit Card:\nNumber: ${creditCard.number}\nExpiry: ${creditCard.expiry}\nCVV: ${creditCard.cvv}\n` : ''}

Generate a Playwright test file (TypeScript) that:
1. Tests navigation to ALL pages found in crawl data
2. Tests login form if credentials provided - IMPORTANT: After login, ONLY check if URL changed (before vs after), DO NOT assume specific URLs like /dashboard
3. Tests other forms found - verify form submission works by checking URL change or visible success message
4. Includes proper assertions with expect()
5. Uses Allure reporter annotations (@allure.feature, @allure.story)
6. Each test must be independent

CRITICAL RULES - FOLLOW EXACTLY:
1. NEVER EVER use expect(page).toHaveURL() with specific URLs like /dashboard - YOU DON'T KNOW WHERE IT GOES
2. For login test, use THIS EXACT PATTERN:
   const urlBefore = page.url()
   await submitButton.click()
   await page.waitForLoadState('networkidle')
   const urlAfter = page.url()
   expect(urlBefore).not.toBe(urlAfter)  // Just check it changed
3. DO NOT test pages that aren't in the crawl data
4. DO NOT check for text like "coming soon" unless it's in the crawl data
5. ONLY test: page navigation (does page load?) and login (does URL change?)
6. Use simple selectors: input[name="username"], input[type="email"], button[type="submit"]

Return ONLY the TypeScript code, no explanations.
Start with: import { test, expect } from '@playwright/test';
`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Playwright test automation engineer. Generate clean, working Playwright test code.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,  // Balanced temperature for demo
      max_tokens: 3000,
    })

    let testScript = completion.choices[0]?.message?.content || ''

    // Clean up markdown code blocks if present
    testScript = testScript.replace(/```typescript\n?/g, '').replace(/```\n?/g, '')

    // Ensure imports are present
    if (!testScript.includes('import { test, expect }')) {
      testScript = `import { test, expect } from '@playwright/test';\n\n${testScript}`
    }

    return testScript
  } catch (error) {
    console.error('Error generating test script:', error)
    
    // Fallback: Generate basic test
    return `
import { test, expect } from '@playwright/test';

test.describe('${url} - Basic Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('${url}');
    await expect(page).toHaveTitle(/.+/);
    console.log('Page loaded successfully');
  });

  ${credentials ? `
  test('should login', async ({ page }) => {
    await page.goto('${url}');
    // Attempt to find and fill login form
    const usernameInput = page.locator('input[name="username"], input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
    
    if (await usernameInput.isVisible()) {
      await usernameInput.fill('${credentials.username}');
      await passwordInput.fill('${credentials.password}');
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }
  });
  ` : ''}

  test('should navigate through pages', async ({ page }) => {
    await page.goto('${url}');
    const links = await page.locator('a[href]').all();
    console.log(\`Found \${links.length} links\`);
    
    for (const link of links.slice(0, 3)) {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          await link.click();
          await page.waitForLoadState('networkidle');
          await page.goBack();
        } catch (e) {
          console.log('Navigation error:', e);
        }
      }
    }
  });
});
`
  }
}

