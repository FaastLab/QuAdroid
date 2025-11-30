interface CrawlData {
  pages: Array<{
    url: string
    title: string
    forms: any[]
    buttons: any[]
    links: any[]
  }>
}

interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Validates AI-generated test script to catch hallucinations
 */
export function validateTestScript(testScript: string, crawlData: CrawlData, baseUrl: string): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  // Extract all URLs from crawl data
  const knownUrls = new Set(crawlData.pages.map(p => new URL(p.url).pathname))
  
  // Check for hallucinated URL expectations
  const urlChecks = testScript.match(/toHaveURL\(['"\/]([^'"]+)['"]\)/g) || []
  for (const check of urlChecks) {
    const urlMatch = check.match(/toHaveURL\(['"\/]?([^'"]+)['"]\)/)
    if (urlMatch) {
      const expectedPath = urlMatch[1]
      // Common hallucinations: dashboard, profile, account, success
      const commonHallucinations = ['dashboard', 'profile', 'account', 'success', 'welcome', 'home']
      
      if (commonHallucinations.some(h => expectedPath.toLowerCase().includes(h))) {
        if (!Array.from(knownUrls).some(url => url.includes(expectedPath))) {
          warnings.push(`Possible hallucination: Test expects URL "${expectedPath}" which wasn't found in crawl data`)
        }
      }
    }
  }

  // Check for hard-coded element counts (brittle)
  const countChecks = testScript.match(/toHaveCount\(\d+\)/g) || []
  if (countChecks.length > 0) {
    warnings.push(`Test uses .toHaveCount() which is brittle - found ${countChecks.length} instances`)
  }

  // Check for specific text expectations that might not exist
  const textChecks = testScript.match(/toHaveText\(['"](.*?)['"]\)/g) || []
  const visibleChecks = testScript.match(/toBeVisible\(\).*?locator\(['"](.*?)['"]\)/g) || []
  
  if (textChecks.length > 5 || visibleChecks.length > 5) {
    warnings.push('Test has many text/visibility checks which may be fragile')
  }

  // Check for complex/brittle selectors
  const brittleSelectors = testScript.match(/locator\(['"]\.[\w-]+(?:\s+\.[\w-]+)+['"]\)/g) || []
  if (brittleSelectors.length > 0) {
    warnings.push(`Found ${brittleSelectors.length} complex class-based selectors (prefer data-testid or name attributes)`)
  }

  // Check if test uses waitForTimeout excessively (sign of flaky tests)
  const timeoutWaits = testScript.match(/waitForTimeout\(/g) || []
  if (timeoutWaits.length > 3) {
    warnings.push('Test uses waitForTimeout frequently - may be flaky')
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Attempts to fix common hallucinations in test script
 */
export function autoFixTestScript(testScript: string, crawlData: CrawlData): string {
  let fixed = testScript

  // Fix: Replace toHaveURL(/dashboard/) with URL change check
  fixed = fixed.replace(
    /expect\(page\)\.toHaveURL\([^)]+\)/g,
    'const urlAfter = page.url(); expect(urlAfter).not.toBe(urlBefore)'
  )

  // Fix: Remove hard-coded element counts
  fixed = fixed.replace(
    /await\s+expect\([^)]+\)\.toHaveCount\(\d+\)/g,
    '// Element count check removed - too brittle'
  )

  return fixed
}






