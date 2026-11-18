// Render specific times to PNGs for checking: node snap.js 3.5 10 ... [--w 540 --h 960]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const args = process.argv.slice(2); let w = 540, h = 960, shells = 18; const times = [];
  for (let i = 0; i < args.length; i++) { if (args[i] === '--w') w = +args[++i]; else if (args[i] === '--h') h = +args[++i]; else if (args[i] === '--shells') shells = +args[++i]; else times.push(+args[i]); }
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  p.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await p.goto(`http://localhost:8123/scene/index.html?w=${w}&h=${h}&shells=${shells}&aa=${process.env.AA || 1}`);
  await p.waitForFunction(() => window.READY, null, { timeout: 120000 });
  fs.mkdirSync('snaps', { recursive: true });
  for (const t of times) {
    const t0 = Date.now();
    const b64 = await p.evaluate((f) => window.renderFrame(f), Math.round(t * 30));
    fs.writeFileSync(`snaps/t${t.toFixed(2)}.jpg`, Buffer.from(b64, 'base64'));
    console.log('t', t, (Date.now() - t0) + 'ms');
  }
  await b.close();
})();
