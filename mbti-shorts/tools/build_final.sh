#!/bin/bash
# 連番PNG + WAV → スマホ互換 MP4 (H.264 High@4.0 yuv420p + AAC-LC 192k, faststart)
#
#   FFMPEG=/tmp/build/prefix/bin/ffmpeg bash tools/build_final.sh [TYPE=INTJ] [FPS=24]
#
# 2段構成:
#   1) 映像のみ H.264 エンコード → output/TYPE/_video_h264.mp4 (存在すればスキップ。--video で強制)
#   2) 音声 WAV を AAC にして多重化 → output/TYPE/TYPE_short.mp4   (数秒)
set -euo pipefail
TYPE=${1:-INTJ}
FPS=${2:-24}
FORCE_VIDEO=0; [[ " $* " == *" --video "* ]] && FORCE_VIDEO=1
FFMPEG=${FFMPEG:-ffmpeg}
FRAMES=output/$TYPE/frames
WAV=output/$TYPE/${TYPE}_audio.wav
VIDEO=output/$TYPE/_video_h264.mp4
OUT=output/$TYPE/${TYPE}_short.mp4

if [ ! -f "$VIDEO" ] || [ "$FORCE_VIDEO" = 1 ]; then
  echo "== 1) video encode (libx264)"
  "$FFMPEG" -hide_banner -y -loglevel warning -stats \
    -framerate "$FPS" -i "$FRAMES/frame_%05d.png" \
    -c:v libx264 -preset medium -crf 18 -profile:v high -level 4.0 -pix_fmt yuv420p \
    -x264-params "keyint=48:min-keyint=24:scenecut=0:colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv" \
    -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
    -an -movflags +faststart "$VIDEO"
else
  echo "== 1) video encode skipped (exists: $VIDEO)"
fi

echo "== 2) mux audio (aac)"
"$FFMPEG" -hide_banner -y -loglevel warning \
  -i "$VIDEO" -i "$WAV" \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -movflags +faststart -shortest \
  "$OUT"
echo "wrote $OUT"
"$FFMPEG" -hide_banner -i "$OUT" 2>&1 | grep -E "Duration|Stream" || true
