#!/bin/bash
# #2 v2: ナレーション (narration_v1) を台本行に尺合わせして narration_times.js を再生成する
# 自動割当がずれた行は --override (id:開始秒:終了秒) で手で直した値を固定している
set -euo pipefail
cd "$(dirname "$0")/../../.."
FFMPEG=${FFMPEG:-/tmp/build/prefix/bin/ffmpeg}
[ -f output/SMS_SCAM/voice/narration_v1.wav ] || "$FFMPEG" -hide_banner -loglevel warning -i output/SMS_SCAM/voice/narration_v1.mp3 -ac 1 -ar 48000 output/SMS_SCAM/voice/narration_v1.wav
FFMPEG="$FFMPEG" python3 tools/align_narration.py \
  --audio output/SMS_SCAM/voice/narration_v1.wav \
  --script scripts/SMS_SCAM_v2_narration.txt \
  --out src/episodes/sms_scam/narration_times.js \
  --json output/SMS_SCAM/voice/narration_v1_lines.json \
  --override 1:0.0:2.63 --override 2:2.87:5.89 --override 14:59.38:61.53 --override 22:94.3:98.47 --override 23:99.4:100.52 --override 24:101.19:110.57 --override 26:114.17:116.87 --override 27:117.53:121.6
