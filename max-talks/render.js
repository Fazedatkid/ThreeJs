// Render all frames to frames/NNNNN.jpg (resumable). Usage: node render.js [start] [end]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const W = 1080, H = 1920;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await p.goto(`http://localhost:8123/scene/index.html?w=${W}&h=${H}&shells=18`);
  await p.waitForFunction(() => window.READY, null, { timeout: 180000 });
  const total = await p.evaluate(() => window.TOTAL_FRAMES);
  const start = +(process.argv[2] || 0), end = Math.min(total, +(process.argv[3] || total));
  fs.mkdirSync('frames', { recursive: true });
  const t0 = Date.now(); let done = 0;
  for (let f = start; f < end; f++) {
    const out = `frames/${String(f).padStart(5, '0')}.jpg`;
    if (fs.existsSync(out)) continue;
    const b64 = await p.evaluate((n) => window.renderFrame(n), f);
    fs.writeFileSync(out + '.tmp', Buffer.from(b64, 'base64')); fs.renameSync(out + '.tmp', out);
    done++;
    if (f % 25 === 0) { const per = (Date.now() - t0) / done / 1000; console.log(`frame ${f}/${end}  ${per.toFixed(2)}s/frame  eta ${((end - f) * per / 60).toFixed(1)} min`); }
  }
  console.log('DONE'); await b.close();
})();
