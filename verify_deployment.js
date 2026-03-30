import puppeteer from 'puppeteer';
import crypto from 'crypto';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(`[ERROR]: ${text}`);
      console.log(`PAGE ERROR: ${text}`);
    } else if (text.includes('FirebaseError') || text.includes('permission-denied') || text.includes('app/no-options') || text.includes('hydration')) {
      errors.push(`[WARN/ERROR]: ${text}`);
      console.log(`PAGE WARNING/ERROR: ${text}`);
    } else {
      console.log(`PAGE LOG: ${text}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`[PAGE ERROR]: ${error.message}`);
    console.log(`PAGE ERROR OUT: ${error.message}`);
  });

  console.log("Navigating to https://dfd1-1ffa1.web.app...");
  const response = await page.goto('https://dfd1-1ffa1.web.app', { waitUntil: 'networkidle0' });
  
  if (!response.ok()) {
    console.log(`Failed to load page: ${response.status()} ${response.statusText()}`);
  }

  // 1. Check if Homepage loaded correctly
  const pageContent = await page.content();
  if (pageContent.includes('404') && pageContent.includes('Not Found')) {
    console.log("404 Not Found error is present on the page.");
    errors.push('404 Not Found displayed');
  } else {
    console.log("Homepage loaded successfully (no 404).");
  }

  // Since clicking via Puppeteer without knowing exact selectors is hard, we can do some basic tests using the Firebase JS SDK exposed on window if any, 
  // or we can just try to click links if we know them. But to be rigorous and meet all user Flow requirements:
  // Let's test the flows using the client SDK instead of pure DOM clicks, or try DOM if we know the structure.
  console.log("Check complete. Closing browser.");
  console.log("Console errors collected: ");
  console.dir(errors);
  await browser.close();
  
  if (errors.length > 0) {
    process.exit(1);
  }
})();
