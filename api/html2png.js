import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Use POST' });
      return;
    }

    // En Vercel (Node serverless) el body viene parseado si envías Content-Type: application/json
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

    // Evita quedarse colgado por assets externos:
    await page.setContent(html, {
      waitUntil: 'load',     // más laxo que 'networkidle0'
      timeout: 15000         // 15s de tope
    });

    // Pequeña espera por si hay fuentes/imágenes tardías
    await page.waitForTimeout(500);

    const buffer = await page.screenshot({ type: 'png' });

    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(buffer);
  } catch (e) {
    // Log visible en Vercel → Functions → Logs
    console.error('html2png error:', e);
    res.status(500).json({ error: e.message });
  }
}
