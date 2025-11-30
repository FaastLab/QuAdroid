# Testing Core Locally

## Quick Test (5 minutes)

### 1. Create .env file
```bash
cd core/docker
notepad .env
```

Add this content:
```env
OPENAI_API_KEY=sk-your-actual-key-here
POSTGRES_PASSWORD=postgres123
```

### 2. Start services
```bash
docker compose up --build
```

Wait for all services to start (2-3 minutes). You should see:
- ✅ postgres started
- ✅ redis started  
- ✅ web-crawler started
- ✅ user-journey started
- ✅ simple-ui started on port 8080

### 3. Test the UI
Open browser: **http://localhost:8080**

Submit a test:
- Enter URL: `https://www.lanaphone.com`
- Click "Start AI Testing"
- Watch status update: pending → crawling → generating → testing → completed
- Click "View Allure Report" when done

### 4. Verify Reports
Reports saved to: `core/docker/reports/job_xxxxx/allure-report/index.html`

### 5. Stop services
```bash
docker compose down
```

## Troubleshooting

**Port 8080 already in use?**
```bash
# Edit docker-compose.yml, change "8080:8080" to "9090:8080"
```

**OpenAI API error?**
Check `.env` has valid `OPENAI_API_KEY`

**Postgres/Redis connection errors?**
```bash
docker compose down -v
docker compose up --build
```

## Expected Result

✅ Crawl discovers 10+ pages  
✅ AI generates 6-8 test scripts  
✅ Tests execute with Playwright  
✅ Allure report shows pass/fail with screenshots  

**If all works → Ready to release! 🚀**





