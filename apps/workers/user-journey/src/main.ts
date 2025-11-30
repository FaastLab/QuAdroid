import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import dotenv from 'dotenv'
import { pool } from './lib/supabase'
import { generateTestScript } from './generateTests'
import { validateTestScript, autoFixTestScript } from './validateTests'
import { executePlaywrightTests } from './executeTests'
import { generateAllureReport } from './allure'
import path from 'path'
import fs from 'fs/promises'

dotenv.config()

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

connection.on('error', (err) => {
  console.error('Redis connection error:', err)
})

connection.on('connect', () => {
  console.log('User Journey Worker connected to Redis')
})

const worker = new Worker(
  'user-journey-queue',
  async (job) => {
    const { jobId, url, credentials, creditCard } = job.data

    console.log(`[User Journey] Processing job ${jobId} for URL: ${url}`)

    const workDir = path.join(process.env.WORKER_REPORT_PATH || '/app/reports', jobId)
    await fs.mkdir(workDir, { recursive: true })

    try {
      // Step 1: Get crawl data from database
      console.log(`[User Journey] Fetching crawl data for job ${jobId}`)
      const result = await pool.query(
        'SELECT crawl_data FROM test_jobs WHERE id = $1',
        [jobId]
      )

      if (result.rows.length === 0 || !result.rows[0].crawl_data) {
        throw new Error('Crawl data not found. Web crawler must run first.')
      }

      const crawlData = result.rows[0].crawl_data

      // Step 2: Generate test script
      console.log(`[User Journey] Generating test scripts for job ${jobId}`)
      await pool.query(
        'UPDATE test_jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['generating', jobId]
      )

      let testScript = await generateTestScript(url, crawlData, credentials, creditCard)
      
      // Validate AI-generated tests for hallucinations
      console.log(`[User Journey] Validating generated tests for job ${jobId}`)
      const validation = validateTestScript(testScript, crawlData, url)
      
      if (validation.warnings.length > 0) {
        console.log(`[User Journey] Validation warnings for ${jobId}:`)
        validation.warnings.forEach(w => console.log(`  ⚠️  ${w}`))
        
        // Log warnings but don't auto-fix for demo
        console.log(`[User Journey] Validation completed - using original tests`)
      }
      
      if (validation.errors.length > 0) {
        console.error(`[User Journey] Validation errors for ${jobId}:`)
        validation.errors.forEach(e => console.error(`  ❌ ${e}`))
        throw new Error('Test script validation failed - contains hallucinations')
      }
      
      const testFilePath = path.join(workDir, 'main-test.spec.ts')
      await fs.writeFile(testFilePath, testScript)
      
      // Also save validation report
      await fs.writeFile(
        path.join(workDir, 'validation-report.json'),
        JSON.stringify(validation, null, 2)
      )
      console.log(`[User Journey] Test validation passed with ${validation.warnings.length} warnings`)

      // Step 3: Execute tests
      console.log(`[User Journey] Running Playwright tests for job ${jobId}`)
      await pool.query(
        'UPDATE test_jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['testing', jobId]
      )

      await executePlaywrightTests(workDir, testFilePath, url)

      // Step 4: Generate Allure report
      console.log(`[User Journey] Generating Allure report for job ${jobId}`)
      const reportPath = await generateAllureReport(workDir)

      // Step 5: Update status to completed
      await pool.query(
        'UPDATE test_jobs SET status = $1, report_path = $2, updated_at = NOW() WHERE id = $3',
        ['completed', reportPath, jobId]
      )

      console.log(`[User Journey] Job ${jobId} completed successfully - report at ${reportPath}`)
      return { success: true, reportPath }
    } catch (error) {
      console.error(`[User Journey] Job ${jobId} failed:`, error)

      // Update status to failed
      await pool.query(
        'UPDATE test_jobs SET status = $1, error = $2, updated_at = NOW() WHERE id = $3',
        ['failed', error instanceof Error ? error.message : 'Test generation/execution failed', jobId]
      )

      throw error
    }
  },
  {
    connection,
    concurrency: 1, // Run one test at a time to avoid resource conflicts
  }
)

worker.on('completed', (job) => {
  console.log(`[User Journey] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[User Journey] Job ${job?.id} failed: ${err.message}`)
})

console.log('User Journey Worker started and listening for jobs...')

