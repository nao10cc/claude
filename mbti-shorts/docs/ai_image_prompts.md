# AI画像生成でコマを作る場合のプロンプト集（Nano Banana / Midjourney 等）

本リポジトリはコマを SVG で描画しているが、トレンドどおり **AI画像でコマを生成 → 連番を mp4 化** に切り替えることもできる。
その場合はまずキャラシートを1枚生成し、以降のコマは「同じキャラシートを参照画像として渡す」ことで一貫性を保つ（2026年の定石）。

## キャラシート

### アイ（INTJ）
```
character sheet, flat vector anime style, clean thick outlines, pastel palette,
a calm Japanese girl, straight dark-purple bob with blunt bangs, square glasses,
black turtleneck, neutral expressionless face, three views (front / 3/4 / side),
expression sheet: neutral, slight blush looking away, tiny sweat drop, dot eyes (frozen),
purple accent color (#6B4BC9), white background, no text
```

### ハナ（ENFP）
```
character sheet, flat vector anime style, clean thick outlines, pastel palette,
a cheerful Japanese girl, orange twin-tail hair with fluffy bangs and a yellow star hairpin,
green cardigan over cream inner, big round eyes,
expression sheet: crying with streaming tears, shouting, surprised "o" mouth, happy-crying smile,
green accent color (#4FAE6C), white background, no text
```

## 背景
```
flat vector illustration, cozy Japanese apartment room at night, purple-tinted walls,
window with moon and city lights, dark wooden bookshelf with colorful books, potted plant,
low wooden table on a round purple rug, soft ambient light, vertical 9:16, no characters, no text
```

## 各コマ（`scripts/INTJ_script.md` の # と対応）

| # | プロンプト要点 |
|---|---|
| 1 | ハナ号泣・アイ無表情、テーブル越し。`two girls sitting at a low table, left girl crying hard, right girl expressionless` |
| 2 | アイがホワイトボードを指す。`right girl pointing at a whiteboard with three bullet points, left girl shouting with tears flying` |
| 3 | アイの顔アップ、眼鏡に光。`close-up of the glasses girl, lens glint, thinking, dim background` |
| 4 | テーブルにプリン・ティッシュ・ココア。`pudding cup, tissue box, red mug of hot cocoa on the table, right girl handing a paper bag` |
| 5 | 手帳のアップ。`close-up of a purple planner notebook page with handwritten checklist in purple ink, yellow highlighter` ※文字はあとで合成 |
| 6 | ハグ。`orange-haired girl hugging the glasses girl from the side, glasses girl frozen with dot eyes and a sweat drop` |

## 連結

生成した画像を `frame_00000.png` … の連番にリネームし（同じコマを尺ぶんコピーして 24fps に合わせる）、
`node src/encode_mp4.js --frames <dir> --fps 24 --out <out.mp4>` で mp4 化する。
字幕・吹き出しは `scene.html` の字幕レイヤーだけを透過PNGで出して重ねるか、CapCut で後付けする。
