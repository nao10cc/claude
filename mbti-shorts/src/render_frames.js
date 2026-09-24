#!/usr/bin/env node
/**
 * scene.html を Playwright(Chromium) で開き、seek(t) を 1コマずつ呼んで PNG に書き出す。
 *
 *   node src/render_frames.js --out output/INTJ/frames --fps 24
 *   node src/render_frames.js --preview 1.0,5.2,12.0 --out output/INTJ/storyboard   # 指定秒だけ
 *
 * 環境変数 NODE_PATH にグローバル node_modules（playwright）が通っている前提。
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const SCENE_ARG = arg('scene', null);
const SCENE = SCENE_ARG ? path.resolve(process.cwd(), SCENE_ARG) : path.resolve(__dirname, 'scene.html');
const OUT = path.resolve(process.cwd(), arg('out', 'output/INTJ/frames'));
const FPS = parseFloat(arg('fps', '24'));
const PREVIEW = arg('preview', null);
const W = 1080, H = 1920;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto('file://' + SCENE);
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => window.DURATION);

  let times;
  if (PREVIEW) {
    times = PREVIEW.split(',').map(Number);
  } else {
    const n = Math.round(duration * FPS);
    times = Array.from({ length: n }, (_, i) => i / FPS);
  }

  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const shot = await page.evaluate(t => window.seek(t), t);
    const name = PREVIEW ? `t${t.toFixed(2).replace('.', '_')}_${shot}.png` : `frame_${String(i).padStart(5, '0')}.png`;
    await page.screenshot({ path: path.join(OUT, name), type: 'png', caret: 'hide' });
    if (!PREVIEW && (i % 96 === 0 || i === times.length - 1)) {
      const el = (Date.now() - t0) / 1000;
      console.log(`[${i + 1}/${times.length}] t=${t.toFixed(2)}s shot=${shot} elapsed=${el.toFixed(1)}s`);
    }
  }
  await browser.close();
  console.log(`done: ${times.length} frames -> ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
