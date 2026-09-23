#!/usr/bin/env node
/**
 * 連番PNG → (Chromium WebCodecs VideoEncoder / VP9) → MP4
 *
 *   node src/encode_mp4.js --frames output/INTJ/frames --fps 24 --out output/INTJ/INTJ_short.mp4 [--bitrate 7000000]
 *
 * ffmpeg / libx264 が使えない環境向け。Chromium 内蔵の VP9 エンコーダで圧縮し、
 * mp4mux.js の最小マルチプレクサで .mp4 (vp09) に格納する。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const { muxMp4 } = require('./mp4mux');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : def; }
const FRAMES = path.resolve(process.cwd(), arg('frames', 'output/INTJ/frames'));
const OUT = path.resolve(process.cwd(), arg('out', 'output/INTJ/INTJ_short.mp4'));
const FPS = parseFloat(arg('fps', '24'));
const BITRATE = parseInt(arg('bitrate', '7000000'), 10);
const GOP = parseInt(arg('gop', String(Math.round(FPS * 2))), 10);

const ENCODER_PAGE = `<!DOCTYPE html><html><body><script>
window.encodeAll = async ({ files, fps, width, height, bitrate, gop }) => {
  const codec = 'vp09.00.40.08';
  const cfg = { codec, width, height, bitrate, framerate: fps, latencyMode: 'quality', bitrateMode: 'variable' };
  const sup = await VideoEncoder.isConfigSupported(cfg);
  if (!sup.supported) throw new Error('VP9 not supported: ' + JSON.stringify(cfg));
  let pending = 0, done = 0, err = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => {
      const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf);
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      window.__onChunk(btoa(bin), chunk.type === 'key', chunk.timestamp);
      done++;
    },
    error: e => { err = e; },
  });
  enc.configure(cfg);
  for (let i = 0; i < files.length; i++) {
    if (err) throw err;
    const resp = await fetch('/frames/' + files[i]);
    const bmp = await createImageBitmap(await resp.blob());
    const frame = new VideoFrame(bmp, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(frame, { keyFrame: i % gop === 0 });
    frame.close(); bmp.close();
    while (enc.encodeQueueSize > 3) await new Promise(r => setTimeout(r, 5));
    if (i % 48 === 0) window.__progress(i, files.length);
  }
  await enc.flush();
  enc.close();
  if (err) throw err;
  return done;
};
</script></body></html>`;

(async () => {
  const files = fs.readdirSync(FRAMES).filter(f => /^frame_\d+\.png$/.test(f)).sort();
  if (!files.length) throw new Error('no frames in ' + FRAMES);
  // PNG ヘッダから解像度を読む
  const head = fs.readFileSync(path.join(FRAMES, files[0])).subarray(16, 24);
  const width = head.readUInt32BE(0), height = head.readUInt32BE(4);
  console.log(`frames=${files.length} ${width}x${height} fps=${FPS} bitrate=${BITRATE} gop=${GOP}`);

  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/encoder.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(ENCODER_PAGE); }
    if (url.startsWith('/frames/')) {
      const fp = path.join(FRAMES, path.basename(url));
      if (!fs.existsSync(fp)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': 'image/png' });
      return fs.createReadStream(fp).pipe(res);
    }
    res.writeHead(404); res.end();
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const samples = [];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.exposeFunction('__onChunk', (b64, key, ts) => { samples.push({ data: Buffer.from(b64, 'base64'), key, ts }); });
  const t0 = Date.now();
  await page.exposeFunction('__progress', (i, n) => console.log(`[encode ${i}/${n}] ${((Date.now() - t0) / 1000).toFixed(1)}s`));
  page.on('pageerror', e => console.error('pageerror', e));
  await page.goto(`http://127.0.0.1:${port}/encoder.html`);
  const n = await page.evaluate(opts => window.encodeAll(opts), { files, fps: FPS, width, height, bitrate: BITRATE, gop: GOP });
  await browser.close();
  server.close();

  samples.sort((a, b) => a.ts - b.ts);
  if (samples.length !== files.length) console.warn(`warning: ${samples.length} chunks for ${files.length} frames`);
  const mp4 = muxMp4({ codec: 'vp09', width, height, fps: FPS, samples: samples.map(s => ({ data: s.data, key: s.key })) });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, mp4);
  const sec = samples.length / FPS;
  console.log(`wrote ${OUT}  ${(mp4.length / 1e6).toFixed(2)} MB  ${sec.toFixed(2)}s  ${(mp4.length * 8 / sec / 1e6).toFixed(2)} Mbps  keyframes=${samples.filter(s => s.key).length}  in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch(e => { console.error(e); process.exit(1); });
