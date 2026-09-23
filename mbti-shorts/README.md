# MBTI ショートドラマ・アニメーション

MBTI 16タイプを1タイプずつ縦型ショートアニメ（1080×1920 / 24fps / 約48秒）にするプロジェクト。
第1弾は **INTJ「INTJの友達に失恋相談した結果」**。

| 成果物 | パス |
|---|---|
| 完成動画 (MP4 / VP9) | `output/INTJ/INTJ_short.mp4` |
| 絵コンテ（代表13コマ） | `output/INTJ/storyboard/` |
| 台本・タイムライン | `scripts/INTJ_script.md` |
| バズ調査メモ | `research/INTJ_viral_research.md` |
| AI画像生成に差し替える場合のプロンプト集 | `docs/ai_image_prompts.md` |

## 制作フロー（「1コマずつ生成 → mp4化」）

```
scene.html (台本=タイムライン, キャラはSVG)
   │  seek(t) で任意時刻の1コマを描画
   ▼
render_frames.js   Playwright/Chromium で 1コマずつ PNG 書き出し (1152枚)
   ▼
encode_mp4.js      連番PNG → WebCodecs(VP9) → mp4mux.js で .mp4 に格納
   ▼
verify_mp4.js      Chromium の <video> で実デコードして検証
```

2026年のAIショートアニメ制作で主流の「静止画（コマ）を1枚ずつ生成し、連番を動画に連結する」フローをそのままコード化している。
コマ生成を Nano Banana 等のAI画像に置き換えたい場合は `output/INTJ/frames/` の連番PNGを差し替えて `encode_mp4.js` を再実行すればよい（`docs/ai_image_prompts.md` 参照）。

## 使い方

```bash
export NODE_PATH=/opt/node22/lib/node_modules   # playwright がグローバルにある場合

# 1. 1コマずつレンダリング（約7分 / 4コア）
node src/render_frames.js --out output/INTJ/frames --fps 24

# 2. MP4 化（約40秒）
node src/encode_mp4.js --frames output/INTJ/frames --fps 24 --out output/INTJ/INTJ_short.mp4

# 3. 検証（メタデータ・任意秒のデコード画・通し再生）
node src/verify_mp4.js --in output/INTJ/INTJ_short.mp4 --times 1,13,33,41

# 特定の秒だけプレビュー
node src/render_frames.js --preview 4.2,13.2,36.5 --out /tmp/preview

# ブラウザでリアルタイム再生
#   src/scene.html?play=1     （静止: ?t=13.2）
```

### H.264 (avc1) が必要な場合

この制作環境はネットワーク制限で ffmpeg / libx264 を導入できないため、Chromium 内蔵の **VP9** で MP4 化している。
VP9-in-MP4 は YouTube / TikTok / Chrome / Android / Firefox で再生・投稿できるが、iPhone のカメラロール等で扱うなら H.264 に変換する。
連番PNGがあるので ffmpeg 1行で変換できる:

```bash
ffmpeg -framerate 24 -i output/INTJ/frames/frame_%05d.png \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart output/INTJ/INTJ_short_h264.mp4
# もしくは VP9 mp4 から直接
ffmpeg -i output/INTJ/INTJ_short.mp4 -c:v libx264 -pix_fmt yuv420p -crf 18 output/INTJ/INTJ_short_h264.mp4
```

### BGM / SE

動画は無音マスター。ショートはアプリ内の流行BGMを乗せる運用が一般的なので、TikTok / CapCut 側で追加する想定。

## 投稿メモ

- タイトル案: 「INTJの友達に失恋相談した結果」
- ハッシュタグ: `#MBTI #INTJ #INTJあるある #MBTIあるある #ショートドラマ #16personalities #建築家`
- 固定コメント案: 「あなたのMBTIは？ 次に見たいタイプも教えて」
- 次回: ENFP（エンドカードで予告済み）

## 16タイプへの展開

- `scene.html` の `SHOTS` / `SUBS` / 各 `shotN()` が台本。キャラは `intjSVG()` / `enfpSVG()` のように状態を受けて描く関数なので、タイプごとに配色（分析家=紫 / 外交官=緑 / 番人=青 / 探検家=黄）と髪型・小物を変えれば量産できる。
- 構成テンプレは「フック(2s) → 偏見どおりの行動 → 内心 → ギャップ回収 → 決めゼリフ → CTA」。詳細は `research/INTJ_viral_research.md`。
