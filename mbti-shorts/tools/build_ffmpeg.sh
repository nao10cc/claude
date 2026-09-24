#!/bin/bash
# ffmpeg (libx264 + ネイティブ AAC) を GitHub のソースから最小構成でビルドする。
# apt / pip / npm が使えない環境向け。所要 1〜2 分 (4コア)。
#   bash tools/build_ffmpeg.sh            # → /tmp/build/prefix/bin/ffmpeg
#   FFMPEG=/tmp/build/prefix/bin/ffmpeg bash tools/build_final.sh
set -euo pipefail
B=${BUILD_DIR:-/tmp/build}
mkdir -p "$B" && cd "$B"
[ -d x264 ]   || git clone --depth 1 https://github.com/mirror/x264.git
[ -d FFmpeg ] || git clone --depth 1 --branch n7.1 https://github.com/FFmpeg/FFmpeg.git

if [ ! -f "$B/prefix/lib/libx264.a" ]; then
  ( cd x264 && ./configure --prefix="$B/prefix" --enable-static --disable-shared --disable-asm --disable-cli --disable-opencl --bit-depth=8 --chroma-format=420 \
    && make -j"$(nproc)" && make install ) > "$B/x264.log" 2>&1
fi

if [ ! -x "$B/prefix/bin/ffmpeg" ]; then
  ( cd FFmpeg && PKG_CONFIG_PATH="$B/prefix/lib/pkgconfig" ./configure --prefix="$B/prefix" \
    --disable-everything --disable-autodetect --disable-x86asm --disable-doc --disable-debug --disable-network \
    --disable-ffplay --disable-ffprobe --enable-ffmpeg --enable-gpl --enable-libx264 --enable-zlib --enable-static --disable-shared \
    --enable-encoder=libx264,aac,png,pcm_s16le,mjpeg,rawvideo,wrapped_avframe \
    --enable-decoder=png,pcm_s16le,pcm_f32le,h264,aac,mjpeg,rawvideo,mp3float,mp3 \
    --enable-demuxer=image2,wav,mov,concat,rawvideo,mp3 \
    --enable-muxer=mp4,mov,wav,image2,null,rawvideo \
    --enable-parser=h264,aac,png,mpegaudio \
    --enable-protocol=file,pipe \
    --enable-filter=scale,format,aresample,aformat,anull,null,volume,apad,atrim,trim,fps,setpts,asetpts,concat,adelay,amix,loudnorm,pad,crop,ssim,psnr,ebur128,volumedetect,showinfo,split,silencedetect,silenceremove,atempo,highpass,lowpass,acompressor,sidechaincompress,dynaudnorm,agate,aecho,alimiter,asplit,amerge,pan,channelmap \
    --extra-cflags="-I$B/prefix/include" --extra-ldflags="-L$B/prefix/lib" --pkg-config-flags="--static" \
    && make -j"$(nproc)" && mkdir -p "$B/prefix/bin" && cp ffmpeg "$B/prefix/bin/ffmpeg" ) > "$B/ffmpeg.log" 2>&1
fi
"$B/prefix/bin/ffmpeg" -hide_banner -encoders | grep -E "libx264|aac"
echo "ffmpeg: $B/prefix/bin/ffmpeg"
