import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

export async function executePlaywrightTests(workDir: string, testFilePath: string, testUrl?: string): Promise<void> {
  try {
    // Copy test file to user-journey worker directory to access node_modules
    const workerTestPath = path.join('/app/user-journey', 'temp-test.spec.ts')
    await fs.copyFile(testFilePath, workerTestPath)
    
    console.log('Running Playwright tests from user-journey directory...')
    
    // Use the playwright.config.ts file for consistent configuration
    const { stdout, stderr } = await execAsync(
      `npx playwright test temp-test.spec.ts --config=playwright.config.ts`,
      {
        cwd: '/app/user-journey',
        timeout: 300000,
        env: {
          ...process.env,
          ALLURE_RESULTS_DIR: `${workDir}/allure-results`,
          TEST_URL: testUrl || '',
        }
      }
    )

    console.log('Playwright output:', stdout)
    if (stderr) {
      console.error('Playwright stderr:', stderr)
    }
    
    // Clean up temp file
    await fs.unlink('/app/user-journey/temp-test.spec.ts').catch(() => {})
  } catch (error: any) {
    // Tests failed - but that's OK! We still want the results
    console.log('Tests completed with some failures:', error.message)
    if (error.stdout) console.log('Output:', error.stdout)
    if (error.stderr) console.error('Errors:', error.stderr)
    
    // Save the raw output for debugging
    const debugPath = path.join(workDir, 'playwright-output.txt')
    await fs.writeFile(debugPath, `${error.stdout || ''}\n\n${error.stderr || ''}`).catch(() => {})
    
    // Clean up temp file even on error
    await fs.unlink('/app/worker/temp-test.spec.ts').catch(() => {})
    
    // DON'T throw - let the job continue to report generation
  }
}

