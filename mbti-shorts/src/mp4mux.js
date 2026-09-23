/**
 * 最小限の MP4 (ISO BMFF) マルチプレクサ — 映像1トラック (VP9 / AV1) 専用。
 * WebCodecs の EncodedVideoChunk を並べて faststart (moov が mdat の前) の mp4 を作る。
 *
 *   const mp4 = muxMp4({ codec: 'vp09', width, height, fps, samples: [{data:Uint8Array, key:boolean}], av1C?: Uint8Array })
 */
'use strict';

function u8(...parts) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const be16 = v => new Uint8Array([(v >>> 8) & 255, v & 255]);
const be32 = v => new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);
const be64 = v => u8(be32(Math.floor(v / 2 ** 32)), be32(v >>> 0));
const str = s => new Uint8Array([...s].map(c => c.charCodeAt(0)));
const zeros = n => new Uint8Array(n);
const box = (type, ...payload) => { const body = u8(...payload); return u8(be32(8 + body.length), str(type), body); };
const fullBox = (type, version, flags, ...payload) => box(type, new Uint8Array([version, (flags >>> 16) & 255, (flags >>> 8) & 255, flags & 255]), ...payload);

function vpcC() {
  // VP9 Profile 0, Level 4.0, 8bit, 4:2:0 (chroma colocated), BT.709, limited range
  return fullBox('vpcC', 1, 0, new Uint8Array([
    0,            // profile
    40,           // level 4.0
    (8 << 4) | (1 << 1) | 0, // bitDepth=8, chromaSubsampling=1, videoFullRangeFlag=0
    1, 1, 1,      // colourPrimaries, transferCharacteristics, matrixCoefficients (BT.709)
  ]), be16(0));   // codecInitializationDataSize = 0
}

function visualSampleEntry(fourcc, width, height, children) {
  const compressor = zeros(32); // compressorname (空)
  return box(fourcc,
    zeros(6), be16(1),             // reserved, data_reference_index
    be16(0), be16(0), zeros(12),    // pre_defined, reserved, pre_defined[3]
    be16(width), be16(height),
    be32(0x00480000), be32(0x00480000), // 72 dpi
    be32(0), be16(1),               // reserved, frame_count
    compressor,
    be16(0x0018), be16(0xFFFF),     // depth, pre_defined = -1
    ...children);
}

function muxMp4({ codec = 'vp09', width, height, fps, samples, av1C = null }) {
  const timescale = Math.round(fps * 1000);
  const delta = 1000;                     // 1コマ = 1000 ticks
  const n = samples.length;
  const durationTicks = n * delta;
  const durationMs = Math.round(n / fps * 1000);

  const ftyp = box('ftyp', str('isom'), be32(0x200), str('isom'), str('iso2'), str('mp41'));

  const sampleEntry = codec === 'av01'
    ? visualSampleEntry('av01', width, height, [box('av1C', av1C)])
    : visualSampleEntry('vp09', width, height, [vpcC()]);
  const stsd = fullBox('stsd', 0, 0, be32(1), sampleEntry);
  const stts = fullBox('stts', 0, 0, be32(1), be32(n), be32(delta));
  const keyIdx = samples.map((s, i) => s.key ? i + 1 : 0).filter(Boolean);
  const stss = fullBox('stss', 0, 0, be32(keyIdx.length), ...keyIdx.map(be32));
  const stsc = fullBox('stsc', 0, 0, be32(1), be32(1), be32(n), be32(1));
  const stsz = fullBox('stsz', 0, 0, be32(0), be32(n), ...samples.map(s => be32(s.data.length)));
  const buildStco = offset => fullBox('stco', 0, 0, be32(1), be32(offset));

  const buildMoov = mdatDataOffset => {
    const stbl = box('stbl', stsd, stts, stss, stsc, stsz, buildStco(mdatDataOffset));
    const dinf = box('dinf', fullBox('dref', 0, 0, be32(1), fullBox('url ', 0, 1)));
    const vmhd = fullBox('vmhd', 0, 1, be16(0), be16(0), be16(0), be16(0));
    const minf = box('minf', vmhd, dinf, stbl);
    const hdlr = fullBox('hdlr', 0, 0, be32(0), str('vide'), zeros(12), str('VideoHandler'), new Uint8Array([0]));
    const mdhd = fullBox('mdhd', 0, 0, be32(0), be32(0), be32(timescale), be32(durationTicks), be16(0x55C4) /* 'und' */, be16(0));
    const mdia = box('mdia', mdhd, hdlr, minf);
    const matrix = u8(be32(0x10000), be32(0), be32(0), be32(0), be32(0x10000), be32(0), be32(0), be32(0), be32(0x40000000));
    const tkhd = fullBox('tkhd', 0, 3, be32(0), be32(0), be32(1), be32(0), be32(durationMs),
      zeros(8), be16(0), be16(0), be16(0), be16(0), matrix, be32(width << 16), be32(height << 16));
    const trak = box('trak', tkhd, mdia);
    const mvhd = fullBox('mvhd', 0, 0, be32(0), be32(0), be32(1000), be32(durationMs), be32(0x10000), be16(0x100), be16(0), zeros(8),
      matrix, zeros(24), be32(2));
    return box('moov', mvhd, trak);
  };

  const moovLen = buildMoov(0).length;
  const mdatDataOffset = ftyp.length + moovLen + 8;
  const moov = buildMoov(mdatDataOffset);
  const mdatSize = 8 + samples.reduce((s, x) => s + x.data.length, 0);
  const mdatHeader = u8(be32(mdatSize), str('mdat'));
  return u8(ftyp, moov, mdatHeader, ...samples.map(s => s.data));
}

module.exports = { muxMp4 };
