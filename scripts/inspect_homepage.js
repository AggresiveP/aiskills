const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const cookiesPath = path.join(__dirname, 'cookies.json');
  if (fs.existsSync(cookiesPath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);
  }

  await page.goto('https://aiskills.nation.dev/', { waitUntil: 'networkidle2' });
  const text = await page.evaluate(() => document.body.innerText);
  console.log('--- HOMEPAGE TEXT ---');
  console.log(text);
  console.log('---------------------');

  await page.screenshot({ path: path.join(__dirname, 'homepage_current.png') });
  await browser.close();
}

run().catch(err => console.error(err));
