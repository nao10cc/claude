#!/usr/bin/env node
/**
 * 出来上がった MP4 を Chromium の <video> で実際にデコードして検証する。
 * duration / 解像度を確認し、指定秒のフレームをスクリーンショットして書き出し、
 * 最後に通しでデコードできるかを確認する。
 *
 *   node src/verify_mp4.js --in output/INTJ/INTJ_short.mp4 --times 1,7,13,18,25,33,41,46 --out /tmp/verify
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : def; }
const IN = path.resolve(process.cwd(), arg('in', 'output/INTJ/INTJ_short.mp4'));
const OUT = path.resolve(process.cwd(), arg('out', '/tmp/verify'));
const TIMES = arg('times', '1,7,13,18,25,33,41,46').split(',').map(Number);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('console', m => console.log('console:', m.text()));
  await page.setContent('<html><body style="margin:0;background:#000"><video id="v" muted playsinline preload="auto" style="display:block;width:540px;height:960px"></video></body></html>');
  const b64 = fs.readFileSync(IN).toString('base64');
  const info = await page.evaluate(b64 => new Promise((res, rej) => {
    const v = document.getElementById('v');
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    v.src = URL.createObjectURL(new Blob([u], { type: 'video/mp4' }));
    v.onerror = () => rej(new Error('video error code=' + (v.error && v.error.code) + ' ' + (v.error && v.error.message)));
    v.onloadedmetadata = () => res({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    setTimeout(() => rej(new Error('metadata timeout')), 20000);
  }), b64);
  console.log('metadata:', JSON.stringify(info));
  for (const t of TIMES) {
    await page.evaluate(t => new Promise(res => { const v = document.getElementById('v'); v.onseeked = () => res(); v.currentTime = t; }), t);
    await page.screenshot({ path: path.join(OUT, `decoded_t${String(t).replace('.', '_')}.png`) });
  }
  const played = await page.evaluate(() => new Promise(res => {
    const v = document.getElementById('v'); v.playbackRate = 8; v.currentTime = 0;
    v.onended = () => { const q = v.getVideoPlaybackQuality(); res({ ended: true, decodedFrames: q.totalVideoFrames, dropped: q.droppedVideoFrames }); };
    setTimeout(() => { const q = v.getVideoPlaybackQuality(); res({ ended: false, currentTime: v.currentTime, decodedFrames: q.totalVideoFrames }); }, 60000);
    v.play().catch(e => res({ playError: String(e) }));
  }));
  console.log('playback:', JSON.stringify(played));
  await browser.close();
  console.log('screenshots ->', OUT);
})().catch(e => { console.error(e); process.exit(1); });
