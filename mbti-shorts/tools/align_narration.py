#!/usr/bin/env python3
"""ナレーション音声 (WAV/MP3) を台本の行に自動で尺合わせする。

  python3 tools/align_narration.py \
      --audio output/SMS_SCAM/voice/narration_v1.wav \
      --script scripts/SMS_SCAM_v2_narration.txt \
      --out src/episodes/sms_scam/narration_times.js \
      [--json output/SMS_SCAM/voice/narration_v1_lines.json] \
      [--noise -38] [--min-sil 0.22] [--override 27:117.53:121.6 ...]

手順:
  1. ffmpeg の silencedetect で無音区間を検出し、発話セグメント列にする
  2. 台本の各行の文字数に比例した「期待尺」に対し、セグメントを行ごとに連続分割する DP
     (行 i に割り当てた区間の尺と期待尺の相対誤差の二乗和を最小化)
  3. `const NARR = [{id, s, e, t}, ...]` を書き出す。scene 側は L(n)=NARR[n-1].s で参照する

外部依存なし (ffmpeg のみ)。FFMPEG 環境変数でパスを指定できる。
"""
import argparse, json, math, os, re, subprocess, sys


def detect_speech(audio, noise_db, min_sil, ffmpeg):
    cmd = [ffmpeg, '-hide_banner', '-nostats', '-i', audio,
           '-af', f'silencedetect=noise={noise_db}dB:d={min_sil}', '-f', 'null', '-']
    p = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True)
    log = p.stderr
    dur = None
    m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', log)
    if m:
        dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
    if dur is None:
        sys.exit('ffmpeg から尺を取得できませんでした:\n' + log[-800:])
    # 無音区間 → 発話区間
    sil = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else dur
        sil.append((s, e))
    speech, cur = [], 0.0
    for s, e in sil:
        if s - cur > 0.05:
            speech.append([cur, s])
        cur = e
    if dur - cur > 0.05:
        speech.append([cur, dur])
    return speech, dur


def weight(text):
    """文字数ベースの発話コスト。句読点・記号は短い間 (0.5) として数える。"""
    w = 0.0
    for ch in text:
        if ch in '、。,.!?！？…「」『』 　':
            w += 0.5
        elif ch.isascii():
            w += 0.6            # 英数字 (SMS, URL) は1文字が短い
        else:
            w += 1.0
    return max(w, 1.0)


def align(speech, lines, gap_ref=0.6, gap_w=0.0):
    """セグメント列を行数 N の連続グループに分割 (DP)。"""
    M, N = len(speech), len(lines)
    if M < N:
        sys.exit(f'発話セグメント ({M}) が台本行数 ({N}) より少ないです。--noise を上げる / --min-sil を下げてください。')
    total = sum(e - s for s, e in speech)
    W = [weight(t) for t in lines]
    exp = [total * w / sum(W) for w in W]
    INF = float('inf')
    # dp[i][j] = 先頭 i 行に先頭 j セグメントを割り当てた最小コスト
    dp = [[INF] * (M + 1) for _ in range(N + 1)]
    bk = [[-1] * (M + 1) for _ in range(N + 1)]
    # 行内で結合する無音 (息継ぎ) は短いはず。長い無音を行内に抱き込むほどペナルティ
    gap = [0.0] + [speech[m][0] - speech[m - 1][1] for m in range(1, M)]
    gpen = [0.0] * (M + 1)                       # gpen[m] = gap[1..m-1] の累積ペナルティ
    for m in range(1, M):
        gpen[m + 1] = gpen[m] + (gap[m] / gap_ref) ** 2 * gap_w
    dp[0][0] = 0.0
    for i in range(1, N + 1):
        for j in range(i, M + 1):
            best, arg = INF, -1
            for k in range(i - 1, j):           # 行 i にセグメント k..j-1 を割り当て
                if dp[i - 1][k] == INF:
                    continue
                d = speech[j - 1][1] - speech[k][0]     # 間の無音も含めた区間尺
                internal = gpen[j] - gpen[k + 1]        # k..j-1 の内部ギャップ
                c = dp[i - 1][k] + math.log(max(d, 0.05) / exp[i - 1]) ** 2 + internal   # 対数比: 短すぎる割当を強く罰する
                if c < best:
                    best, arg = c, k
            dp[i][j], bk[i][j] = best, arg
    # 復元
    out, j = [], M
    for i in range(N, 0, -1):
        k = bk[i][j]
        out.append((speech[k][0], speech[j - 1][1]))
        j = k
    out.reverse()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio', required=True)
    ap.add_argument('--script', required=True, help='1行=1ナレーション行のテキスト')
    ap.add_argument('--out', required=True, help='narration_times.js の出力先')
    ap.add_argument('--json', help='行ごとの start/end を JSON でも保存')
    ap.add_argument('--noise', type=float, default=-38, help='無音判定しきい値 dB')
    ap.add_argument('--min-sil', type=float, default=0.22, help='無音の最短長 秒')
    ap.add_argument('--gap-ref', type=float, default=0.6, help='行内に含めてよい無音の目安 秒 (これを超えるほど別行と判断)')
    ap.add_argument('--gap-w', type=float, default=0.0, help='無音ペナルティの重み')
    ap.add_argument('--override', action='append', default=[], help='id:start:end で手動補正 (複数可)')
    a = ap.parse_args()
    ffmpeg = os.environ.get('FFMPEG', 'ffmpeg')

    lines = [l.strip() for l in open(a.script, encoding='utf-8') if l.strip()]
    speech, dur = detect_speech(a.audio, a.noise, a.min_sil, ffmpeg)
    print(f'audio {dur:.2f}s  speech segments {len(speech)}  script lines {len(lines)}')
    spans = align(speech, lines, a.gap_ref, a.gap_w)

    ov = {}
    for o in a.override:
        i, s, e = o.split(':')
        ov[int(i)] = (float(s), float(e))
    narr = []
    for i, (t, (s, e)) in enumerate(zip(lines, spans), 1):
        if i in ov:
            s, e = ov[i]
        narr.append({'id': i, 's': round(s, 2), 'e': round(e, 2), 't': t})
    for n in narr:
        print(f"{n['id']:3d} {n['s']:7.2f} - {n['e']:7.2f}  ({n['e'] - n['s']:4.2f}s)  {n['t']}")

    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    with open(a.out, 'w', encoding='utf-8') as f:
        f.write(f'// 自動生成: tools/align_narration.py  ({os.path.basename(a.audio)})\n')
        f.write('const NARR = ' + json.dumps(narr, ensure_ascii=False) + ';\n')
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            json.dump([{'id': n['id'], 'start': n['s'], 'end': n['e'], 'dur': round(n['e'] - n['s'], 2), 'text': n['t']} for n in narr], f, ensure_ascii=False, indent=1)
    print('wrote', a.out)


if __name__ == '__main__':
    main()
