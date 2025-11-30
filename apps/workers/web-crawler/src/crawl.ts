import { chromium } from 'playwright'

interface CrawlResult {
  pages: Array<{
    url: string
    title: string
    forms: Array<{
      action: string
      method: string
      fields: Array<{ name: string; type: string; required: boolean }>
    }>
    buttons: Array<{ text: string; selector: string }>
    links: Array<{ text: string; href: string }>
    interactiveComponents: Array<{
      type: 'chat' | 'modal' | 'dropdown' | 'popup'
      description: string
      selector: string
      triggerSelector?: string
    }>
  }>
}

export async function crawlWebsite(
  url: string,
  credentials?: { username: string; password: string }
): Promise<CrawlResult> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const visitedUrls = new Set<string>()
  const pages: CrawlResult['pages'] = []
  const maxPages = 100  // Crawl up to 100 pages for comprehensive testing

  async function crawlPage(pageUrl: string) {
    if (visitedUrls.size >= maxPages || visitedUrls.has(pageUrl)) {
      return
    }

    visitedUrls.add(pageUrl)
    console.log(`Crawling: ${pageUrl}`)

    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 })

      const title = await page.title()

      // Extract forms
      const forms = await page.$$eval('form', (formElements) =>
        formElements.map((form) => ({
          action: form.getAttribute('action') || '',
          method: form.getAttribute('method') || 'get',
          fields: Array.from(form.querySelectorAll('input, textarea, select')).map((field: any) => ({
            name: field.getAttribute('name') || '',
            type: field.getAttribute('type') || 'text',
            required: field.hasAttribute('required'),
          })),
        }))
      )

      // Extract buttons
      const buttons = await page.$$eval('button, input[type="button"], input[type="submit"]', (btnElements) =>
        btnElements.map((btn, idx) => ({
          text: btn.textContent?.trim() || btn.getAttribute('value') || `Button ${idx}`,
          selector: btn.id ? `#${btn.id}` : btn.className ? `.${btn.className.split(' ')[0]}` : `button:nth-of-type(${idx + 1})`,
        }))
      )

      // Extract interactive components (chat widgets, modals, etc.)
      const interactiveComponents = await page.evaluate((): Array<{
        type: 'chat' | 'modal' | 'dropdown' | 'popup'
        description: string
        selector: string
        triggerSelector?: string
      }> => {
        const components: Array<{
          type: 'chat' | 'modal' | 'dropdown' | 'popup'
          description: string
          selector: string
          triggerSelector?: string
        }> = []

        // Detect chat widgets
        const chatPatterns = [
          'chat', 'intercom', 'drift', 'livechat', 'messenger', 'zendesk',
          'tawk', 'crisp', 'freshchat', 'widget', 'support', 'help'
        ]
        
        // Check for chat iframes
        document.querySelectorAll('iframe').forEach((iframe, idx) => {
          const src = iframe.getAttribute('src') || ''
          const id = iframe.id || ''
          const classes = iframe.className || ''
          const combined = `${src} ${id} ${classes}`.toLowerCase()
          
          if (chatPatterns.some(pattern => combined.includes(pattern))) {
            components.push({
              type: 'chat',
              description: `Chat widget (iframe): ${id || `iframe-${idx}`}`,
              selector: iframe.id ? `iframe#${iframe.id}` : `iframe[src*="${src.substring(0, 30)}"]`,
            })
          }
        })

        // Check for chat buttons/triggers
        document.querySelectorAll('button, div[role="button"], a').forEach((el) => {
          const text = el.textContent?.toLowerCase() || ''
          const id = el.id?.toLowerCase() || ''
          const classes = el.className?.toString().toLowerCase() || ''
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || ''
          const combined = `${text} ${id} ${classes} ${ariaLabel}`
          
          if (chatPatterns.some(pattern => combined.includes(pattern))) {
            let selector = ''
            if (el.id) selector = `#${el.id}`
            else if (el.className) selector = `.${el.className.toString().split(' ')[0]}`
            else selector = el.tagName.toLowerCase()
            
            components.push({
              type: 'chat',
              description: `Chat trigger: "${text.trim().substring(0, 50)}"`,
              selector: selector,
              triggerSelector: selector,
            })
          }
        })

        // Check for modal triggers
        const modalPatterns = ['modal', 'dialog', 'popup']
        document.querySelectorAll('[data-modal], [data-toggle="modal"], [aria-haspopup="dialog"]').forEach((el) => {
          const text = el.textContent?.trim() || ''
          const id = el.id || ''
          
          components.push({
            type: 'modal',
            description: `Modal trigger: "${text.substring(0, 50)}"`,
            selector: id ? `#${id}` : el.className ? `.${el.className.toString().split(' ')[0]}` : 'unknown',
            triggerSelector: id ? `#${id}` : el.className ? `.${el.className.toString().split(' ')[0]}` : 'unknown',
          })
        })

        // Check for dropdowns
        document.querySelectorAll('select, [role="combobox"], [role="listbox"]').forEach((el, idx) => {
          const id = el.id || `dropdown-${idx}`
          components.push({
            type: 'dropdown',
            description: `Dropdown: ${el.getAttribute('name') || id}`,
            selector: el.id ? `#${el.id}` : `select:nth-of-type(${idx + 1})`,
          })
        })

        return components
      })

      // Extract links (same origin only)
      const baseUrl = new URL(pageUrl)
      const links = await page.$$eval('a[href]', (linkElements, origin) =>
        linkElements
          .map((link) => ({
            text: link.textContent?.trim() || '',
            href: link.getAttribute('href') || '',
          }))
          .filter((link) => {
            try {
              const linkUrl = new URL(link.href, origin)
              return linkUrl.origin === origin
            } catch {
              return false
            }
          }),
        baseUrl.origin
      )

      pages.push({ url: pageUrl, title, forms, buttons, links, interactiveComponents })

      // Crawl linked pages (limited to same domain)
      for (const link of links.slice(0, 20)) {  // Crawl more links per page for comprehensive coverage
        try {
          const fullUrl = new URL(link.href, pageUrl).href
          await crawlPage(fullUrl)
        } catch (err) {
          console.error(`Failed to crawl ${link.href}:`, err)
        }
      }
    } catch (error) {
      console.error(`Error crawling ${pageUrl}:`, error)
    }
  }

  await crawlPage(url)
  await browser.close()

  return { pages }
}

