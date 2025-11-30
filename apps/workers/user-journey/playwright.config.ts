import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Test directory - will be overridden by CLI
  testDir: '.',
  
  // Timeout for each test
  timeout: 30000,
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests
  retries: 0,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['allure-playwright', {
      outputFolder: process.env.ALLURE_RESULTS_DIR || 'allure-results',
      detail: true,
      suiteTitle: true,
      environmentInfo: {
        framework: 'playwright',
        node: process.version,
      },
    }],
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL for page.goto()
    baseURL: process.env.TEST_URL,
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Capture trace on failure
    trace: 'retain-on-failure',
    
    // Video on first retry
    video: 'retain-on-failure',
    
    // Timeout for each action
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },
});





