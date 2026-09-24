/* =====================================================================
 *  RIG — Vyond 風 2D パペットリグ (SVG 文字列を返す純関数群)
 *
 *  viewBox 0 0 400 800。足元 y≈790、頭頂 y≈100。
 *  pose  : 関節角(度)と姿勢の数値。lerpPose で補間できる
 *  face  : 目・眉・口などの状態(文字列)と数値
 *  def   : キャラ定義(配色・髪型・服)
 *
 *  角度の向き: 腕は「体から外側へ開く」が正、肘は「内側へ曲げる」が正。
 *  脚は「画面左へ振る」が正(側面歩行風に見せる)。
 * ===================================================================== */
const RIG = (() => {
  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---------------- ポーズライブラリ ----------------
  const P = {
    stand:   { torso: 0, head: 0, headY: 0, bodyY: 0, shL: 8, elL: 6, shR: 8, elR: 6, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0, kuL: 1, kfL: 1, kuR: 1, kfR: 1 },
    relax:   { torso: -3, head: 4, headY: 0, bodyY: 0, shL: 6, elL: 10, shR: 6, elR: 10, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    // スマホを胸の前で持つ(右手)。左手はだらり
    phone:   { torso: 4, head: 14, headY: 4, bodyY: 0, shL: 6, elL: 12, shR: 38, elR: 136, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    phone2:  { torso: 6, head: 18, headY: 6, bodyY: 0, shL: 38, elL: 136, shR: 38, elR: 136, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 }, // 両手で操作
    call:    { torso: 0, head: -6, headY: 0, bodyY: 0, shL: 8, elL: 6, shR: 160, elR: 132, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0, kuR: .8, kfR: .5 },   // 電話を耳に
    point:   { torso: -4, head: -4, headY: 0, bodyY: 0, shL: 8, elL: 6, shR: 100, elR: -10, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    pointL:  { torso: -4, head: 4, headY: 0, bodyY: 0, shL: 95, elL: -10, shR: 8, elR: 6, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    shrug:   { torso: 0, head: 6, headY: 6, bodyY: 0, shL: 42, elL: 112, shR: 42, elR: 112, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    facepalm:{ torso: 6, head: 16, headY: 8, bodyY: 0, shL: 8, elL: 6, shR: 172, elR: 40, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0, kuR: .6, kfR: .5 },
    shock:   { torso: -10, head: -12, headY: -6, bodyY: -6, shL: 120, elL: -30, shR: 120, elR: -30, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    slump:   { torso: 10, head: 24, headY: 10, bodyY: 8, shL: 4, elL: 2, shR: 4, elR: 2, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    think:   { torso: 2, head: 8, headY: 2, bodyY: 0, shL: 8, elL: 6, shR: -20, elR: 142, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0, kuR: .6 },
    armsCross:{ torso: -2, head: -2, headY: 0, bodyY: 0, shL: 18, elL: 118, shR: 18, elR: 118, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    handsHip:{ torso: -3, head: -3, headY: 0, bodyY: 0, shL: 40, elL: 76, shR: 40, elR: 76, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    holdPaper:{ torso: 4, head: 14, headY: 4, bodyY: 0, shL: 38, elL: 106, shR: 38, elR: 106, hipL: 0, kneeL: 0, hipR: 0, kneeR: 0 },
    walkA:   { torso: 2, head: 0, headY: 0, bodyY: -6, shL: 26, elL: 30, shR: -18, elR: 20, hipL: 28, kneeL: 10, hipR: -26, kneeR: 40 },
    walkB:   { torso: 2, head: 0, headY: 0, bodyY: -6, shL: -18, elL: 20, shR: 26, elR: 30, hipL: -26, kneeL: 40, hipR: 28, kneeR: 10 },
  };
  function lerpPose(a, b, u) {
    u = clamp(u, 0, 1);
    const o = {};
    for (const k of Object.keys(P.stand)) { const d = P.stand[k]; o[k] = lerp(a[k] ?? d, b[k] ?? a[k] ?? d, u); }
    return o;
  }
  // 歩行サイクル: phase 0..1
  function walk(phase) {
    const u = (Math.sin(phase * Math.PI * 2) + 1) / 2;
    const p = lerpPose(P.walkA, P.walkB, u);
    p.bodyY = -6 - Math.abs(Math.sin(phase * Math.PI * 2)) * 10;
    return p;
  }

  // ---------------- 顔 ----------------
  const F = {
    neutral: { eyes: 'normal', brows: 'neutral', mouth: 'neutral', lookX: 0, lookY: 0, blush: 0, sweat: 0 },
    smile:   { eyes: 'normal', brows: 'neutral', mouth: 'smile', lookX: 0, lookY: 0, blush: 0, sweat: 0 },
    happy:   { eyes: 'happy', brows: 'up', mouth: 'grin', lookX: 0, lookY: 0, blush: .5, sweat: 0 },
    focus:   { eyes: 'half', brows: 'neutral', mouth: 'neutral', lookX: 0, lookY: 6, blush: 0, sweat: 0 },
    shock:   { eyes: 'wide', brows: 'up', mouth: 'O', lookX: 0, lookY: 0, blush: 0, sweat: 1 },
    panic:   { eyes: 'wide', brows: 'sad', mouth: 'open', lookX: 0, lookY: 0, blush: 0, sweat: 1 },
    sad:     { eyes: 'half', brows: 'sad', mouth: 'frown', lookX: 0, lookY: 4, blush: 0, sweat: 0 },
    angry:   { eyes: 'normal', brows: 'angry', mouth: 'flat', lookX: 0, lookY: 0, blush: 0, sweat: 0 },
    smug:    { eyes: 'half', brows: 'one', mouth: 'smirk', lookX: -3, lookY: 0, blush: 0, sweat: 0 },
    think:   { eyes: 'normal', brows: 'one', mouth: 'flat', lookX: 4, lookY: -4, blush: 0, sweat: 0 },
    dead:    { eyes: 'dot', brows: 'sad', mouth: 'wobble', lookX: 0, lookY: 0, blush: 0, sweat: 1 },
  };
  function face(name, over) { return Object.assign({}, F[name] || F.neutral, over || {}); }

  // ---------------- キャラ定義 ----------------
  const CHARS = {
    yu:  { skin: '#F2C9A6', hair: '#6B4226', top: '#2FA4A9', topDark: '#238589', bottom: '#3A4A6B', shoes: '#F4F4F4', style: 'messy', hoodie: true, lips: '#B5674E' },
    rin: { skin: '#F6D5B8', hair: '#2A2430', top: '#E2B23A', topDark: '#C2952A', bottom: '#33323F', shoes: '#2A2430', style: 'bob', hoodie: false, lips: '#C96A6A' },
    scammer: { skin: '#1E2230', hair: '#14161F', top: '#2B2F3A', topDark: '#1F222B', bottom: '#1A1C24', shoes: '#111', style: 'hood', hoodie: true, lips: '#1E2230', silhouette: true },
  };

  // ---------------- 描画 ----------------
  const rr = (x, y, w, h, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

  function limbArm(def, side, sh, el, held, ku = 1, kf = 1) {
    // side: 'L' (画面左) | 'R'
    const sx = side === 'L' ? 140 : 260, sy = 325;
    const sgn = side === 'L' ? 1 : -1;
    const a = sgn * sh, b = -sgn * el;
    let hand = `<circle cx="0" cy="118" r="17" fill="${def.skin}"/>`;
    if (held === 'phone' && side === 'R') hand += `<g transform="translate(0,118) rotate(${-b - a + 10})"><rect x="-22" y="-44" width="44" height="80" rx="7" fill="#1B1D26"/><rect x="-18" y="-38" width="36" height="66" rx="4" fill="#E9F3FF"/></g>`;
    if (held === 'phoneCall' && side === 'R') hand += `<g transform="translate(0,118) rotate(${-b - a})"><rect x="-22" y="-44" width="44" height="80" rx="7" fill="#1B1D26"/></g>`;
    if (held === 'paper' && side === 'R') hand += `<g transform="translate(0,118) rotate(${-b - a})"><rect x="-70" y="-50" width="140" height="90" rx="3" fill="#FFF8E6" stroke="#D8CDB4" stroke-width="2"/><rect x="-52" y="-30" width="104" height="6" fill="#C9C1AE"/><rect x="-52" y="-14" width="80" height="6" fill="#C9C1AE"/><rect x="-52" y="2" width="96" height="6" fill="#C9C1AE"/><rect x="-52" y="18" width="60" height="6" fill="#E5484D"/></g>`;
    const UL = 130 * ku, FL = 118 * kf;
    return `<g transform="translate(${sx},${sy}) rotate(${a})">
      ${rr(-16, -6, 32, UL + 8, 16, def.top)}
      <g transform="translate(0,${UL}) rotate(${b})">
        ${rr(-14, -4, 28, FL + 6, 14, def.top)}
        <g transform="translate(0,${FL - 118})">${hand}</g>
      </g></g>`;
  }
  function limbLeg(def, side, hip, knee) {
    const hx = side === 'L' ? 180 : 220, hy = 505;
    return `<g transform="translate(${hx},${hy}) rotate(${hip})">
      ${rr(-21, -10, 42, 160, 20, def.bottom)}
      <g transform="translate(0,150) rotate(${knee})">
        ${rr(-18, -6, 36, 136, 16, def.bottom)}
        <ellipse cx="4" cy="132" rx="34" ry="16" fill="${def.shoes}"/><rect x="-26" y="112" width="52" height="24" rx="10" fill="${def.shoes}"/>
      </g></g>`;
  }

  function hairBack(def) {
    if (def.style === 'bob') return `<path d="M118 200 Q112 96 200 96 Q288 96 282 200 L288 285 Q250 300 200 300 Q150 300 112 285 Z" fill="${def.hair}"/>`;
    if (def.style === 'hood') return `<path d="M105 215 Q105 80 200 80 Q295 80 295 215 L300 330 H100 Z" fill="${def.top}"/>`;
    return '';
  }
  function hairFront(def) {
    if (def.style === 'messy') return `<path d="M120 178 Q112 108 170 100 Q190 84 214 98 Q250 86 262 116 Q292 120 284 176 L268 160 Q258 140 240 150 Q220 128 196 146 Q176 128 158 150 Q140 138 134 164 Z" fill="${def.hair}"/>`;
    if (def.style === 'bob') return `<path d="M118 196 Q116 104 200 100 Q284 104 282 196 L268 190 Q262 146 236 150 L196 176 Q170 138 148 158 Q134 170 132 194 Z" fill="${def.hair}"/>`;
    if (def.style === 'hood') return `<path d="M120 225 Q120 118 200 112 Q280 118 280 225 L296 240 Q296 96 200 92 Q104 96 104 240 Z" fill="${def.topDark}"/>`;
    return '';
  }

  function faceSVG(def, f) {
    if (def.silhouette) {
      // 影のキャラ: 目だけ光る
      return `<ellipse cx="172" cy="196" rx="12" ry="5" fill="#9EF7FF" opacity=".9"/><ellipse cx="228" cy="196" rx="12" ry="5" fill="#9EF7FF" opacity=".9"/>`;
    }
    const INK = '#2A2430';
    const lx = f.lookX || 0, ly = f.lookY || 0;
    let eyes = '';
    const eye = (cx) => {
      switch (f.eyes) {
        case 'wide': return `<ellipse cx="${cx}" cy="186" rx="21" ry="26" fill="#fff"/><circle cx="${cx + lx}" cy="${188 + ly}" r="9" fill="${INK}"/><circle cx="${cx + lx + 3}" cy="${183 + ly}" r="3" fill="#fff"/>`;
        case 'half': return `<ellipse cx="${cx}" cy="188" rx="16" ry="19" fill="#fff"/><circle cx="${cx + lx}" cy="${192 + ly}" r="8" fill="${INK}"/><path d="M${cx - 17} 170 h34 v14 h-34z" fill="${def.skin}"/><path d="M${cx - 16} 184 h32" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
        case 'closed': return `<path d="M${cx - 14} 190 q14 8 28 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
        case 'happy': return `<path d="M${cx - 15} 194 q15 -22 30 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
        case 'dot': return `<circle cx="${cx}" cy="190" r="5" fill="${INK}"/>`;
        default: return `<ellipse cx="${cx}" cy="188" rx="16" ry="20" fill="#fff"/><circle cx="${cx + lx}" cy="${190 + ly}" r="8" fill="${INK}"/><circle cx="${cx + lx + 3}" cy="${186 + ly}" r="2.5" fill="#fff"/>`;
      }
    };
    eyes = eye(170) + eye(230);
    let brows = '';
    const bw = 5;
    switch (f.brows) {
      case 'up': brows = `<path d="M150 146 q20 -14 40 -2" stroke="${INK}" stroke-width="${bw}" fill="none" stroke-linecap="round"/><path d="M250 146 q-20 -14 -40 -2" stroke="${INK}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`; break;
      case 'angry': brows = `<path d="M150 150 l40 12" stroke="${INK}" stroke-width="${bw}" stroke-linecap="round"/><path d="M250 150 l-40 12" stroke="${INK}" stroke-width="${bw}" stroke-linecap="round"/>`; break;
      case 'sad': brows = `<path d="M150 162 l40 -10" stroke="${INK}" stroke-width="${bw}" stroke-linecap="round"/><path d="M250 162 l-40 -10" stroke="${INK}" stroke-width="${bw}" stroke-linecap="round"/>`; break;
      case 'one': brows = `<path d="M150 158 q20 -8 40 -2" stroke="${INK}" stroke-width="${bw}" fill="none" stroke-linecap="round"/><path d="M250 142 q-20 -12 -40 0" stroke="${INK}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`; break;
      default: brows = `<path d="M150 158 q20 -10 40 -2" stroke="${INK}" stroke-width="${bw}" fill="none" stroke-linecap="round"/><path d="M250 158 q-20 -10 -40 -2" stroke="${INK}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`;
    }
    const nose = `<path d="M198 204 q8 12 -2 18" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>`;
    let mouth = '';
    switch (f.mouth) {
      case 'smile': mouth = `<path d="M180 238 q20 22 40 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`; break;
      case 'grin': mouth = `<path d="M176 236 q24 30 48 0 z" fill="${def.lips}"/><path d="M182 238 h36 v6 q-18 6 -36 0z" fill="#fff"/>`; break;
      case 'open': mouth = `<ellipse cx="200" cy="244" rx="15" ry="13" fill="${def.lips}"/><ellipse cx="200" cy="250" rx="8" ry="5" fill="#E5484D"/>`; break;
      case 'talk': mouth = `<ellipse cx="200" cy="243" rx="13" ry="9" fill="${def.lips}"/>`; break;
      case 'O': mouth = `<circle cx="200" cy="246" r="11" fill="${def.lips}"/>`; break;
      case 'frown': mouth = `<path d="M182 250 q18 -18 36 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`; break;
      case 'flat': mouth = `<path d="M184 244 h32" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`; break;
      case 'smirk': mouth = `<path d="M182 244 q22 12 38 -6" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`; break;
      case 'wobble': mouth = `<path d="M178 246 q6 -8 12 0 t12 0 t12 0 t12 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`; break;
      default: mouth = `<path d="M186 244 q14 6 28 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    const blush = f.blush ? `<ellipse cx="150" cy="222" rx="16" ry="8" fill="#F29AA0" opacity="${.6 * f.blush}"/><ellipse cx="250" cy="222" rx="16" ry="8" fill="#F29AA0" opacity="${.6 * f.blush}"/>` : '';
    const sweat = f.sweat ? `<path d="M286 150 q-16 26 0 40 q16 -14 0 -40z" fill="#8FD3FF" opacity="${f.sweat}"/>` : '';
    return brows + eyes + nose + mouth + blush + sweat;
  }

  /**
   * character(defName, pose, face, opts)
   *   opts.held  : 'phone' | 'phoneCall' | 'paper' | null
   *   opts.blink : 0..1
   *   opts.talk  : boolean (口を talk 状態に)
   *   opts.flip  : 左向き
   */
  function character(defName, pose, f, opts = {}) {
    const def = CHARS[defName];
    const p = Object.assign({}, P.stand, pose);
    f = Object.assign({}, F.neutral, f);
    if (opts.blink > 0.5 && f.eyes !== 'happy' && f.eyes !== 'dot') f = Object.assign({}, f, { eyes: 'closed' });
    if (opts.talk) f = Object.assign({}, f, { mouth: opts.talkOpen ? 'talk' : (f.mouth === 'smile' || f.mouth === 'grin' ? 'smile' : 'neutral') });
    const hood = def.hoodie && def.style !== 'hood'
      ? `<path d="M128 330 Q130 300 160 296 Q200 330 240 296 Q270 300 272 330 Z" fill="${def.topDark}"/><path d="M186 320 v40" stroke="#E7F6F6" stroke-width="5" stroke-linecap="round"/><path d="M214 320 v40" stroke="#E7F6F6" stroke-width="5" stroke-linecap="round"/>`
      : '';
    const flip = opts.flip ? 'translate(400,0) scale(-1,1)' : '';
    return `<svg viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" overflow="visible"><g transform="${flip}"><g transform="translate(0,${p.bodyY})">
      ${limbLeg(def, 'L', p.hipL, p.kneeL)}
      ${limbLeg(def, 'R', p.hipR, p.kneeR)}
      <g transform="rotate(${p.torso} 200 505)">
        <path d="M130 332 Q130 304 158 304 H242 Q270 304 270 332 L264 518 H136 Z" fill="${def.top}"/>
        <path d="M136 518 h128 l-4 -40 h-120z" fill="${def.topDark}" opacity=".35"/>
        <rect x="184" y="262" width="32" height="60" rx="10" fill="${def.skin}"/>
        ${hood}
        <g transform="rotate(${p.head} 200 300) translate(0,${p.headY})">
          ${hairBack(def)}
          <circle cx="122" cy="200" r="13" fill="${def.skin}"/><circle cx="278" cy="200" r="13" fill="${def.skin}"/>
          <ellipse cx="200" cy="190" rx="80" ry="90" fill="${def.skin}"/>
          ${faceSVG(def, f)}
          ${hairFront(def)}
        </g>
        ${limbArm(def, 'L', p.shL, p.elL, opts.held, p.kuL, p.kfL)}
        ${limbArm(def, 'R', p.shR, p.elR, opts.held, p.kuR, p.kfR)}
      </g>
    </g></g></svg>`;
  }

  return { P, F, CHARS, lerpPose, walk, face, character, lerp, clamp };
})();
