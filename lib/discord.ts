export interface DiscordUser {
  id: string
  username: string
  global_name: string | null
  discriminator: string
  avatar: string | null
  accent_color: number | null
}

export interface ResolvedUser {
  id: string
  displayName: string
  avatarUrl: string | null
  accentColor: string | null
}

const DISCORD_API = "https://discord.com/api/v10"

export async function fetchDiscordUser(userId: string): Promise<ResolvedUser | null> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) {
    console.error("[discord] DISCORD_BOT_TOKEN is not set")
    return null
  }

  const res = await fetch(`${DISCORD_API}/users/${userId}`, {
    headers: {
      Authorization: `Bot ${token}`,
    },
    // Revalidate every 60 seconds so display name changes propagate quickly
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    console.error(`[discord] Failed to fetch user ${userId}: ${res.status} ${res.statusText}`)
    return null
  }

  const user: DiscordUser = await res.json()

  // global_name is the new display name; fall back to username (legacy)
  const displayName = user.global_name ?? user.username

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`

  const accentColor = user.accent_color != null
    ? `#${user.accent_color.toString(16).padStart(6, "0")}`
    : null

  return {
    id: user.id,
    displayName,
    avatarUrl,
    accentColor,
  }
}
