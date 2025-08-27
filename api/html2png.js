// Forzamos runtime Node (¡no Edge!)
export const config = { runtime: 'nodejs20.x' };

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// Recomendado por Sparticuz
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

function deny(e, res, code = 400) {
  res.status(code).json({ ok: false, error: e });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return deny("Method Not Allowed", res, 405);
  }

  try {
    // (Opcional) API Key simple
    // Descomenta si quieres proteger el endpoint
    // const requiredKey = process.env.API_KEY;
    // if (requiredKey && req.headers["x-api-key"] !== requiredKey) {
    //   return deny("Unauthorized", res, 401);
    // }

    const isJson = (req.headers["content-type"] || "").includes("application/json");
    const input = req.method === "POST" && isJson ? req.body : req.query;

    const {
      html,
      url,
      width = 1080,
      height = 1080,
      scale = 1,
      fullPage = false,
      waitUntil = "networkidle0",
      format = "json",       // "json" | "png"
      omitBackground = true  // PNG transparente
    } = input || {};

    if (!html && !url) {
      return deny("Provide 'html' or 'url'", res, 400);
    }

    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ],
      defaultViewport: {
        width: Number(width),
        height: Number(height),
        deviceScaleFactor: Number(scale)
      },
      executablePath,
      headless: chromium.headless
    });

    try {
      const page = await browser.newPage();

      if (url) {
        await page.goto(url, { waitUntil });
      } else {
        const htmlWrapped = html.includes("<html")
          ? html
          : `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${html}</body></html>`;
        await page.setContent(htmlWrapped, { waitUntil });
      }

      const shotOptions = fullPage
        ? { type: "png", fullPage: true, omitBackground }
        : { type: "png", clip: { x: 0, y: 0, width: Number(width), height: Number(height) }, omitBackground };

      const pngBuffer = await page.screenshot(shotOptions);

      // Respuesta binaria PNG
      if (format === "png" || (req.headers.accept || "").includes("image/png")) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(pngBuffer);
      }

      // Respuesta JSON con data URI (ideal Power Automate)
      const base64 = pngBuffer.toString("base64");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({
        ok: true,
        size: pngBuffer.length,
        png: `data:image/png;base64,${base64}`
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("html2png error:", err);
    return deny(err.message || "Internal Error", res, 500);
  }
}
