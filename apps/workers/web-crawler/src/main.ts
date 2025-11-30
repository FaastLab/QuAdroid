import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import dotenv from 'dotenv'
import { pool } from './lib/supabase'
import { crawlWebsite } from './crawl'
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
  console.log('Web Crawler Worker connected to Redis')
})

const worker = new Worker(
  'web-crawler-queue',
  async (job) => {
    const { jobId, url, credentials } = job.data

    console.log(`[Web Crawler] Processing job ${jobId} for URL: ${url}`)

    try {
      // Update status to crawling
      await pool.query(
        'UPDATE test_jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['crawling', jobId]
      )

      // Crawl the website
      const crawlData = await crawlWebsite(url, credentials)
      
      // Save crawl data
      const workDir = path.join(process.env.WORKER_REPORT_PATH || '/app/reports', jobId)
      await fs.mkdir(workDir, { recursive: true })
      await fs.writeFile(
        path.join(workDir, 'crawl-data.json'),
        JSON.stringify(crawlData, null, 2)
      )

      // Update job with crawl results
      await pool.query(
        'UPDATE test_jobs SET status = $1, crawl_data = $2, updated_at = NOW() WHERE id = $3',
        ['crawl_completed', JSON.stringify(crawlData), jobId]
      )

      console.log(`[Web Crawler] Job ${jobId} completed - triggering user-journey worker`)
      
      // Trigger user-journey worker automatically
      const { Queue } = require('bullmq')
      const IORedis = require('ioredis')
      const userJourneyConnection = new IORedis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
      })
      const userJourneyQueue = new Queue('user-journey-queue', { connection: userJourneyConnection })
      await userJourneyQueue.add('test', job.data)
      console.log(`[Web Crawler] User journey job queued for ${jobId}`)
      
      return { success: true, crawlData }
    } catch (error) {
      console.error(`[Web Crawler] Job ${jobId} failed:`, error)

      // Update status to failed
      await pool.query(
        'UPDATE test_jobs SET status = $1, error = $2, updated_at = NOW() WHERE id = $3',
        ['failed', error instanceof Error ? error.message : 'Crawl failed', jobId]
      )

      throw error
    }
  },
  {
    connection,
    concurrency: 2,
  }
)

worker.on('completed', (job) => {
  console.log(`[Web Crawler] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[Web Crawler] Job ${job?.id} failed: ${err.message}`)
})

console.log('Web Crawler Worker started and listening for jobs...')

