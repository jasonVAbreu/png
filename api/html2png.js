import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Recomendado por @sparticuz en entornos serverless
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, x-api-key');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }

  // Body (por si llega como string)
  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const { html, width = 1080, height = 1080, scale = 2 } = body;
  if (!html) {
    res.status(400).json({ error: 'Falta "html"' });
    return;
  }

  try {
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath,
      headless: chromium.headless,
      defaultViewport: {
        width: Number(width),
        height: Number(height),
        deviceScaleFactor: Number(scale) || 1
      }
    });

    const page = await browser.newPage();

    // Evita que se quede colgado por recursos externos
    await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(300); // breve colchón para fuentes/imágenes

    const buffer = await page.screenshot({ type: 'png' });

    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(buffer);
  } catch (e) {
    console.error('html2png error:', e);
    res.status(500).json({ error: e.message });
  }
}
