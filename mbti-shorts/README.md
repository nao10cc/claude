# MBTI ショートドラマ・アニメーション

MBTI 16タイプを1タイプずつ縦型ショートアニメ（1080×1920 / 24fps / 約48秒）にするプロジェクト。
第1弾は **INTJ「INTJの友達に失恋相談した結果」**。

| 成果物 | パス |
|---|---|
| 完成動画 (MP4 / H.264 + AAC, スマホ再生可) | `output/INTJ/INTJ_short.mp4` |
| 音声のみ (BGM+SE, 48kHz WAV) | `output/INTJ/INTJ_audio.wav` ※ `render_audio.js` で8秒で再生成 |
| 絵コンテ（代表13コマ） | `output/INTJ/storyboard/` |
| 台本・タイムライン | `scripts/INTJ_script.md` |
| バズ調査メモ | `research/INTJ_viral_research.md` |
| AI画像生成に差し替える場合のプロンプト集 | `docs/ai_image_prompts.md` |

## 制作フロー（「1コマずつ生成 → mp4化」・音もコード生成）

```
scene.html (台本=タイムライン, キャラはSVG)          audio.html (BGM+SE を Web Audio で合成)
   │  seek(t) で任意時刻の1コマを描画                    │  scene.html と同じ秒数に SE を配置
   ▼                                                    ▼
render_frames.js  Chromium で 1コマずつ PNG (1152枚)   render_audio.js  Chromium で 48kHz WAV に書き出し
   └──────────────────────┬─────────────────────────────┘
                          ▼
tools/build_final.sh   png2yuv.js で RGB→YUV420p(BT.709) 変換 → ffmpeg/libx264 で H.264 (High@4.0)
                       WAV → AAC-LC (loudnorm -14 LUFS) → faststart MP4
```

- 映像・音声ともに外部素材ゼロ。BGM は lo-fi ヒップホップ (84BPM, Am7-Dm7-G7-Cmaj7)、決めゼリフ以降はパッドに切替。
  SE は吹き出しの「ポン」、スタンプ、ホワイトボード/手帳の移動、置く音、ペン、チェック、眼鏡の「キラン」、決めゼリフの「ドン」など約60個。
- ffmpeg は apt/pip が使えない環境のため `tools/build_ffmpeg.sh` で GitHub のソースから最小構成をビルドしている (x264 + ネイティブ AAC、1〜2分)。
  手元の PC では `brew install ffmpeg` / `apt install ffmpeg` の ffmpeg でそのまま動く。
- 色変換 (RGB→YUV420p) は `src/png2yuv.js` が Chromium 側で行い、生 yuv420p を ffmpeg にパイプしている。
  アセンブラ無しでビルドした ffmpeg の swscale が RGB→YUV で色を壊した (全面マゼンタ) ため、swscale を経由しない構成にした。
  変換結果は BT.709 の期待値と数値で照合済み (`Y/U/V` 誤差 <3)。
- 旧パイプライン (Chromium 内蔵 VP9 + 自作 mp4 muxer: `encode_mp4.js` / `mp4mux.js` / `verify_mp4.js`) は ffmpeg が無い環境向けの予備として残している。

2026年のAIショートアニメ制作で主流の「静止画（コマ）を1枚ずつ生成し、連番を動画に連結する」フローをそのままコード化している。
コマ生成を Nano Banana 等のAI画像に置き換えたい場合は `output/INTJ/frames/` の連番PNGを差し替えて `tools/build_final.sh --video` を再実行すればよい（`docs/ai_image_prompts.md` 参照）。

## 使い方

```bash
export NODE_PATH=/opt/node22/lib/node_modules   # playwright がグローバルにある場合

# 1. 1コマずつレンダリング（約7分 / 4コア）
node src/render_frames.js --out output/INTJ/frames --fps 24

# 2. 音声を生成（約8秒）
node src/render_audio.js --out output/INTJ/INTJ_audio.wav

# 3. ffmpeg を用意（手元に ffmpeg があれば不要）
bash tools/build_ffmpeg.sh            # → /tmp/build/prefix/bin/ffmpeg

# 4. MP4 化（映像 H.264 約4分 + 音声多重化 数秒。音だけ直したら --video 無しで再実行）
FFMPEG=/tmp/build/prefix/bin/ffmpeg bash tools/build_final.sh INTJ 24 --video

# （ffmpeg が無い場合の予備: VP9 で MP4 化・Chromium で検証）
node src/encode_mp4.js --frames output/INTJ/frames --fps 24 --out output/INTJ/INTJ_short_vp9.mp4
node src/verify_mp4.js --in output/INTJ/INTJ_short_vp9.mp4 --times 1,13,33,41

# 特定の秒だけプレビュー
node src/render_frames.js --preview 4.2,13.2,36.5 --out /tmp/preview

# ブラウザでリアルタイム再生
#   src/scene.html?play=1     （静止: ?t=13.2）
```

### 再生互換性

完成 MP4 は H.264 High Profile Level 4.0 / yuv420p / BT.709 + AAC-LC 48kHz ステレオ / faststart。
iPhone (写真アプリ・Files・Safari)、Android、TikTok / YouTube / Instagram のアップロード、CapCut の読み込みに対応する一般的な仕様。
音量は `loudnorm` で -14 LUFS (TikTok/YouTube 基準) に正規化している。

### BGM / SE を差し替える

`src/audio.html` の「タイムライン配置」節がSEの配置表 (秒 = scene.html の SUBS / shot と同じ)。
アプリ内の流行BGMを乗せたい場合は `MIX` で BGM を落として SE だけの WAV を作れる:

```js
// render_audio.js 内の page.evaluate に渡す例
window.renderAudio({ drums: 0, keys: 0, bass: 0, crackle: 0 })   // SE のみ
```

## 投稿メモ

- タイトル案: 「INTJの友達に失恋相談した結果」
- ハッシュタグ: `#MBTI #INTJ #INTJあるある #MBTIあるある #ショートドラマ #16personalities #建築家`
- 固定コメント案: 「あなたのMBTIは？ 次に見たいタイプも教えて」
- 次回: ENFP（エンドカードで予告済み）

## 16タイプへの展開

- `scene.html` の `SHOTS` / `SUBS` / 各 `shotN()` が台本。キャラは `intjSVG()` / `enfpSVG()` のように状態を受けて描く関数なので、タイプごとに配色（分析家=紫 / 外交官=緑 / 番人=青 / 探検家=黄）と髪型・小物を変えれば量産できる。
- 構成テンプレは「フック(2s) → 偏見どおりの行動 → 内心 → ギャップ回収 → 決めゼリフ → CTA」。詳細は `research/INTJ_viral_research.md`。
