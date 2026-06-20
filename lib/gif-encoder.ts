/**
 * Minimal GIF89a encoder — single frame, 2-color palette, LZW compressed.
 * No dependencies. Runs in Node.js (Vercel serverless).
 *
 * Spec reference: https://www.w3.org/Graphics/GIF/spec-gif89a.txt
 */

// ---------------------------------------------------------------------------
// LZW compression (GIF variant — min code size = max(2, colorTablePower))
// ---------------------------------------------------------------------------
function lzwCompress(pixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize
  const eofCode = clearCode + 1

  let codeSize = minCodeSize + 1
  let nextCode = eofCode + 1
  const maxCode = () => (1 << codeSize)

  // Code table: key = "prefix,pixel" => code number
  const table = new Map<string, number>()
  const resetTable = () => {
    table.clear()
    for (let i = 0; i < clearCode; i++) table.set(`${i}`, i)
    codeSize = minCodeSize + 1
    nextCode = eofCode + 1
  }

  // Bit packer
  const out: number[] = []
  let buf = 0
  let bufBits = 0
  const writeBits = (code: number, bits: number) => {
    buf |= code << bufBits
    bufBits += bits
    while (bufBits >= 8) {
      out.push(buf & 0xff)
      buf >>= 8
      bufBits -= 8
    }
  }
  const flush = () => {
    if (bufBits > 0) out.push(buf & 0xff)
  }

  resetTable()
  writeBits(clearCode, codeSize)

  let prefix = `${pixels[0]}`
  for (let i = 1; i < pixels.length; i++) {
    const pixel = pixels[i]
    const key = `${prefix},${pixel}`
    if (table.has(key)) {
      prefix = key
    } else {
      writeBits(table.get(prefix)!, codeSize)
      if (nextCode < 4096) {
        table.set(key, nextCode++)
        if (nextCode > maxCode() && codeSize < 12) codeSize++
      } else {
        writeBits(clearCode, codeSize)
        resetTable()
      }
      prefix = `${pixel}`
    }
  }
  writeBits(table.get(prefix)!, codeSize)
  writeBits(eofCode, codeSize)
  flush()

  return new Uint8Array(out)
}

// ---------------------------------------------------------------------------
// Pack LZW bytes into GIF sub-blocks (max 255 bytes each)
// ---------------------------------------------------------------------------
function packSubBlocks(data: Uint8Array): Uint8Array {
  const chunks: number[] = []
  let i = 0
  while (i < data.length) {
    const len = Math.min(255, data.length - i)
    chunks.push(len)
    for (let j = 0; j < len; j++) chunks.push(data[i + j])
    i += len
  }
  chunks.push(0) // block terminator
  return new Uint8Array(chunks)
}

// ---------------------------------------------------------------------------
// Encode a single-frame GIF
// ---------------------------------------------------------------------------
export function encodeGif(
  pixels: Uint8Array,
  width: number,
  height: number,
  /** 2-entry palette: [[r,g,b],[r,g,b]] — index 0=bg, 1=fg */
  palette: [[number, number, number], [number, number, number]]
): Uint8Array {
  // GIF89a header
  const header = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] // "GIF89a"

  // Logical Screen Descriptor (7 bytes)
  const lsd = [
    width & 0xff, (width >> 8) & 0xff,   // width
    height & 0xff, (height >> 8) & 0xff, // height
    0b10000001,  // packed: Global Color Table flag=1, color resolution=2bits, sort=0, GCT size=1 (4 entries, we'll use 4-entry table)
    0,           // background color index
    0,           // pixel aspect ratio
  ]
  // Color table size field: 2^(n+1) entries, n=1 → 4 entries but we only need 2.
  // We pad the table to 4 entries (GCT size=1 means 2^(1+1)=4 entries required).

  // Global Color Table: 4 × 3 bytes (padded with black)
  const gct = [
    ...palette[0], // index 0 = background
    ...palette[1], // index 1 = foreground
    0, 0, 0,       // index 2 (unused)
    0, 0, 0,       // index 3 (unused)
  ]

  // Image Descriptor (10 bytes)
  const imgDesc = [
    0x2c,          // Image Separator ','
    0, 0, 0, 0,    // left=0, top=0
    width & 0xff, (width >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    0,             // packed: no local color table, not interlaced
  ]

  // LZW minimum code size = 2 (must be at least 2 for GIF)
  const minCodeSize = 2
  const lzwData = lzwCompress(pixels, minCodeSize)
  const subBlocks = packSubBlocks(lzwData)

  // GIF Trailer
  const trailer = [0x3b]

  // Assemble
  const parts = [
    new Uint8Array(header),
    new Uint8Array(lsd),
    new Uint8Array(gct),
    new Uint8Array(imgDesc),
    new Uint8Array([minCodeSize]),
    subBlocks,
    new Uint8Array(trailer),
  ]

  const total = parts.reduce((acc, p) => acc + p.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    result.set(p, offset)
    offset += p.length
  }
  return result
}
