import { useEffect, useRef } from 'react'

/* Plays reels of videos side by side, each clip from its first frame. Within a reel each clip
   starts at the previous clip's hand-off, and after the last the first starts again the same way.
   `handoff` is when, in seconds into clip i, the next clip starts: a number (that many seconds
   before clip i ends, for clips that all overlap alike) or a function of the clip and its length.

     const { clip } = useClipChain([[3, 2], [0, 1]], (i, len) => exits[i] ?? len - 40 / 24)
     <video muted playsInline {...clip(i)} />

   The first reel leads and sets the loop; the others follow so every hand-off happens in all
   reels at once. A follower's first clip is brought in partway through the leader's, timed so
   the two reach their hand-off together; from there each later clip starts alongside the
   leader's. So the leader's first clip must reach its hand-off latest of the first clips: a
   follower whose reel runs shorter than the leader's sits blank for the rest of the loop, till
   its cue comes.

   Frame-accurate hand-offs:
   - the leader's current clip is watched frame by frame (requestVideoFrameCallback), against
     its own media time, so the cues fall on the right frame. Media time stops when the clip
     does (Chrome pausing off-screen autoplay, a buffering stall), so a hold can't bring the
     next one in early. A wall-clock timer stands in where the callback is missing.
   - a clip rewinds as soon as it ends (its first frame is blank background, so nothing shows),
     leaving the next start a bare play(): seeking from the last frame at the moment of
     hand-off would add a varying 50–150ms delay to every overlap. */

type Rvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number
  cancelVideoFrameCallback?: (id: number) => void
}

export function useClipChain(reels: number[][], handoff: number | ((i: number, duration: number) => number)) {
  const videos = useRef<(Rvfc | null)[]>([])
  const watch = useRef<{ frame?: number; timer?: number }[]>([])
  const lead = reels[0]
  const follow = reels.slice(1)
  // when, in seconds into clip i (once its length is known), the next clip starts
  const handAt = (i: number) => {
    const d = videos.current[i]?.duration ?? 0
    return typeof handoff === 'number' ? d - handoff : handoff(i, d)
  }

  const stop = (i: number) => {
    const w = watch.current[i]
    if (!w) return
    if (w.frame !== undefined) videos.current[i]?.cancelVideoFrameCallback?.(w.frame)
    clearTimeout(w.timer)
    watch.current[i] = {}
  }
  useEffect(() => () => reels.flat().forEach(stop), []) // eslint-disable-line react-hooks/exhaustive-deps

  const start = (i: number) => {
    const v = videos.current[i]
    if (v && v.paused) v.play().catch(() => {})
  }

  // cues on the leader's clip i, as [media time, start these]: the followers' first clips when
  // they're due (only on the leader's first clip), then the next clip in every reel
  const cues = (i: number): [number, number[]][] => {
    const k = lead.indexOf(i), next = (k + 1) % lead.length
    const hand: [number, number[]] = [handAt(i), reels.map((r) => r[next % r.length])]
    if (k !== 0) return [hand]
    const firsts = follow.map((r): [number, number[]] => {
      const f = videos.current[r[0]]
      return [f?.duration ? Math.max(0, handAt(i) - handAt(r[0])) : 0, [r[0]]]
    })
    return [...firsts, hand].sort((a, b) => a[0] - b[0])
  }

  // the opening: so every reel plays from the off, the leader's first clip starts partway in, at
  // the point where the latest-due follower first clip comes in; those all start at once with it.
  // Only this first time: after that every clip plays from its first frame
  const opened = useRef(false)
  const open = () => {
    const l = videos.current[lead[0]]
    if (opened.current || !l?.duration || follow.some((r) => !videos.current[r[0]]?.duration)) return
    opened.current = true
    l.currentTime = Math.max(0, ...follow.map((r) => handAt(lead[0]) - handAt(r[0])))
    l.play().catch(() => {})
  }

  const watchFrom = (i: number, v: Rvfc) => {
    stop(i)
    if (!v.duration) return
    const due = cues(i).filter(([t, clips]) => t > v.currentTime || (clips.forEach(start), false))
    if (v.requestVideoFrameCallback) {
      const tick = (_: number, meta: { mediaTime: number }) => {
        // a frame shows for 1/24s: fire a cue when its time falls within this one
        while (due.length && meta.mediaTime >= due[0][0] - 1 / 48) due.shift()![1].forEach(start)
        watch.current[i] = due.length ? { frame: v.requestVideoFrameCallback!(tick) } : {}
      }
      watch.current[i] = { frame: v.requestVideoFrameCallback(tick) }
    } else {
      const step = () => {
        while (due.length && v.currentTime >= due[0][0] - 1 / 48) due.shift()![1].forEach(start)
        if (!due.length) { watch.current[i] = {}; return }
        const wait = (due[0][0] - v.currentTime) * 1000 / v.playbackRate
        watch.current[i] = { timer: window.setTimeout(step, wait) }
      }
      step()
    }
  }

  // props for the video at index i: nothing autoplays; the opening starts once every first clip
  // knows its length
  const clip = (i: number) => {
    const leads = lead.includes(i)
    return {
      preload: 'auto' as const,
      ref: (el: HTMLVideoElement | null) => { videos.current[i] = el },
      onLoadedMetadata: open,
      onPlaying: leads ? (e: React.SyntheticEvent<HTMLVideoElement>) => watchFrom(i, e.currentTarget) : undefined,
      onPause: () => { if (leads && !watch.current[i]?.frame) stop(i) }, // the frame watch halts by itself
      onWaiting: () => { if (leads && !watch.current[i]?.frame) stop(i) },
      onEnded: (e: React.SyntheticEvent<HTMLVideoElement>) => { e.currentTarget.currentTime = 0 },
    }
  }
  return { clip }
}
