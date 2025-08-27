import { chromium } from '@playwright/test';

export const config = { runtime: 'edge' }; // Vercel Edge/Playwright soportado

export default async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405 });
    }
    const { html, width = 1080, height = 1080, scale = 2 } = await req.json();

    if (!html) {
      return new Response(JSON.stringify({ error: 'Falta "html"' }), { status: 400 });
    }

    const browser = await chromium.launch();
    const context = await browser.newContext({
      deviceScaleFactor: Number(scale) || 1,
      viewport: { width: Number(width), height: Number(height) }
    });
    const page = await context.newPage();

    // Carga HTML directamente en memoria
    await page.setContent(html, { waitUntil: 'networkidle' });

    const buffer = await page.screenshot({ type: 'png' });
    await browser.close();

    return new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': 'image/png' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
