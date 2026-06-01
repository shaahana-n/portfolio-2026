import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(__dirname, '..', '.cursor', 'debug-d8a0c2.log');
const pagePath = path.join(__dirname, '..', 'index.html');

function log(entry) {
  fs.appendFileSync(logPath, JSON.stringify({ sessionId: 'd8a0c2', timestamp: Date.now(), runId: 'agent-measure', ...entry }) + '\n');
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('file://' + pagePath);
await page.waitForLoadState('networkidle');

const cards = await page.evaluate(() => {
  function measureCard(selector, hypothesisId) {
    const card = document.querySelector(selector);
    if (!card) return { hypothesisId, error: 'not found', selector };
    const imageWrap = card.querySelector('.card-image');
    const media = card.querySelector('.card-image__media');
    const img = card.querySelector('.card-image img');
    const imageRect = imageWrap.getBoundingClientRect();
    const mediaRect = media?.getBoundingClientRect();
    const imgRect = img?.getBoundingClientRect();
    const imgStyle = img ? getComputedStyle(img) : null;
    const imageStyle = getComputedStyle(imageWrap);
    const naturalW = img?.naturalWidth || 0;
    const naturalH = img?.naturalHeight || 0;
    const containerAR = imageRect.width / imageRect.height;
    const naturalAR = naturalW && naturalH ? naturalW / naturalH : 0;
    const scaledContentH = naturalAR ? imageRect.width / naturalAR : 0;
    const verticalGap = imageRect.height - scaledContentH;
    return {
      hypothesisId,
      selector,
      src: img?.getAttribute('src') || null,
      container: { w: imageRect.width, h: imageRect.height, ar: containerAR },
      media: mediaRect ? { w: mediaRect.width, h: mediaRect.height } : null,
      imgBox: imgRect ? { w: imgRect.width, h: imgRect.height } : null,
      natural: { w: naturalW, h: naturalH, ar: naturalAR },
      computed: imgStyle ? {
        objectFit: imgStyle.objectFit,
        objectPosition: imgStyle.objectPosition,
        width: imgStyle.width,
        height: imgStyle.height,
      } : null,
      imageBackground: imageStyle.backgroundColor,
      expectedScaledContentH: scaledContentH,
      verticalGapPx: verticalGap,
      verticalGapPct: imageRect.height ? (verticalGap / imageRect.height) * 100 : 0,
    };
  }

  return [
    measureCard('a[href*="bubble-case-study"]', 'H1-H2'),
    measureCard('a[href*="meta-case-study"]', 'H1-H2-meta'),
    measureCard('.project-card--coinbase', 'H1-coinbase'),
  ];
});

for (const entry of cards) {
  log({ location: 'debug-bubble-layout.mjs', message: 'card layout measure', data: entry, hypothesisId: entry.hypothesisId });
}

await browser.close();
console.log('logged', cards.length, 'entries');
