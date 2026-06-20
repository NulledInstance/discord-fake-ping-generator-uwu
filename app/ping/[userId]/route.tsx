import { ImageResponse } from "@vercel/og"
import { NextRequest, NextResponse } from "next/server"
import { fetchDiscordUser } from "@/lib/discord"

export const runtime = "edge"

function parseUserId(raw: string): string {
  return raw.replace(/\.(webp|png)$/, "")
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: rawUserId } = await params
  const userId = parseUserId(rawUserId)

  if (!/^\d{17,20}$/.test(userId)) {
    return new NextResponse("Invalid user ID", { status: 400 })
  }

  const user = await fetchDiscordUser(userId)
  const displayName = user?.displayName ?? "Unknown User"

  // Discord mention pill colours (dark mode, solid blurple background)
  const BG = "#5865F2"       // solid Discord blurple
  const TEXT = "#FFFFFF"      // white text

  // 14px font, roughly 8.4px per char average for Inter/sans-serif at this size
  const fontSize = 14
  const charWidth = 8.0
  const paddingX = 8   // 8px each side
  const paddingY = 4   // 4px top & bottom
  const pillWidth = Math.ceil(displayName.length * charWidth + paddingX * 2 + 4) // +4 for the "@"
  const pillHeight = fontSize + paddingY * 2 + 2  // ~24px

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: pillWidth,
          height: pillHeight,
          background: BG,
          borderRadius: "3px",
          paddingLeft: `${paddingX}px`,
          paddingRight: `${paddingX}px`,
          fontFamily: '"Inter", "Noto Sans", sans-serif',
          fontSize: `${fontSize}px`,
          fontWeight: 500,
          lineHeight: 1,
          whiteSpace: "nowrap",
          color: TEXT,
        }}
      >
        {"@"}{displayName}
      </div>
    ),
    {
      width: pillWidth,
      height: pillHeight,
    }
  )

  imageResponse.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300"
  )
  imageResponse.headers.set("Content-Type", "image/png")

  return imageResponse
}
