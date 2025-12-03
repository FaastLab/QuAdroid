const express = require('express')
const bodyParser = require('body-parser')
const { Pool } = require('pg')
const { Queue } = require('bullmq')
const IORedis = require('ioredis')

const app = express()
app.use(bodyParser.json())
app.use(express.static('public'))

// PostgreSQL connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'quadroid_core',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  port: 5432,
})

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
})

const webCrawlerQueue = new Queue('web-crawler-queue', { connection })

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_jobs (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        credentials JSONB,
        status TEXT NOT NULL CHECK (status IN ('pending', 'crawling', 'crawl_completed', 'generating', 'testing', 'completed', 'failed')),
        workers TEXT[] DEFAULT ARRAY['web-crawler', 'user-journey'],
        crawl_data JSONB,
        report_path TEXT,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}

initDatabase()

// Submit test
app.post('/api/submit', async (req, res) => {
  const { url, credentials } = req.body
  
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    await pool.query(
      'INSERT INTO test_jobs (id, url, credentials, status) VALUES ($1, $2, $3, $4)',
      [jobId, url, credentials ? JSON.stringify(credentials) : null, 'pending']
    )

    await webCrawlerQueue.add('crawl', { jobId, url, credentials })

    res.json({ jobId, message: 'Test submitted successfully' })
  } catch (error) {
    console.error('Submit error:', error)
    res.status(500).json({ error: 'Failed to submit test' })
  }
})

// Get job status
app.get('/api/report/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM test_jobs WHERE id = $1', [req.params.id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Get report error:', error)
    res.status(500).json({ error: 'Failed to fetch report' })
  }
})

// Serve reports
app.use('/reports', express.static('/app/reports'))

app.listen(8080, () => {
  console.log('QuADroid Core UI running on http://localhost:8080')
})

