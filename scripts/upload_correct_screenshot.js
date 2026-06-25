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

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('analyze-screenshot')) {
      console.log(`RESPONSE URL: ${url}`);
      console.log(`STATUS: ${response.status()}`);
      try {
        const json = await response.json();
        console.log('JSON RESPONSE:', json);
      } catch (e) {
        console.log('Could not read response JSON');
      }
    }
  });

  const cookiesPath = path.join(__dirname, 'cookies.json');
  if (fs.existsSync(cookiesPath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);
  }

  await page.goto('https://aiskills.nation.dev/level1/first-prompt', { waitUntil: 'networkidle2' });

  // Locate the file input
  console.log('Locating file input...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('Uploading chatbot screenshot file...');
    const screenshotPath = path.join(__dirname, 'chatbot_screenshot.png');
    await fileInput.uploadFile(screenshotPath);
    await page.evaluate(() => {
      const el = document.querySelector('input[type="file"]');
      if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  console.log('Waiting 5 seconds for verification response...');
  await new Promise(r => setTimeout(r, 5000));

  // Let's check the verification result text on the page
  const verificationText = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, p, span'));
    const verifyEl = elements.find(el => el.innerText.includes('verified') || el.innerText.includes('verified!') || el.innerText.includes('feedback'));
    return verifyEl ? verifyEl.innerText : 'Verification text element not found';
  });
  console.log('Page verification status text:', verificationText);

  // Click Continue to save progress and update XP
  console.log('Clicking Continue button...');
  await page.evaluate(() => {
    const continueBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.trim() === 'Continue');
    if (continueBtn) {
      continueBtn.click();
    }
  });

  console.log('Waiting 5 seconds after Continue...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('Current URL:', page.url());
  const finalText = await page.evaluate(() => document.body.innerText);
  console.log('--- FINAL PAGE TEXT ---');
  console.log(finalText.substring(0, 1000));
  console.log('------------------------');

  await browser.close();
}

run().catch(err => console.error(err));
