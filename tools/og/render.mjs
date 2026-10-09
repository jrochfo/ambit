// Renders tools/og/og.html to public/og.png (needs `npm run dev` running).
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
page.on('pageerror', (e) => console.log('error:', e.message));
await page.goto('http://localhost:5173/tools/og/og.html');
await page.waitForSelector('body[data-ready]');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: new URL('../../public/og.png', import.meta.url).pathname });
await browser.close();
console.log('wrote public/og.png');
