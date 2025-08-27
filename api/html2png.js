import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// ❗ NO runtime edge aquí. Esto corre como Serverless Function Node.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    const { html, width = 1080, height = 1080, scale = 2 } = req.body || {};
    if (!html) {
      res.status(400).json({ error: 'Falta \"html\"' });
      return;
    }

    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: chromium.headless,
      defaultViewport: {
        width: Number(width),
        height: Number(height),
        deviceScaleFactor: Number(scale) || 1
      }
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const buffer = await page.screenshot({ type: 'png' });
    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
