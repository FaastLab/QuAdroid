# TestPilot Core - Open Source AI-Powered E2E Testing

🚀 **AI-powered end-to-end testing made simple** - Crawl any website, generate Playwright tests automatically, and get beautiful test reports.

## Features

✅ **Intelligent Web Crawler** - Discovers pages, forms, buttons, and interactive components  
✅ **AI Test Generation** - GPT-4 powered test script generation from crawl data  
✅ **Playwright Execution** - Runs comprehensive E2E tests with screenshots & videos  
✅ **Allure Reports** - Beautiful, interactive HTML test reports  
✅ **Multi-Worker Architecture** - Isolated, scalable microservices  
✅ **100% Open Source** - Apache 2.0 License  

## Quick Start

### Prerequisites
- Docker & Docker Compose
- OpenAI API Key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/testpilot-core
cd testpilot-core
```

2. **Set environment variables**
```bash
cd docker
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. **Start services**
```bash
docker compose up --build
```

4. **Access UI**
```
http://localhost:8080
```

## How It Works

```
1. Enter website URL
     ↓
2. Web Crawler discovers pages/forms/components
     ↓
3. AI generates Playwright tests from crawl data
     ↓
4. Tests execute with screenshots/videos/traces
     ↓
5. View beautiful Allure report
```

## Architecture

```
Core Services:
├── Web Crawler Worker    - Playwright-based website discovery
├── User Journey Worker   - AI test generation & execution
├── Simple UI             - Submit tests & view reports
├── Redis                 - Job queue
└── PostgreSQL            - Job storage
```

## Environment Variables

```env
# OpenAI (Required)
OPENAI_API_KEY=sk-...

# Database (Auto-configured in Docker)
POSTGRES_PASSWORD=postgres123

# Optional
REDIS_PASSWORD=
WORKER_REPORT_PATH=/app/reports
```

## Development

### Run Locally
```bash
# Terminal 1 - Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2 - PostgreSQL
docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres123 postgres:15-alpine

# Terminal 3 - Web Crawler
cd apps/workers/web-crawler
npm install
npm run dev

# Terminal 4 - User Journey
cd apps/workers/user-journey
npm install
npm run dev
```

### Project Structure
```
core/
├── apps/
│   ├── workers/
│   │   ├── web-crawler/      # Website crawling
│   │   └── user-journey/     # Test generation & execution
│   └── shared/
│       └── types.ts          # Shared TypeScript types
└── docker/
    ├── docker-compose.yml
    ├── web-crawler.Dockerfile
    └── user-journey.Dockerfile
```

## 🌟 Enterprise Edition

Looking for advanced features?

**Enterprise modules include:**
- 🔐 **Multi-tenancy** - Teams, organizations, user management
- 💳 **Billing Integration** - Stripe subscriptions, usage tracking
- 🛡️ **Advanced Security Testing** - Deep pentesting, OWASP ZAP
- 🤖 **Additional Workers** - API testing, DB checks, CI/CD integration
- 📊 **Analytics Dashboard** - Test trends, success rates, insights
- 🔄 **FlowiseAI Integration** - Visual AI flow editor for test logic
- ☁️ **Cloud Deployment** - Managed hosting, scaling, support

👉 **[Contact us for enterprise license](mailto:your@email.com)**

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](https://github.com/yourusername/testpilot-core/wiki)
- 🐛 [Report Issues](https://github.com/yourusername/testpilot-core/issues)
- 💬 [Discussions](https://github.com/yourusername/testpilot-core/discussions)

---

**Made with ❤️ for the testing community**


