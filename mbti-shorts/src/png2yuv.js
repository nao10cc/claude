#!/usr/bin/env node
/**
 * 連番PNG → yuv420p (BT.709, TV レンジ) の生ストリームを stdout に書く。
 * ffmpeg の swscale を通さずに色変換するための予備ルート。
 *
 *   node src/png2yuv.js --frames output/INTJ/frames | ffmpeg -f rawvideo -pix_fmt yuv420p -s 1080x1920 -framerate 24 -i - ...
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : def; }
const FRAMES = path.resolve(process.cwd(), arg('frames', 'output/INTJ/frames'));

const PAGE = `<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
window.toYuv = async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const W = img.width, H = img.height;
  const c = document.getElementById('c'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H * 3 / 2);
  const Uo = W * H, Vo = Uo + (W * H) / 4;
  // Y (BT.709, limited range)
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    out[i] = Math.round(16 + 219 * y / 255);
  }
  // Cb/Cr: 2x2 平均
  for (let yy = 0, k = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2, k++) {
    let r = 0, g = 0, b = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const p = ((yy + dy) * W + (xx + dx)) * 4; r += d[p]; g += d[p + 1]; b += d[p + 2]; }
    r /= 4; g /= 4; b /= 4;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    out[Uo + k] = Math.round(128 + 224 * ((b - y) / 1.8556) / 255);
    out[Vo + k] = Math.round(128 + 224 * ((r - y) / 1.5748) / 255);
  }
  let bin = ''; for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return btoa(bin);
};
</script></body></html>`;

(async () => {
  const files = fs.readdirSync(FRAMES).filter(f => /^frame_\d+\.png$/.test(f)).sort();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(PAGE);
  const t0 = Date.now();
  for (let i = 0; i < files.length; i++) {
    const b64 = fs.readFileSync(path.join(FRAMES, files[i])).toString('base64');
    const yuv = Buffer.from(await page.evaluate(b => window.toYuv(b), b64), 'base64');
    await new Promise((res, rej) => process.stdout.write(yuv, e => e ? rej(e) : res()));
    if (i % 96 === 0) process.stderr.write(`[png2yuv ${i}/${files.length}] ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  }
  await browser.close();
  process.stderr.write(`png2yuv done: ${files.length} frames\n`);
})().catch(e => { console.error(e); process.exit(1); });
