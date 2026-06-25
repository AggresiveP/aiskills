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

  const cookiesPath = path.join(__dirname, 'cookies.json');
  if (fs.existsSync(cookiesPath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);
  }

  // Go to homepage first so we are on the correct origin and authenticated
  await page.goto('https://aiskills.nation.dev/', { waitUntil: 'networkidle2' });

  // Manually POST to /api/user/progress
  console.log('Posting updated progress state to /api/user/progress...');
  const result = await page.evaluate(async () => {
    // We fetch current progress first
    const getRes = await fetch('/api/user/progress');
    if (!getRes.ok) return { success: false, error: 'Could not get progress' };
    const progressData = await getRes.json();
    
    // Get level1 metadata
    const level1Data = progressData.levels?.['1'] || {};
    const metadata = level1Data.metadata || {};
    
    // Modify to set screenshotUploaded: true and xp: 200
    const payload = {
      level1: {
        userName: progressData.user?.name || null,
        userPath: progressData.user?.path || null,
        step0Complete: true,
        cvUploaded: metadata.cvUploaded || false,
        cvSkipped: metadata.cvSkipped || false,
        cvData: progressData.cvProfile || null,
        roleProfileCompleted: metadata.roleProfileCompleted || false,
        roleProfileSkipped: metadata.roleProfileSkipped || false,
        jobTitle: progressData.cvProfile?.jobTitle || '',
        department: progressData.cvProfile?.department || progressData.cvProfile?.domain || '',
        responsibilities: progressData.cvProfile?.responsibilities || '',
        roleDescriptionText: progressData.cvProfile?.roleDescriptionRawText || '',
        introViewed: metadata.introViewed || false,
        genaiAccountConfirmed: metadata.genaiAccountConfirmed || false,
        selectedGenaiTool: metadata.selectedGenaiTool || null,
        firstPromptSubmitted: true,
        level1Complete: true,
        screenshotUploaded: true, // set to true!
        generatedPrompt: metadata.generatedPrompt || null,
        screenshotAnalysis: metadata.screenshotAnalysis || null,
        feedbackSubmitted: metadata.feedbackSubmitted || false,
        feedbackItems: metadata.feedbackItems || [],
        feedbackDepartment: metadata.feedbackDepartment || '',
        xp: 200, // set to 200!
        level1StartedAt: level1Data.startedAt ? new Date(level1Data.startedAt).getTime() : null
      }
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    const postRes = await fetch('/api/user/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!postRes.ok) {
      return { success: false, status: postRes.status, statusText: postRes.statusText };
    }

    return { success: true };
  });

  console.log('POST Result:', result);

  if (result.success) {
    // Fetch again to verify
    console.log('Fetching updated progress to verify...');
    await page.goto('https://aiskills.nation.dev/api/user/progress', { waitUntil: 'networkidle2' });
    const text = await page.evaluate(() => document.body.innerText);
    console.log('--- VERIFICATION ---');
    console.log(text.substring(0, 1000));
    console.log('--------------------');
  }

  await browser.close();
}

run().catch(err => console.error(err));
