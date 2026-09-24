#!/usr/bin/env node
/**
 * audio.html (Web Audio で BGM+SE をコード生成) を Chromium で描画して WAV に書き出す。
 *
 *   node src/render_audio.js --out output/INTJ/INTJ_audio.wav
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : def; }
const SRC_ARG = arg('src', null);
const SRC = SRC_ARG ? path.resolve(process.cwd(), SRC_ARG) : path.resolve(__dirname, 'audio.html');
const OUT = path.resolve(process.cwd(), arg('out', 'output/INTJ/INTJ_audio.wav'));
const VOICE = arg('voice', null);   // ナレーション WAV (16bit PCM) を page に base64 で渡す
const MIX = arg('mix', null);       // 例: '{"bgm":0}'

function wavHeader(dataLen, sampleRate, channels) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + dataLen, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * channels * 2, 28); h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(dataLen, 40);
  return h;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('pageerror', e));
  await page.goto('file://' + SRC);
  const t0 = Date.now();
  const voiceB64 = VOICE ? fs.readFileSync(path.resolve(process.cwd(), VOICE)).toString('base64') : null;
  const mix = MIX ? JSON.parse(MIX) : null;
  const r = await page.evaluate(([m, v]) => window.renderAudio(m, v), [mix, voiceB64]);
  await browser.close();
  const pcm = Buffer.from(r.pcm16, 'base64');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.concat([wavHeader(pcm.length, r.sampleRate, r.channels), pcm]));
  const sec = pcm.length / (r.sampleRate * r.channels * 2);
  console.log(`wrote ${OUT}  ${sec.toFixed(2)}s  ${r.sampleRate}Hz x${r.channels}  peakBefore=${r.peakBefore.toFixed(3)}  in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch(e => { console.error(e); process.exit(1); });
