import chromium from "@sparticuz/chromium";
waitUntil = "networkidle0",
format = "json", // "json" | "png"
omitBackground = true // transp.
} = input || {};


if (!html && !url) {
return res.status(400).json({ error: "Provide 'html' or 'url'" });
}


const executablePath = await chromium.executablePath();


const browser = await puppeteer.launch({
args: chromium.args,
defaultViewport: {
width: Number(width),
height: Number(height),
deviceScaleFactor: Number(scale)
},
executablePath,
headless: chromium.headless,
});


try {
const page = await browser.newPage();


if (url) {
await page.goto(url, { waitUntil });
} else {
// Asegura margin:0 para ocupar todo el viewport si quieres clip exacto
const htmlWrapped = html.includes("<html")
? html
: `<!doctype html><html><head><meta charset=\"utf-8\"></head><body style=\"margin:0\">${html}</body></html>`;
await page.setContent(htmlWrapped, { waitUntil });
}


const shotOptions = fullPage
? { type: "png", fullPage: true, omitBackground }
: { type: "png", clip: { x: 0, y: 0, width: Number(width), height: Number(height) }, omitBackground };


const pngBuffer = await page.screenshot(shotOptions);


if (format === "png" || (req.headers.accept || "").includes("image/png")) {
res.setHeader("Content-Type", "image/png");
res.setHeader("Cache-Control", "no-store");
return res.status(200).send(pngBuffer);
}


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
console.error(err);
return res.status(500).json({ ok: false, error: err.message });
}
}
