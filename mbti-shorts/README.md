# コード描画ショートアニメ・スタジオ

台本・キャラ・背景・BGM・効果音まで **すべてコードで生成** し、1コマずつ描いて MP4 にする縦型ショートアニメ（1080×1920 / 24fps）のプロジェクト。

| エピソード | 様式 | 尺 | 成果物 |
|---|---|---|---|
| **#2 v2 教養ドラマ「不在通知SMSを押した3分後」ナレーション版** | Vyond 風 2D パペット + 一人ナレーション (Fish Audio) | 122秒 | `output/SMS_SCAM_V2/SMS_SCAM_V2_short.mp4` (声なし比較版 `SMS_SCAM_V2_novoice.mp4`) / 絵コンテ `output/SMS_SCAM_V2/storyboard/` / 台本 `scripts/SMS_SCAM_v2_script.md` / 読み上げ原稿 `scripts/SMS_SCAM_v2_narration.txt` |
| #2 v1 同・字幕のみ版 | Vyond 風 2D パペット（関節リグ） | 78秒 | `output/SMS_SCAM/SMS_SCAM_short.mp4` / 絵コンテ `output/SMS_SCAM/storyboard/` / 台本 `scripts/SMS_SCAM_script.md` |
| #1 MBTI「INTJの友達に失恋相談した結果」 | ゆるキャラ SVG | 48秒 | `output/INTJ/INTJ_short.mp4` / 絵コンテ `output/INTJ/storyboard/` / 台本 `scripts/INTJ_script.md` / 調査 `research/INTJ_viral_research.md` |

**シリーズ全体の最終方針は `docs/STRATEGY.md`**、台本の成功事例調査は `research/script_success_patterns.md`。

いずれも H.264 + AAC のスマホ再生可能な MP4。BGM と効果音はコード生成。#2 v2 は Fish Audio で作った一人ナレーション (MP3) を取り込み、
無音検出で台本の行に自動で尺合わせ → 映像タイムラインをその秒数で駆動 → BGM をナレーションに合わせて自動ダッキング、まで全部コードで行う。

## Vyond 風リグ（#2 から導入）

`src/rig/rig.js` が Vyond 的な 2D パペットの本体。

- **ポーズ** = 関節角の辞書（胴の傾き・首・肩・肘・股・膝 + 腕の短縮率）。`RIG.P` にライブラリ（立つ / スマホを見る / 電話 / 指す / 肩をすくめる / 頭を抱える / 驚く / うつむく / 腕組み / 歩行 など）
- **表情** = 目・眉・口・視線・赤面・汗の状態。`RIG.F` にライブラリ、`RIG.face('shock', {lookX: 4})` で上書き
- **キャラ** = 配色と髪型の定義（`RIG.CHARS`: ユウ / リン / 詐欺師）。同じ骨格を使い回す
- `RIG.lerpPose(a, b, u)` でポーズ間を補間、シーン側で outBack イージングをかけてカートゥーン的なオーバーシュートを出す。`RIG.walk(phase)` で歩行サイクル
- テスト: `src/rig/rig_test.html` にポーズ一覧

エピソード本体は `src/episodes/<name>/scene.html`（映像）と `audio.html`（音）。効果音・BGM の部品は `src/lib/sfx.js`。

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

## ナレーション音声を取り込む（#2 v2 から）

声は Fish Audio 等の外部 TTS で **一人のナレーターがまとめて読んだ 1 本の音声** を用意する (`scripts/SMS_SCAM_v2_narration.txt` が読み上げ原稿。1行=1ナレーション)。
それを以下の 3 段で映像に同期させる。

```
narration.mp3 ──ffmpeg──▶ narration.wav (48k mono)
       │
       ▼  tools/align_narration.py  (silencedetect → 行ごとの区間を DP で割当)
narration_times.js   const NARR = [{id, s, e, t}, ...]
       │
       ├─▶ scene_v2.html / scene_v2_timeline.js   L(n)=NARR[n-1].s を各ショットの開始時刻に使う。字幕も NARR から自動表示
       └─▶ audio_v2.html                          同じ L(n) で BGM の場面転換・SE を配置。声の RMS 包絡で BGM を -9dB ダッキング
```

```bash
FFMPEG=/tmp/build/prefix/bin/ffmpeg
$FFMPEG -i narration.mp3 -ac 1 -ar 48000 output/SMS_SCAM/voice/narration_v1.wav
python3 tools/align_narration.py --audio output/SMS_SCAM/voice/narration_v1.wav \
    --script scripts/SMS_SCAM_v2_narration.txt --out src/episodes/sms_scam/narration_times.js \
    --override 1:0.0:2.63 --override 2:2.87:5.89        # 自動割当がずれた行だけ手で直す (id:開始:終了)
#   （#2 v2 の実際の値は src/episodes/sms_scam/narration_align.sh に固定してある）
node src/render_audio.js --src src/episodes/sms_scam/audio_v2.html \
    --voice output/SMS_SCAM/voice/narration_v1.wav --out output/SMS_SCAM_V2/SMS_SCAM_V2_audio.wav
#   --mix '{"voice":0}' で声なし版、'{"bgm":0}' で SE+声のみ
```

- 自動割当は文字数比の期待尺と無音区間から行境界を推定する。TTS の読みの速さが行ごとに大きく違う箇所 (今回は 27 行中 8 行) は
  表示される一覧を見て `--override` で直す。
- 声の処理: 80Hz ハイパス → 3kHz +2dB → コンプレッサ → BGM 側を包絡でダッキング (速く下げ・ゆっくり戻す)。最終的に `loudnorm -14 LUFS`。
- 全尺にごく小さなルームトーン (-50dBFS) を敷き、BGM の切れ目が「音切れ」に聞こえないようにしている。

## 使い方

```bash
export NODE_PATH=/opt/node22/lib/node_modules   # playwright がグローバルにある場合

# 1. 1コマずつレンダリング（#2: 約12分 / #1: 約7分、4コア）
node src/render_frames.js --scene src/episodes/sms_scam/scene.html --out output/SMS_SCAM/frames --fps 24
#   （#1 は --scene を省略。#2 v2 は scene_v2.html → output/SMS_SCAM_V2/frames、約20分）

# 2. 音声を生成（約20秒）
node src/render_audio.js --src src/episodes/sms_scam/audio.html --out output/SMS_SCAM/SMS_SCAM_audio.wav

# 3. ffmpeg を用意（手元に ffmpeg があれば不要）
bash tools/build_ffmpeg.sh            # → /tmp/build/prefix/bin/ffmpeg

# 4. MP4 化（映像 H.264 約4分 + 音声多重化 数秒。音だけ直したら --video 無しで再実行）
FFMPEG=/tmp/build/prefix/bin/ffmpeg bash tools/build_final.sh SMS_SCAM 24 --video   # #1 は INTJ、#2 v2 は SMS_SCAM_V2

# （ffmpeg が無い場合の予備: VP9 で MP4 化・Chromium で検証）
node src/encode_mp4.js --frames output/INTJ/frames --fps 24 --out output/INTJ/INTJ_short_vp9.mp4
node src/verify_mp4.js --in output/INTJ/INTJ_short_vp9.mp4 --times 1,13,33,41

# 特定の秒だけプレビュー
node src/render_frames.js --scene src/episodes/sms_scam/scene.html --preview 3,31,50 --out /tmp/preview

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

### #2 v2 不在通知SMSを押した3分後（ナレーション版・122秒）
- 構成: 事後カット「え、残高、ゼロ？」(0-3s) → 巻き戻し → 日常 → 認証コード入力 → 残高0 → リンの緊急停止 (奮闘) → 一時停止して図解 → 電話 → 送金失敗・凍結 (スカッと) → URL の見分け方 → 翌日、紙の不在票 (皮肉) → 冒頭と同じ構図でスマホを裏返す (ループ)
- コメント誘発: 「同じSMS来た人 👋」テロップ + 決めゼリフ「認証コードは、鍵。」で締める
- 一人ナレーション (His Story 型)。ナレーションの字幕は出さない (`SHOW_NARR=false`)。セリフは吹き出し文字で見せ、ナレーターが地の文で語る
- 声なし比較版 `SMS_SCAM_V2_novoice.mp4` も同梱 (BGM・SE のみ)

### #2 v1 不在通知SMSを押した3分後（字幕のみ・78秒）
- 60〜90秒の教養ドラマ枠。冒頭2秒で結末（残高0）→ 巻き戻し → 日常 → 一時停止して図解 → 皮肉のオチ → 3行の教訓
- 固有名はすべて架空（NK EXPRESS / みらい銀行 / nk-express-jp.top）。実在企業・人物は出さない
- ハッシュタグ: `#詐欺 #フィッシング #宅配 #SMS #知らないと損 #ショートドラマ #アニメ`
- 音声（セリフ）は別途。字幕だけで成立する設計なので、VOICEVOX 等の WAV を `SUBS` の秒数に置けば口パクと同期する

### #1 INTJの友達に失恋相談した結果
- ハッシュタグ: `#MBTI #INTJ #INTJあるある #MBTIあるある #ショートドラマ #16personalities #建築家`
- 固定コメント案: 「あなたのMBTIは？ 次に見たいタイプも教えて」
