/* =====================================================================
 *  SFX — Web Audio による効果音・BGM の部品ライブラリ (ブラウザ用)
 *  const k = SFX.kit(ctx, destination, verbSendNode)   // 効果音
 *  SFX.bgmLofi(ctx, dest, {from, to, bpm, prog, roots, drums})
 *  SFX.bgmTense(ctx, dest, {from, to})
 *  SFX.bgmPad(ctx, dest, {from, to, chords})
 * ===================================================================== */
const SFX = (() => {
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const noiseCache = new WeakMap();
  function noise(ctx) {
    if (noiseCache.has(ctx)) return noiseCache.get(ctx);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buf); return buf;
  }
  function impulse(ctx, sec, decay) {
    const buf = ctx.createBuffer(2, Math.ceil(sec * ctx.sampleRate), ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay); }
    return buf;
  }
  // 汎用: 発振器 + エンベロープ
  function tone(ctx, dest, { t, f, f2, type = 'sine', dur = .3, vel = .4, a = .005, curve = 'exp', detune = 0, filt }) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * .8);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + a);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0008, t + dur); else { g.gain.setValueAtTime(vel, t + dur - .02); g.gain.linearRampToValueAtTime(0, t + dur); }
    let last = o;
    if (filt) { const fl = ctx.createBiquadFilter(); fl.type = filt.type || 'lowpass'; fl.frequency.value = filt.f; fl.Q.value = filt.q || 1; o.connect(fl); last = fl; }
    last.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
  }
  function burst(ctx, dest, { t, dur = .1, vel = .4, type = 'bandpass', f = 2000, f2, q = 1, a = 0.002 }) {
    const n = ctx.createBufferSource(); n.buffer = noise(ctx);
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    n.connect(fl); fl.connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + dur + .02);
  }

  function kit(ctx, dest, verb) {
    const T = o => tone(ctx, dest, o), B = o => burst(ctx, dest, o);
    const K = {
      // 吹き出し
      pon: (t, f = 720, vel = .5) => T({ t, f, f2: f * .55, dur: .14, vel }),
      // 思考
      powan: (t, vel = .3) => [[520, .5], [780, .55], [1040, .6]].forEach(([f, d]) => { const o = ctx.createOscillator(); o.frequency.setValueAtTime(f * .9, t); o.frequency.linearRampToValueAtTime(f, t + .18); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel / 3, t + .05); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .05); }),
      // 低いインパクト
      don: (t, vel = .9, low = 60) => { T({ t, f: low * 2.6, f2: low, dur: .55, vel, a: .002 }); B({ t, dur: .3, vel: vel * .5, type: 'lowpass', f: 3000, f2: 200 }); },
      // スタンプ
      stamp: (t, vel = .7) => { B({ t, dur: .07, vel, f: 2600, q: 1.2 }); K.don(t + .005, .35, 90); },
      // 風切り
      whoosh: (t, dur = .45, vel = .4, up = true) => { const n = ctx.createBufferSource(); n.buffer = noise(ctx); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1; bp.frequency.setValueAtTime(up ? 400 : 2400, t); bp.frequency.exponentialRampToValueAtTime(up ? 2400 : 400, t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + dur * .5); g.gain.linearRampToValueAtTime(0, t + dur); n.connect(bp); bp.connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + dur + .02); },
      // ピッ
      pi: (t, f = 1300, vel = .3, dur = .06) => T({ t, f, type: 'square', dur, vel, curve: 'lin', filt: { f: 4000 } }),
      check: t => { K.pi(t, 1100, .3, .05); K.pi(t + .07, 1650, .3, .09); },
      // キラン
      kiran: (t, vel = .35) => [[2637, .9, 0], [3951, .8, .03], [5274, .6, .06]].forEach(([f, d, dl]) => T({ t: t + dl, f, dur: d, vel: vel / 3, a: .01 })),
      // コトン
      koton: (t, vel = .55, f = 240) => { T({ t, f, f2: f * .6, type: 'triangle', dur: .18, vel, a: .002 }); B({ t, dur: .05, vel: vel * .5, type: 'lowpass', f: 1200 }); },
      // ---- このエピソード向け ----
      // スマホ通知「ピロン」
      piron: (t, vel = .45) => { T({ t, f: 1318, dur: .18, vel, a: .004 }); T({ t: t + .09, f: 1760, dur: .35, vel: vel * .9, a: .004 }); },
      // 警告っぽい通知 (銀行)
      alert: (t, vel = .5) => { T({ t, f: 880, dur: .16, vel, type: 'triangle', a: .003 }); T({ t: t + .16, f: 880, dur: .16, vel, type: 'triangle', a: .003 }); T({ t: t + .34, f: 660, dur: .5, vel: vel * .9, type: 'triangle', a: .003 }); },
      // タップ
      tap: (t, vel = .4) => { B({ t, dur: .04, vel, type: 'lowpass', f: 2500 }); T({ t, f: 900, f2: 500, dur: .05, vel: vel * .6, a: .002 }); },
      // 文字入力のカチカチ
      key: (t, vel = .22) => { B({ t, dur: .03, vel, type: 'highpass', f: 3500 }); T({ t, f: 1800 + Math.random() * 400, dur: .03, vel: vel * .5, curve: 'lin' }); },
      // ページ読み込みのスピナー
      tick: (t, vel = .12) => T({ t, f: 2400, dur: .03, vel, curve: 'lin', type: 'square', filt: { f: 5000 } }),
      // 成功音 (皮肉)
      success: (t, vel = .4) => { T({ t, f: 1046, dur: .25, vel, a: .004 }); T({ t: t + .12, f: 1568, dur: .5, vel, a: .004 }); },
      // 失敗ブザー / 残高ゼロ
      buzz: (t, vel = .5) => { for (let i = 0; i < 2; i++) T({ t: t + i * .22, f: 180, type: 'sawtooth', dur: .18, vel, curve: 'lin', filt: { f: 900 } }); T({ t: t + .5, f: 220, f2: 70, type: 'sine', dur: 1.2, vel: vel * .9, a: .01 }); },
      // 巻き戻し「キュルル」
      rewind: (t, dur = .8, vel = .35) => { const n = ctx.createBufferSource(); n.buffer = noise(ctx); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6; bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(3200, t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .05); g.gain.setValueAtTime(vel, t + dur - .08); g.gain.linearRampToValueAtTime(0, t + dur); n.connect(bp); bp.connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + dur + .02); for (let i = 0; i < 12; i++) T({ t: t + i * dur / 12, f: 500 + i * 180, dur: .05, vel: .12, type: 'square', curve: 'lin', filt: { f: 3000 } }); },
      // 一時停止「カチッ」
      click: (t, vel = .35) => { B({ t, dur: .03, vel, f: 3000, q: 2 }); T({ t, f: 2200, f2: 1200, dur: .04, vel: vel * .5, curve: 'lin' }); },
      // 心拍
      heart: (t, vel = .6) => { T({ t, f: 90, f2: 45, dur: .2, vel, a: .003 }); T({ t: t + .22, f: 80, f2: 40, dur: .25, vel: vel * .75, a: .003 }); },
      // ドアチャイム「ピンポーン」
      doorbell: (t, vel = .4) => { T({ t, f: 1318, dur: .5, vel, a: .005 }); T({ t: t + .35, f: 1046, dur: .9, vel, a: .005 }); },
      // 紙が滑る
      paper: (t, vel = .3) => B({ t, dur: .25, vel, type: 'bandpass', f: 2200, f2: 900, q: .8, a: .05 }),
      // ぺち (フェイスパーム)
      pechi: (t, vel = .45) => { B({ t, dur: .05, vel, type: 'lowpass', f: 1500 }); T({ t, f: 300, f2: 120, dur: .12, vel: vel * .6 }); },
      // コインが消える「シャリン↓」
      coins: (t, vel = .3) => { for (let i = 0; i < 6; i++) T({ t: t + i * .05, f: 3000 - i * 300, dur: .18, vel: vel * (1 - i * .12), type: 'triangle', a: .002 }); },
      // 図解ノードのポップ
      node: (t, vel = .35) => T({ t, f: 600, f2: 900, dur: .12, vel, type: 'triangle', a: .004 }),
      arrow: (t, vel = .25) => K.whoosh(t, .3, vel, true),
      // 決めゼリフの余韻
      shimmer: (t, vel = .12, dur = 2.5) => { [72, 76, 79, 84].forEach((m, i) => { const o = ctx.createOscillator(); o.frequency.value = NOTE(m); const g = ctx.createGain(); g.gain.setValueAtTime(0, t + i * .08); g.gain.linearRampToValueAtTime(vel, t + i * .08 + .4); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(verb || dest); o.start(t); o.stop(t + dur + .1); }); },
      stab: (t, notes, vel = .18, dur = 1.4) => notes.forEach((m, i) => T({ t: t + i * .01, f: NOTE(m), type: 'triangle', dur, vel, a: .01 })),
    };
    return K;
  }

  // ---------------- BGM ----------------
  function bgmLofi(ctx, dest, { from = 0, to = 48, bpm = 84, prog, roots, drums = true, vel = 1 }) {
    const BEAT = 60 / bpm, BAR = BEAT * 4;
    prog = prog || [[57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71]];
    roots = roots || [45, 50, 43, 48];
    const bus = ctx.createGain(); bus.gain.value = vel;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; bus.connect(lp); lp.connect(dest);
    const rhodes = (t, midi, dur, v) => {
      const f = NOTE(midi);
      const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f; o1.detune.value = (Math.random() - .5) * 8;
      const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
      const g1 = ctx.createGain(), g2 = ctx.createGain();
      g1.gain.setValueAtTime(0, t); g1.gain.linearRampToValueAtTime(v, t + .012); g1.gain.exponentialRampToValueAtTime(v * .55, t + .45); g1.gain.exponentialRampToValueAtTime(v * .22, t + dur - .15); g1.gain.linearRampToValueAtTime(0, t + dur);
      g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(v * .18, t + .008); g2.gain.exponentialRampToValueAtTime(.0008, t + dur * .7);
      o1.connect(g1); o2.connect(g2); g1.connect(bus); g2.connect(bus); o1.start(t); o2.start(t); o1.stop(t + dur + .05); o2.stop(t + dur + .05);
    };
    const pad = (t, midi, dur, v) => { t = Math.max(0, t); for (const [type, det, gm] of [['sine', -6, 1], ['triangle', 6, .35]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = NOTE(midi); o.detune.value = det; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * gm, t + .6); g.gain.setValueAtTime(v * gm, t + dur - .6); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .05); } };
    const bass = (t, midi, dur, v = .5) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = NOTE(midi); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .015); g.gain.setValueAtTime(v, t + dur * .6); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .05); };
    const kick = (t, v = .9) => { const o = ctx.createOscillator(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .28); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .3); };
    const snare = (t, v = .5) => { burst(ctx, bus, { t, dur: .16, vel: v, f: 1900, q: .8 }); tone(ctx, bus, { t, f: 210, f2: 120, type: 'triangle', dur: .09, vel: v * .5, a: .002 }); };
    const hat = (t, v = .15) => burst(ctx, bus, { t, dur: .045, vel: v, type: 'highpass', f: 7500 });
    // 小節グリッドは from を起点にする (絶対グリッドだと最初の小節が丸ごと欠けて無音が生じる)
    for (let b = 0, t0 = from; t0 < to; b++, t0 = from + b * BAR) {
      const chord = prog[b % prog.length], root = roots[b % roots.length];
      chord.forEach((n, i) => rhodes(t0 + i * .012, n, BEAT * 2.5 + .1, .13));
      chord.forEach((n, i) => rhodes(t0 + BEAT * 2.5 + i * .012, n, BEAT * 1.5 + .1, .10));
      chord.slice(0, 3).forEach(n => pad(t0 - .2, n, BAR + .4, .028));
      bass(t0, root, BEAT * 1.4); bass(t0 + BEAT * 1.5, root, BEAT * .9, .34); bass(t0 + BEAT * 2.5, root, BEAT * .9, .42); bass(t0 + BEAT * 3.5, root + (b % 2 ? 7 : 0), BEAT * .5, .36);
      if (drums) {
        const sw = .055;
        kick(t0); kick(t0 + BEAT * 1.75 + sw, .7); kick(t0 + BEAT * 2.5, .85);
        snare(t0 + BEAT, .5); snare(t0 + BEAT * 3, .55);
        for (let h = 0; h < 8; h++) hat(t0 + h * BEAT / 2 + (h % 2 ? sw : 0), h % 2 ? .13 : .2);
      }
    }
    return bus;
  }

  // 緊張感: 低いドローン + 8分のアルペジオ + 心拍風キック
  function bgmTense(ctx, dest, { from, to, bpm = 100, root = 45, vel = 1 }) {
    const bus = ctx.createGain(); bus.gain.value = vel; bus.connect(dest);
    const BEAT = 60 / bpm;
    // ドローン
    for (const [m, g, type] of [[root - 12, .16, 'sawtooth'], [root - 12, .1, 'sine'], [root - 5, .06, 'sawtooth']]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = NOTE(m); o.detune.value = (Math.random() - .5) * 6;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const gg = ctx.createGain(); gg.gain.setValueAtTime(0, from); gg.gain.linearRampToValueAtTime(g, from + .8); gg.gain.setValueAtTime(g, to - .5); gg.gain.linearRampToValueAtTime(0, to);
      o.connect(lp); lp.connect(gg); gg.connect(bus); o.start(from); o.stop(to + .05);
    }
    // アルペジオ (minor)
    const seq = [0, 3, 7, 10, 12, 10, 7, 3];
    let i = 0;
    for (let t = from; t < to; t += BEAT / 2, i++) {
      const acc = (t - from) / (to - from);
      tone(ctx, bus, { t, f: NOTE(root + 12 + seq[i % seq.length]), type: 'square', dur: .18, vel: .07 + acc * .06, curve: 'exp', filt: { f: 1400 + acc * 2200 } });
    }
    // 心拍キック (だんだん速く)
    let t = from;
    while (t < to) {
      const acc = (t - from) / (to - from);
      tone(ctx, bus, { t, f: 120, f2: 40, dur: .3, vel: .45 + acc * .3, a: .003 });
      tone(ctx, bus, { t: t + .25, f: 100, f2: 38, dur: .28, vel: .3 + acc * .25, a: .003 });
      t += Math.max(.55, 1.1 - acc * .5);
    }
    return bus;
  }

  // 落ち着いた解説用パッド
  function bgmPad(ctx, dest, { from, to, chords, barSec = 3.2, vel = 1, hats = true }) {
    const bus = ctx.createGain(); bus.gain.value = vel; bus.connect(dest);
    chords = chords || [[60, 64, 67, 71], [57, 60, 64, 67], [65, 69, 72, 76], [55, 59, 62, 67]];
    let b = 0;
    for (let t = from; t < to; t += barSec, b++) {
      const ch = chords[b % chords.length];
      ch.forEach((m, i) => { for (const [type, det, gm] of [['sine', -5, 1], ['triangle', 5, .3]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = NOTE(m); o.detune.value = det; const g = ctx.createGain(); const d = Math.min(barSec + .5, to - t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06 * gm, t + .5); g.gain.setValueAtTime(.06 * gm, t + d - .5); g.gain.linearRampToValueAtTime(0, t + d); o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .05); } });
      tone(ctx, bus, { t, f: NOTE(ch[0] - 24), dur: barSec * .9, vel: .22, a: .02 });
      if (hats) for (let h = 0; h < 8; h++) if (t + h * barSec / 8 < to) burst(ctx, bus, { t: t + h * barSec / 8, dur: .04, vel: h % 2 ? .06 : .1, type: 'highpass', f: 8000 });
    }
    return bus;
  }

  return { NOTE, noise, impulse, tone, burst, kit, bgmLofi, bgmTense, bgmPad };
})();
