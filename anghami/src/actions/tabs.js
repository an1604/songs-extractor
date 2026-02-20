const { withRetry } = require('../utils/retry')

async function waitForNewPage(context, options = {}) {
  const timeout = options.timeout || 10000
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      context.off('page', pageListener)
      reject(new Error(`Timeout waiting for new page (${timeout}ms)`))
    }, timeout)
    
    const pageListener = (page) => {
      clearTimeout(timeoutId)
      context.off('page', pageListener)
      resolve(page)
    }
    
    context.on('page', pageListener)
  })
}

async function getPageByUrl(context, urlPattern) {
  const pages = context.pages()
  return pages.find(page => page.url().includes(urlPattern)) || null
}

async function getAllPages(context) {
  return context.pages()
}

async function closeOtherPages(context, keepPage) {
  const pages = context.pages()
  for (const page of pages) {
    if (page !== keepPage) {
      await page.close()
    }
  }
}

module.exports = {
  waitForNewPage,
  getPageByUrl,
  getAllPages,
  closeOtherPages
}
