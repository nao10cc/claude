// =====================================================================
//  v2 タイムライン — ナレーション (narration_times.js の NARR) に同期
//  L(n) = n行目の開始秒, LE(n) = 終了秒
// =====================================================================
const L = n => NARR[n - 1].s, LE = n => NARR[n - 1].e;
window.DURATION = 122.0;
// 追加ポーズ: 上を指す / 前下(スマホ)へ手を伸ばす / 相手の胸元を指す
const P_UP = Object.assign({}, P.point, { shR: 142, elR: -8, head: -10, torso: -6 });
const P_REACH = Object.assign({}, P.point, { shR: 44, elR: 22, torso: 10, head: 10 });
const P_AT = Object.assign({}, P.point, { shR: 56, elR: -4, head: 4 });

// ナレーション字幕 (行の開始〜終了+0.3秒)
function drawNarr(T) {
  const el = $('narr');
  const cur = window.__noNarr ? null : NARR.find(x => T >= x.s - 0.05 && T < x.e + 0.3);
  el.textContent = cur ? cur.t : '';
  el.style.display = cur ? '' : 'none';
  $('subs').style.display = 'none';
}

// 追加のスマホ画面: 銀行アプリ
const BANK_HTML = (pressed, done) => `
  <div class="bank-header"><div class="ic">🏦</div><div>みらい銀行<small style="display:block;font-size:24px;letter-spacing:.1em;color:#D6E4FF">アプリ</small></div></div>
  <div class="bank-bal"><div class="l">普通預金 残高</div><div class="v ${done ? 'ok' : ''}">${done ? '¥298,000' : '¥0'}</div></div>
  <div class="bank-btn ${pressed ? 'pressed' : ''}" id="bankBtn">🛑 カード・振込を緊急停止</div>
  <div class="bank-btn2">直近の取引を確認</div>
  ${done ? '<div class="bank-toast">✓ カードと振込を停止しました<br>オペレーターにおつなぎします</div>' : ''}`;

const HIDE_IDS = ['phone', 'banner', 'pauseDim', 'pauseIcon', 'dgTitle', 'diagram', 'dgCap', 'p1', 'p2', 'hook', 'title', 'urlCard', 'checklist', 'dayCard', 'end', 'tl1', 'tl2', 'scamRoom', 'paperSlip', 'phoneGlow',
  'b_yu1', 'b_rin1', 'b_yu2', 'b_yu3', 'b_rin2', 'b_rin3', 'b_yu4', 'b_yu5'];
function resetAll() {
  HIDE_IDS.forEach(id => show($(id), false));
  ['cursor', 'ripple'].forEach(id => { const e = $(id); if (e) show(e, false); });
  $('cam').style.transform = ''; $('cam').style.filter = ''; $('stage').style.transform = '';
  $('room').style.display = ''; $('rin').style.display = ''; $('yu').style.display = ''; $('sofaFront').style.display = ''; $('ctable').style.display = '';
  $('room').classList.add('night');
}
// 部屋の標準配置 (ユウ着席・リン不在)
function yuSit(pose, face, opts, T, dx = 0) {
  const bob = Math.sin(T * 2 * Math.PI * .5) * 3;
  setChara($('yu'), 'yu', Object.assign({}, pose, { bodyY: (pose.bodyY || 0) + bob }), face, Object.assign({ blink: blinkAt(T, .3) }, opts), YU.x + dx, YU.yTopSit);
}
function rinStand(pose, face, opts, T, x = RIN.x, flip = true) {
  const bob = Math.sin(T * 2 * Math.PI * .45) * 2;
  setChara($('rin'), 'rin', Object.assign({}, pose, { bodyY: (pose.bodyY || 0) + bob }), face, Object.assign({ blink: blinkAt(T, 1.1) }, opts), x, RIN.yTop, 1.1, flip);
}
function glowAt(x, y, on = true) { const g = $('phoneGlow'); show(g, on); place(g, x - 130, y - 130); }

const HIDE2 = ['aftermath', 'holdCard', 'qmark'];
const _resetAll = resetAll;
function resetAll2() { _resetAll(); HIDE2.forEach(id => show($(id), false)); $('rin').style.display = 'none'; $('yu').style.zIndex = ''; $('rin').style.zIndex = ''; $('aftermath').classList.remove('restored'); $('afPhone').classList.remove('down'); $('afMug').style.transform = ''; $('aftermath').style.opacity = 1; $('aftermath').style.transform = ''; $('yu').style.opacity = 1; $('room').style.opacity = 1; $('hook').style.background = ''; $('phone').style.filter = ''; $('monitor').style.boxShadow = ''; $('tl2').className = 'telop small hide'; $('tl2').textContent = ''; $('b_rin1').textContent = '何やってんの'; $('b_yu3').textContent = 'え？'; $('b_rin2').textContent = 'URL、見て'; $('p1').textContent = '認証コードは"本人確認"ではなく'; $('p2').textContent = 'あなたの口座の"鍵"'; $('dgTitle').textContent = '何が起きたのか'; }
function roomOnly() { /* 部屋を出す既定 */ }
function noRoom() { $('room').style.display = 'none'; $('yu').style.display = 'none'; $('rin').style.display = 'none'; $('sofaFront').style.display = 'none'; $('ctable').style.display = 'none'; }
function rinIn() { $('rin').style.display = ''; }
function props() { [['pudding', 320], ['tissue', 560], ['cocoa', 800]].forEach(() => {}); }

// ---- 0: 事後カット (L1) ----
function sAftermath(T) {
  noRoom(); show($('aftermath'), true);
  // 画面がゆっくり寄る + スマホ画面が明滅
  $('aftermath').style.transform = `scale(${tw(T, 0, 2.6, 1.0, 1.08, E.lin)})`;
  $('afPhone').querySelector('.scr').style.filter = `brightness(${1 + Math.sin(T * 9) * .08})`;
  // 0.6秒以降: ユウの顔アップを重ねる (右上から)
  if (T >= .6) {
    $('yu').style.display = '';
    setChara($('yu'), 'yu', Object.assign({}, P.shock, { torso: -6, head: -10 }), F('shock', { lookY: 8 }), {}, 540, 900, 1.1);
    cam(tw(T, .6, 1.1, 2.2, 2.6, E.outCubic), 540, 1090);
    $('yu').style.opacity = tw(T, .6, .8, 0, 1, E.lin);
    $('aftermath').style.opacity = tw(T, .6, .9, 1, .0, E.lin);
    $('room').style.display = ''; $('room').classList.add('night'); $('room').style.opacity = tw(T, .6, .9, 0, 1, E.lin);
    $('sofaFront').style.display = ''; $('ctable').style.display = '';
    shake(T, .62, 1.0, 10);
  } else { $('yu').style.display = 'none'; }
}
// ---- 1: 巻き戻し (L2) → 部屋 ----
function sRewind(T) {
  const t0 = L(2), t1 = t0 + 1.4;
  yuSit(P.phone, F('focus'), { held: 'phone' }, T); glowAt(YU.x + 24, 1040, true);
  if (T < t1) {
    cam(tw(T, t0, t1, 2.4, 1.0, E.inOutCubic), 540, 1040);
    show($('hook'), true); $('hook').style.background = 'transparent'; show($('hookCard'), false);
    show($('scan'), true); $('scan').style.opacity = .55 + Math.sin(T * 60) * .3; $('scan').style.backgroundPosition = `0 ${(T * 900) % 60}px`;
    pop($('rewindTxt'), T, t0 + .05, .3); $('rewindTxt').style.transform = `translate(-50%,-50%) scale(var(--s)) translateX(${Math.sin(T * 80) * 6}px)`;
  }
}
// ---- 2: 通知 (L3〜L4) ----
function sNotice(T) {
  const arrive = L(3) + 2.7;               // 「SMSが届いた」付近
  const talk = false;
  const lookUp = T >= arrive + .6;
  yuSit(lookUp ? Object.assign({}, P.phone, { head: -4, headY: -2 }) : P.phone, lookUp ? F('smile') : F('focus'), { held: 'phone' }, T);
  glowAt(YU.x + 24, 1040, true);
  banner(T, arrive, L(4) + .2, SMS_BANNER);
  const zoomStart = L(4) - .6;
  if (T >= zoomStart) cam(tw(T, zoomStart, L(4), 1, 2.6, E.inOutCubic), YU.x + 40, 1040);
  if (T >= L(4) - .1) {
    phone(SMS_HTML(false), 'sms'); const p = $('phone');
    p.style.transform = `scale(${tw(T, L(4) - .1, L(4) + .4, .6, 1, E.outBack)})`; p.style.opacity = tw(T, L(4) - .1, L(4) + .2, 0, 1, E.lin);
  }
}
// ---- 3: タップ (L5) ----
function sTap(T) {
  yuSit(P.phone, F('smile'), { held: 'phone' }, T); cam(2.6, YU.x + 40, 1040);
  const tapT = L(5) + 2.45; // 「押した」
  phone(SMS_HTML(T >= tapT), 'sms' + (T >= tapT ? 'h' : ''));
  $('phone').style.transform = ''; $('phone').style.opacity = 1;
  cursorAt(560, 700, T, L(5) + 1.2, tapT, tapT + 1.0);
  if (T >= tapT + .3) { let lb = $('phoneContent').querySelector('.loadbar'); if (!lb) { lb = document.createElement('div'); lb.className = 'loadbar'; $('phoneContent').appendChild(lb); } lb.style.width = tw(T, tapT + .3, L(6) - .1, 0, 868, E.inOutCubic) + 'px'; }
}
// ---- 4: 偽サイト (L6〜L7) ----
function sSite(T) {
  yuSit(P.phone2, F('focus'), { held: 'phone' }, T); cam(2.6, YU.x + 40, 1040);
  const t7 = L(7);
  const tel = typed('090 1234 5678', T, t7 + .3, 7), bd = typed('1998 / 04 / 12', T, t7 + 2.3, 8);
  const focus = T < t7 + 2.2 ? 1 : (T < LE(7) ? 2 : 0);
  const pressed = T >= LE(7) + .15 && T < LE(7) + .45;
  const toast = T >= LE(7) + .5;
  phone(SITE1_HTML(tel, bd, focus, pressed, toast), `s1|${tel}|${bd}|${focus}|${pressed}|${toast}`);
  $('phone').style.transform = ''; $('phone').style.opacity = 1;
  cursorAt(540, 1380, T, LE(7) - .3, LE(7) + .15, LE(7) + .7);
}
// ---- 5: リン登場 (L8) ----
function sRin(T) {
  const t0 = L(8); rinIn();
  yuSit(P.phone2, F('focus', { lookY: 8 }), { held: 'phone', talk: T >= t0 + 4.4 && T < t0 + 5.6, talkOpen: talkOpen(T) }, T); glowAt(YU.x + 24, 1040, true);
  const walkDur = 1.6;
  if (T < t0 + walkDur) rinStand(RIG.walk((T - t0) * 2.2), F('neutral'), {}, T, tw(T, t0, t0 + walkDur, 1180, RIN.x, E.lin), true);
  else rinStand(poseSeq(T, [[t0 + walkDur, P.stand], [t0 + walkDur + .1, P.handsHip]], .5), F('think', { lookX: -6, lookY: 4 }), { talk: T >= t0 + 1.7 && T < t0 + 2.8, talkOpen: talkOpen(T) }, T, RIN.x, true);
  const b1 = $('b_rin1'); place(b1, 700, 640); pop(b1, T, t0 + 1.7, .35, t0 + 4.3);
  const b2 = $('b_yu2'); place(b2, 470, 640); pop(b2, T, t0 + 4.4, .35, LE(8) + .4);
}
// ---- 6: 認証コード SMS (L9) ----
function sCode(T) {
  yuSit(P.phone2, F('focus'), { held: 'phone' }, T); cam(2.6, YU.x + 40, 1040);
  phone(SITE2_HTML('', false, false), 's2|||');
  $('phone').style.transform = ''; $('phone').style.opacity = 1;
  banner(T, L(9) + .2, LE(9) + .7, CODE_BANNER);
  const b = $('banner');
  const code = b.querySelector('.code'); if (code) { const em = T >= L(9) + 2.9 && T < L(9) + 4.6; code.style.transform = em ? `scale(${1 + .18 * Math.abs(Math.sin(T * 6))})` : ''; code.style.display = 'inline-block'; }
  const body = b.querySelector('.body'); if (body && T >= L(9) + 5.2) body.style.color = '#FF8A8A';
}
// ---- 7: 止まれるか → 入力 (L10〜L11) ----
function sInput(T) {
  yuSit(P.phone2, F('focus'), { held: 'phone' }, T); cam(2.6, YU.x + 40, 1040);
  const freezeEnd = L(10) + 2.3;
  const typeStart = freezeEnd + .1;
  const code = typed('483920', T, typeStart, 3.6);
  const tapT = L(11) + 1.6, procT = tapT + .5;
  const pressed = T >= tapT && T < tapT + .3;
  if (T < procT) phone(SITE2_HTML(code, T >= typeStart - .3, pressed), `s2|${code}|${T >= typeStart - .3}|${pressed}`); else { phone(PROC_HTML, 'proc'); spinner(T); }
  $('phone').style.transform = ''; $('phone').style.opacity = 1;
  if (T < freezeEnd) {
    $('cam').style.filter = `grayscale(${tw(T, L(10), L(10) + .3, 0, .7, E.lin)})`;
    $('phone').style.filter = `grayscale(${tw(T, L(10), L(10) + .3, 0, .7, E.lin)})`;
    const tl = $('tl2'); tl.textContent = 'ここで止められる人、何%？'; tl.className = 'telop'; tl.style.top = '520px'; pop(tl, T, L(10) + .1, .35);
  } else { $('phone').style.filter = ''; }
  cursorAt(540, 1130, T, tapT - .5, tapT, tapT + .6);
}
// ---- 8: 詐欺師の部屋 (L12) ----
function sScam(T) {
  noRoom(); show($('scamRoom'), true);
  const t0 = L(12), lt = T - t0;
  setChara($('scam'), 'scammer', Object.assign({}, P.phone2, { head: 12, bodyY: Math.sin(T * 3) * 2 }), F('neutral'), {}, 540, 380, 1.25);
  const lines = [[0.0, '<span class="dim">$ relay --target mirai-bank</span>'], [0.5, '<span class="dim">> phone:</span> 090-1234-5678'], [1.0, '<span class="dim">> otp  :</span> <span class="y">483920</span>'], [1.6, '<span class="ok">✓ 認証成功  ログイン完了</span>'], [2.1, '<span class="dim">> 送金先:</span> ****8821'], [2.5, '<span class="dim">> 金額  :</span> <span class="r">¥298,000</span>']];
  let html = lines.filter(([ts]) => lt >= ts).map(([, s]) => s).join('<br>');
  const execT = LE(12) - .5;
  if (lt >= 2.5) html += `<br><span class="exec ${T >= execT ? 'on' : ''}">実行</span>`; else html += ' <span class="caret" style="opacity:' + (Math.sin(lt * 12) > 0 ? 1 : 0) + '"></span>';
  $('monitor').innerHTML = html;
  if (T >= execT) shake(T, execT, execT + .3, 10);
}
// ---- 9: 残高ゼロ (L13) ----
function sZero(T) {
  const t0 = L(13); rinIn();
  const pose = poseSeq(T, [[t0 - 1, P.phone2], [t0 + .5, P.shock]], .45);
  yuSit(pose, T < t0 + .5 ? F('focus') : F('shock'), { held: T < t0 + .5 ? 'phone' : null }, T);
  rinStand(P.handsHip, F('think', { lookX: -6, lookY: 4 }), {}, T, RIN.x, true);
  glowAt(YU.x + 24, 1040, T < t0 + .5);
  banner(T, t0 + .1, L(14) + 1.8, BANK_BANNER);
  shake(T, t0 + .15, t0 + .6, 14);
  cam(tw(T, t0 + .5, t0 + 1.8, 1, 1.15, E.outCubic), YU.x, 900);
}
// ---- 10: リン「銀行。今すぐ」 (L14) ----
function sRinGo(T) {
  const t0 = L(14); rinIn();
  yuSit(P.shock, F('shock'), {}, T);
  rinStand(poseSeq(T, [[t0 - 5, P.handsHip], [t0 + .3, P_AT]], .4), F('angry', { lookX: -6, lookY: 6 }), { talk: T >= t0 + .8 && T < LE(14), talkOpen: talkOpen(T) }, T, RIN.x, true);
  banner(T, L(13) + .1, t0 + 1.8, BANK_BANNER);
  const b = $('b_rin1'); b.textContent = '銀行。今すぐ。'; place(b, 700, 640); pop(b, T, t0 + .8, .3, LE(14) + .5);
  cam(1.15, YU.x, 900);
}
// ---- 11: スマホを取って緊急停止 (L15) ----
function sStop(T) {
  const t0 = L(15); rinIn();
  const grab = t0 + 1.9;                 // 「スマホを取り」
  if (T < grab) {
    yuSit(Object.assign({}, P.phone2, { head: 18 + Math.sin(T * 14) * 3 }), F('panic', { lookX: Math.sin(T * 9) * 6, lookY: 6 }), { held: 'phone' }, T);
    rinStand(poseSeq(T, [[t0 - 5, P_AT], [grab - .5, P_REACH]], .4), F('angry', { lookX: -6, lookY: 8 }), {}, T, RIN.x, true);
    const b = $('b_yu3'); b.textContent = '番号どこ、どこ……'; place(b, 470, 640); pop(b, T, t0 + .3, .3, grab);
    cam(1.15, YU.x, 900);
  } else {
    yuSit(P.slump, F('panic', { lookX: 6 }), {}, T);
    rinStand(P.phone2, F('focus', { lookX: -4, lookY: 8 }), { held: 'phone' }, T, RIN.x - 60, true);
    const appT = grab + .6; // 全画面アプリ
    if (T >= appT) {
      const tapT = LE(15) - .5;
      const pressed = T >= tapT && T < tapT + .3, done = T >= tapT + .3;
      phone(BANK_HTML(pressed, done), `bank|${pressed}|${done}`);
      const p = $('phone'); p.style.transform = `scale(${tw(T, appT, appT + .4, .6, 1, E.outBack)})`; p.style.opacity = tw(T, appT, appT + .25, 0, 1, E.lin);
      cursorAt(540, 890, T, tapT - .6, tapT, tapT + .6);
    } else cam(tw(T, grab, appT, 1.15, 1.6, E.inOutCubic), RIN.x - 60, 1000);
  }
}
// ---- 12: 保留音 → 一時停止 (L16) ----
function sHold(T) {
  const t0 = L(16); rinIn();
  yuSit(P.call, F('panic'), { held: 'phoneCall' }, T);
  rinStand(P.armsCross, F('neutral', { lookX: -6, lookY: 4 }), {}, T, RIN.x, true);
  const fz = t0 + 1.2;
  if (T >= fz) { $('cam').style.filter = `grayscale(${tw(T, fz, fz + .4, 0, 1, E.lin)})`; show($('pauseDim'), true); $('pauseDim').style.opacity = tw(T, fz, fz + .5, 0, .85, E.lin); pop($('pauseIcon'), T, fz + .1, .3); }
}
// ---- 13: 図解 (L17〜L19) ----
function sDiagram(T) {
  rinIn(); yuSit(P.call, F('panic'), { held: 'phoneCall' }, 0); rinStand(P.armsCross, F('neutral'), {}, 0, RIN.x, true);
  $('cam').style.filter = 'grayscale(1)'; show($('pauseDim'), true); $('pauseDim').style.opacity = .85;
  const t0 = L(17) - .3;
  $('dgTitle').textContent = '起きていたこと'; pop($('dgTitle'), T, t0, .4);
  show($('diagram'), true); $('diagram').style.opacity = 1;
  pop($('nYu'), T, t0 + .2, .4); pop($('nSc'), T, t0 + .5, .4); pop($('nBk'), T, t0 + .8, .4);
  const draw = (id, ts, dur) => { const p = $(id); if (T < ts) { p.style.display = 'none'; return; } p.style.display = ''; const Ln = p.getTotalLength(); const u = clamp((T - ts) / dur, 0, 1); if (p.id === 'a2b') { p.style.strokeDasharray = '26 18'; p.style.opacity = u; } else { p.style.strokeDasharray = `${Ln} ${Ln}`; p.style.strokeDashoffset = (Ln * (1 - u)).toFixed(1); } };
  // L17: 偽サイトに入れた番号で → 詐欺師が銀行にログイン試行
  draw('a1', L(17) + .6, .6); pop($('l1'), T, L(17) + 1.0, .3);
  draw('a2', L(17) + 2.6, .8); pop($('l2'), T, L(17) + 3.2, .3);
  // L18: 銀行は本人のスマホに認証コードを送る
  draw('a2b', L(18) + .6, .8); pop($('l2b'), T, L(18) + 1.2, .3);
  // L19: それを偽サイトに打った瞬間 → 送金
  draw('a3', L(19) + .4, .6); pop($('l3'), T, L(19) + .8, .3);
  draw('a3b', L(19) + 2.2, .7); pop($('l3b'), T, L(19) + 2.7, .3);
  const zb = $('zeroBadge'); pop(zb, T, L(19) + 3.2, .3);
  const cap = $('dgCap'); show(cap, false);
  // 決め: 「口座の鍵」
  if (T >= L(19) + 3.4) { const p1 = $('p1'); p1.textContent = '認証コードは、'; p1.style.top = '1400px'; pop(p1, T, L(19) + 3.4, .35); const p2 = $('p2'); p2.textContent = '口座の鍵。'; p2.style.top = '1520px'; pop(p2, T, L(19) + 3.9, .4); window.__noNarr = true; }
}
// ---- 14: 電話がつながる (L20) ----
function sCall(T) {
  const t0 = L(20); rinIn();
  $('cam').style.filter = `grayscale(${tw(T, t0, t0 + .5, 1, 0, E.lin)})`;
  yuSit(P.call, F('panic'), { held: 'phoneCall', talk: T >= t0 + 2.6 && T < t0 + 5.3, talkOpen: talkOpen(T) }, T);
  rinStand(P.armsCross, F('neutral', { lookX: -6, lookY: 4 }), { talk: T >= t0 + 5.6 && T < LE(20), talkOpen: talkOpen(T) }, T, RIN.x, true);
  const b = $('b_yu4'); place(b, 470, 640); pop(b, T, t0 + 2.6, .3, t0 + 5.5);
  const r = $('b_rin2'); r.textContent = '送金の取消も。'; place(r, 700, 640); pop(r, T, t0 + 5.6, .3, LE(20) + .5);
}
// ---- 15: 確認します……長い数秒 (L21) ----
function sWait(T) {
  const t0 = L(21); rinIn();
  yuSit(P.call, F('panic', { eyes: 'wide' }), { held: 'phoneCall' }, T);
  rinStand(P.armsCross, F('neutral', { lookX: -6, lookY: 4 }), {}, T, RIN.x, true);
  const hc = $('holdCard'); pop(hc, T, t0 + .1, .4);
  const n = Math.min(3, 1 + Math.floor(Math.max(0, T - (t0 + 1.0)) / 0.7));
  hc.querySelector('.cnt').textContent = n; hc.querySelector('.bar i').style.left = ((T * 60) % 140 - 40) + '%';
  $('cam').style.filter = `saturate(${tw(T, t0, L(22), 1, .6, E.lin)})`;
  shake(T, L(22) - .4, L(22), 4);
}
// ---- 16: 送金失敗 (L22) ----
function sFail(T) {
  noRoom(); show($('scamRoom'), true);
  const t0 = L(22);
  const failT = t0 + 2.3, frozeT = t0 + 3.2, reportT = LE(22) + .3;
  const shocked = T >= failT + .2;
  setChara($('scam'), 'scammer', shocked ? Object.assign({}, P.shock, { head: -14, bodyY: -10 }) : Object.assign({}, P.phone2, { head: 12 }), F('neutral'), {}, 540, 380, 1.25);
  let html = '<span class="dim">> 送金 ¥298,000 …</span><br><span class="dim">処理中 ' + '.'.repeat(1 + Math.floor((T * 3) % 3)) + '</span>';
  if (T >= failT) html = '<span class="dim">> 送金 ¥298,000</span><br><span class="fail box">✗ 送金失敗</span>';
  if (T >= frozeT) html += '<br><span class="fail">受取口座: 凍結</span>';
  if (T >= reportT) html += '<br><span class="ok">■ 通報受理 #9110</span>';
  $('monitor').innerHTML = html;
  $('monitor').style.boxShadow = T >= failT ? `0 0 ${120 + Math.sin(T * 20) * 40}px rgba(255,80,80,.45)` : '';
  if (T >= failT) shake(T, failT, failT + .5, 16);
  const q = $('qmark'); pop(q, T, failT + .25, .3, reportT + 1.5);
}
// ---- 17: 戻った (L23) ----
function sBack(T) {
  const t0 = L(23); rinIn();
  const BACK = { icon: '🏦', color: '#2C6BE0', app: 'みらい銀行', title: '¥298,000 の送金を取り消しました', body: '残高 <span style="color:#3BB273;font-size:46px">¥298,000</span>' };
  banner(T, t0 - .1, L(24) + 1.6, BACK);
  yuSit(poseSeq(T, [[t0 - 1, P.call], [t0 + .2, P.slump]], .5), T < t0 + .2 ? F('panic') : F('sad', { eyes: 'normal', brows: 'up', mouth: 'smile' }), { held: T < t0 + .2 ? 'phoneCall' : null }, T);
  rinStand(P.handsHip, F('smug', { lookX: -6 }), {}, T, RIN.x, true);
}
// ---- 18: URL (L24) ----
function sUrl(T) {
  const t0 = L(24); rinIn();
  yuSit(P.slump, F('sad', { eyes: 'normal' }), {}, T);
  rinStand(poseSeq(T, [[t0 - 1, P.handsHip], [t0 + .3, P_UP]], .45), F('angry', { lookX: -4, lookY: -8 }), { talk: T >= t0 && T < LE(24), talkOpen: talkOpen(T) }, T, RIN.x, true);
  const card = $('urlCard'); pop(card, T, t0 + 2.0, .45, L(25) + 2.4);
  const rows = card.querySelectorAll('.row'), notes = card.querySelectorAll('.note');
  rows[0].style.opacity = 1; notes[0].style.opacity = T >= t0 + 4.4 ? 1 : 0;
  rows[1].style.opacity = T >= t0 + 5.9 ? 1 : .15; notes[1].style.opacity = T >= t0 + 7.2 ? 1 : 0;
  const hl = card.querySelectorAll('.hl'); hl[0].style.background = T >= t0 + 3.0 ? '#FFB3B3' : 'transparent'; hl[1].style.background = T >= t0 + 4.2 ? '#FFB3B3' : 'transparent';
}
// ---- 19: 押す前に、公式アプリ (L25) ----
function sRule(T) {
  rinIn(); yuSit(P.slump, F('neutral'), {}, T); rinStand(P.handsHip, F('smile', { lookX: -6 }), {}, T, RIN.x, true);
  const tl = $('tl1'); tl.style.top = '1160px'; pop(tl, T, L(25) + .2, .35);
  pop($('urlCard'), T, L(24) + 2.0, .45, L(25) + 2.4);
}
// ---- 20: 翌日 (L26) ----
function sNextDay(T) {
  const t0 = L(26); rinIn();
  if (T < t0 + .9) { show($('dayCard'), true); $('dayCard').style.opacity = tw(T, t0 - .15, t0, 0, 1, E.lin); yuSit(P.stand, F('neutral'), {}, T); rinStand(P.stand, F('neutral'), {}, T); return; }
  const lt = T - (t0 + .9);
  $('room').classList.remove('night');
  const ps = $('paperSlip'); if (lt >= .4) { show(ps, true); ps.style.left = tw(lt, .4, 1.0, 930, 800, E.outCubic) + 'px'; ps.style.transform = `rotate(${tw(lt, .4, 1.0, 0, -14)}deg)`; }
  if (lt >= 1.8) show(ps, false);
  const walking = lt >= .3 && lt < 1.6;
  const yuX = tw(lt, .3, 1.6, YU.x, 700, E.inOutCubic);
  const yuPose = lt < 1.8 ? P.stand : P.holdPaper;
  setChara($('yu'), 'yu', walking ? RIG.walk(lt * 2.4) : Object.assign({}, yuPose, { bodyY: Math.sin(T * 3) * 2 }), lt < 1.8 ? F('neutral') : F('dead'), { blink: blinkAt(T, .3), held: lt >= 1.9 ? 'paper' : null }, yuX, YU.yTopStand + 20, 1.1, false);
  $('sofaFront').style.display = 'none';
  rinStand(P.handsHip, F('neutral', { lookX: 6 }), {}, T, 330, false);
}
// ---- 21: 本物は、紙で来た → 回復カット → ループ (L27) ----
function sPaper(T) {
  const t0 = L(27); rinIn();
  const cutT = t0 + 1.9;
  if (T < cutT) {
    $('room').classList.remove('night'); $('sofaFront').style.display = 'none';
    setChara($('yu'), 'yu', Object.assign({}, P.holdPaper, { bodyY: Math.sin(T * 3) * 2 }), F('dead'), { blink: blinkAt(T, .3), held: 'paper' }, 700, YU.yTopStand + 20, 1.1, false);
    rinStand(P.handsHip, F('smug', { lookX: 6 }), {}, T, 330, false);
    cam(tw(T, t0, cutT, 1, 1.12, E.lin), 700, 1000);
  } else {
    noRoom(); show($('aftermath'), true); $('aftermath').classList.add('restored');
    $('afPhone').classList.add('down'); $('afMug').style.transform = 'rotate(0deg)';
    // 手がスマホを置く: 手が上から入って離れる
    $('afHand').style.transform = `rotate(-18deg) translate(${tw(T, cutT, cutT + 1.2, 260, 0, E.inOutCubic)}px, ${tw(T, cutT, cutT + 1.2, -160, 0, E.inOutCubic)}px)`;
    $('afSlips').querySelectorAll('.slip').forEach((el, i) => { el.style.transform = `rotate(${(i - 1) * 2}deg)`; el.style.left = (110 + i * 6) + 'px'; el.style.top = (120 + i * 8) + 'px'; });
    window.__noNarr = T >= cutT + .9;
    const tl = $('tl2'); tl.textContent = '同じSMS来た人 👋'; tl.className = 'telop blue'; tl.style.top = '380px'; pop(tl, T, cutT + .9, .35);
    const p2 = $('p2'); p2.textContent = '認証コードは、鍵。'; p2.style.top = '1400px'; pop(p2, T, cutT + 1.6, .4);
  }
}

// ===================== seek =====================
window.seek = function (T) {
  T = clamp(T, 0, window.DURATION - 1e-4);
  resetAll2(); window.__noNarr = false;
  let shot = '';
  if (T < L(2)) { shot = 'after'; sAftermath(T); }
  else if (T < L(3)) { shot = 'rewind'; sRewind(T); }
  else if (T < L(5)) { shot = 'notice'; sNotice(T); }
  else if (T < L(6)) { shot = 'tap'; sTap(T); }
  else if (T < L(8)) { shot = 'site'; sSite(T); }
  else if (T < L(9)) { shot = 'rin'; sRin(T); }
  else if (T < L(10)) { shot = 'code'; sCode(T); }
  else if (T < L(12)) { shot = 'input'; sInput(T); }
  else if (T < L(13)) { shot = 'scam'; sScam(T); }
  else if (T < L(14)) { shot = 'zero'; sZero(T); }
  else if (T < L(15)) { shot = 'ringo'; sRinGo(T); }
  else if (T < L(16)) { shot = 'stop'; sStop(T); }
  else if (T < L(17) - .3) { shot = 'hold'; sHold(T); }
  else if (T < L(20)) { shot = 'diagram'; sDiagram(T); }
  else if (T < L(21)) { shot = 'call'; sCall(T); }
  else if (T < L(22)) { shot = 'wait'; sWait(T); }
  else if (T < L(23)) { shot = 'fail'; sFail(T); }
  else if (T < L(24)) { shot = 'back'; sBack(T); }
  else if (T < L(25)) { shot = 'url'; sUrl(T); }
  else if (T < L(26) - .15) { shot = 'rule'; sRule(T); }
  else if (T < L(27)) { shot = 'nextday'; sNextDay(T); }
  else { shot = 'paper'; sPaper(T); }
  drawNarr(T);
  return shot;
};
(function () {
  const q = new URLSearchParams(location.search);
  if (q.has('play')) { const t0 = performance.now(); (function loop() { window.seek(((performance.now() - t0) / 1000) % window.DURATION); requestAnimationFrame(loop); })(); }
  else window.seek(parseFloat(q.get('t') || '0'));
})();
