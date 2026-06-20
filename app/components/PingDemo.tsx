"use client"

import { useState, useCallback } from "react"

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  )
}

export default function PingDemo() {
  const [userId, setUserId] = useState("")
  const [copied, setCopied] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [imgKey, setImgKey] = useState(0)

  const isValidId = /^\d{17,20}$/.test(userId.trim())
  const pingUrl = isValidId ? `/ping/${userId.trim()}.gif` : null

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value)
    setImgError(false)
    setImgKey((k) => k + 1)
  }

  const copyUrl = useCallback(() => {
    if (!pingUrl) return
    const full = `${window.location.origin}${pingUrl}`
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [pingUrl])

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      {/* Input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="user-id" className="text-sm font-medium text-[#b5bac1]">
          Discord User ID
        </label>
        <input
          id="user-id"
          type="text"
          value={userId}
          onChange={handleIdChange}
          placeholder="123456789012345678"
          className="w-full rounded-md bg-[#1e1f22] border border-[#1e1f22] focus:border-[#5865f2] focus:outline-none px-3 py-2.5 text-[#dcddde] placeholder-[#4e5058] font-mono text-sm transition-colors"
          aria-describedby="id-hint"
          autoComplete="off"
          spellCheck={false}
        />
        <p id="id-hint" className="text-xs text-[#4e5058]">
          Enable Developer Mode in Discord, then right-click any user and select &ldquo;Copy User ID&rdquo;.
        </p>
      </div>

      {/* Preview */}
      {pingUrl && (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-[#b5bac1]">Preview</span>

          {/* Fake Discord message bubble */}
          <div className="rounded-lg bg-[#313338] px-4 py-3 flex items-start gap-3">
            {/* Avatar placeholder */}
            <div
              className="w-10 h-10 rounded-full bg-[#5865f2] shrink-0 mt-0.5 flex items-center justify-center text-white text-sm font-bold"
              aria-hidden="true"
            >
              ?
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-white">SomeUser</span>
                <span className="text-[11px] text-[#4e5058]">Today at 4:20 PM</span>
              </div>
              <p className="text-[#dcddde] text-sm leading-relaxed flex items-center flex-wrap gap-1">
                hey{" "}
                {/* The actual generated ping image */}
                {!imgError ? (
                  <img
                    key={imgKey}
                    src={pingUrl}
                    alt={`@mention ping`}
                    className="inline-block align-middle"
                    onError={() => setImgError(true)}
                    style={{ imageRendering: "crisp-edges" }}
                  />
                ) : (
                  <span className="inline-flex items-center bg-[#5865f233] text-[#c9cdfb] rounded px-1 text-sm font-medium">
                    @Unknown User
                  </span>
                )}
                {" "}look at this
              </p>
            </div>
          </div>

          {/* URL row */}
          <div className="flex items-center gap-2 rounded-md bg-[#1e1f22] px-3 py-2.5 border border-[#1e1f22]">
            <span className="flex-1 text-[#8e9297] font-mono text-xs truncate select-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}${pingUrl}`
                : pingUrl}
            </span>
            <button
              onClick={copyUrl}
              aria-label="Copy URL"
              className="shrink-0 p-1 rounded text-[#b5bac1] hover:text-white hover:bg-[#2b2d31] transition-colors"
            >
              {copied ? (
                <CheckIcon className="w-4 h-4 text-[#23a55a]" />
              ) : (
                <CopyIcon className="w-4 h-4" />
              )}
            </button>
          </div>

          <p className="text-xs text-[#4e5058] leading-relaxed">
            Share this URL in Discord. When someone clicks it, the image regenerates with the
            user&apos;s current display name — no URL change needed.
          </p>
        </div>
      )}
    </div>
  )
}
