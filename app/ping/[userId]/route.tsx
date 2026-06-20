import { NextRequest, NextResponse } from "next/server"
import { fetchDiscordUser } from "@/lib/discord"
import { rasterizeText, CHAR_W, CHAR_H } from "@/lib/bitmap-font"
import { encodeGif } from "@/lib/gif-encoder"

// Node runtime — no edge needed, lighter for buffer work
export const runtime = "nodejs"

function parseUserId(raw: string): string {
  return raw.replace(/\.(gif|png|webp)$/, "")
}

// Discord dark-mode mention pill colours (from spec)
// BG:  #292c51  → rgb(41, 44, 81)
// FG:  #a9bbff  → rgb(169, 187, 255)
const BG_COLOR: [number, number, number] = [41, 44, 81]
const FG_COLOR: [number, number, number] = [169, 187, 255]

const SCALE = 2  // 2× upscale so the pill reads clearly at Discord's small embed size
const PAD_X = 5  // horizontal padding (pre-scale pixels)
const PAD_Y = 3  // vertical padding (pre-scale pixels)
// Corner radius in pre-scale pixels (applied as simple rectangle fill — GIF pixels only)
// GIF doesn't support transparency natively without a transparent index; we round corners
// by coloring them as background.
const RADIUS = 2

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: rawUserId } = await params
  const userId = parseUserId(rawUserId)

  if (!/^\d{17,20}$/.test(userId)) {
    return new NextResponse("Invalid user ID", { status: 400 })
  }

  const user = await fetchDiscordUser(userId)
  const displayName = user?.displayName ?? "unknown"
  const label = `@${displayName}`

  // --- rasterize text at 1× scale ---
  const { pixels: pix1x, width: w1, height: h1 } = rasterizeText(label, PAD_X, PAD_Y)

  // --- apply rounded corners at 1× (zero-out corner pixels) ---
  for (let y = 0; y < h1; y++) {
    for (let x = 0; x < w1; x++) {
      const dx = Math.min(x, w1 - 1 - x)
      const dy = Math.min(y, h1 - 1 - y)
      // Pythagorean corner rounding
      if (dx < RADIUS && dy < RADIUS) {
        const dist = Math.sqrt((RADIUS - dx - 0.5) ** 2 + (RADIUS - dy - 0.5) ** 2)
        if (dist > RADIUS) {
          pix1x[y * w1 + x] = 2 // mark as "outside" (transparent corner) → use BG
        }
      }
    }
  }

  // --- upscale to 2× ---
  const w = w1 * SCALE
  const h = h1 * SCALE
  const pixels = new Uint8Array(w * h)
  for (let y = 0; y < h1; y++) {
    for (let x = 0; x < w1; x++) {
      const src = pix1x[y * w1 + x]
      // map: 0=bg→BG(index 0), 1=fg→FG(index 1), 2=outside→BG(index 0)
      const idx = src === 1 ? 1 : 0
      for (let sy = 0; sy < SCALE; sy++) {
        for (let sx = 0; sx < SCALE; sx++) {
          pixels[(y * SCALE + sy) * w + (x * SCALE + sx)] = idx
        }
      }
    }
  }

  const gif = encodeGif(pixels, w, h, [BG_COLOR, FG_COLOR])

  return new NextResponse(gif, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "Content-Length": gif.length.toString(),
    },
  })
}
