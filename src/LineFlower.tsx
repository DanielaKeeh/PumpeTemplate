import { CSSProperties, useEffect, useRef } from "react"

export type FlowerVariant =
  | "sprig"
  | "lavender"
  | "wildflower"
  | "lily"
  | "cluster"
  | "leaf"

// Must match the timings of `.line-flower.is-visible path` in index.css.
const STAGGER_MS = 110
const DRAW_MS = 950

/** Paths are drawn in array order: stems first, then petals/leaves. Every
 * path starts at the base of the flower so the stroke "grows" outward. */
const FLOWERS: Record<FlowerVariant, { viewBox: string; paths: string[] }> = {
  sprig: {
    viewBox: "0 0 90 160",
    paths: [
      "M46 156 C40 132 52 112 42 90 C35 70 48 48 43 21",
      "M43 52 C36 46 29 47 23 40",
      "M42 90 C50 85 57 86 63 80",
      "M43 21 C38 14 31 15 30 21 C30 27 37 28 43 21",
      "M43 21 C46 13 54 12 55 19 C56 25 49 27 43 21",
      "M43 21 C40 13 43 6 47 10 C50 14 46 18 43 21",
      "M23 40 C18 34 11 36 10 42 C10 47 17 47 23 40",
      "M23 40 C26 33 33 33 34 39 C35 44 28 45 23 40",
      "M63 80 C59 74 52 75 51 81 C51 87 58 87 63 80",
      "M63 80 C67 73 74 74 75 80 C76 85 69 87 63 80",
    ],
  },
  lavender: {
    viewBox: "0 0 70 160",
    paths: [
      "M35 157 C33 128 38 96 34 62 C32 44 36 30 35 16",
      "M35 101 C31 97 26 98 24 102",
      "M35 90 C39 86 44 87 46 91",
      "M35 79 C31 75 25 76 24 80",
      "M35 68 C39 64 45 65 45 69",
      "M34 57 C30 53 25 54 25 58",
      "M34 46 C38 42 43 43 44 47",
      "M35 35 C31 31 26 32 26 36",
      "M35 25 C39 21 43 22 43 26",
      "M33 17 C32 12 37 11 37 16 C37 20 34 21 33 17",
    ],
  },
  wildflower: {
    viewBox: "0 0 100 150",
    paths: [
      "M52 148 C47 124 57 98 50 54",
      "M51 112 C60 104 70 104 76 96 C68 94 58 100 51 112",
      "M50 52 C43 39 45 22 50 17 C56 22 57 38 50 52",
      "M50 52 C64 45 77 35 83 40 C80 48 65 54 50 52",
      "M50 52 C61 59 68 71 70 79 C61 79 53 66 50 52",
      "M50 52 C39 60 32 71 29 78 C38 79 46 66 50 52",
      "M50 52 C36 45 23 36 17 40 C20 48 35 54 50 52",
      "M47 52 C47 48 53 48 53 52 C53 56 47 56 47 52",
    ],
  },
  lily: {
    viewBox: "0 0 110 150",
    paths: [
      "M55 148 C52 128 58 113 55 95",
      "M55 126 C46 120 38 120 31 112 C40 110 49 116 55 126",
      "M55 95 C40 91 19 91 8 86",
      "M55 95 C41 86 25 73 19 63",
      "M55 95 C48 79 44 62 42 49",
      "M55 95 C63 78 66 62 68 49",
      "M55 95 C70 86 85 72 91 63",
      "M55 95 C70 91 92 90 102 86",
      "M55 94 C54 81 56 69 52 59",
      "M55 94 C57 82 54 71 59 61",
      "M55 94 C55 84 56 75 55 66",
    ],
  },
  cluster: {
    viewBox: "0 0 110 150",
    paths: [
      "M55 148 C50 122 60 100 52 72",
      "M54 112 C46 103 37 93 30 85",
      "M53 84 C57 74 60 64 60 55",
      "M52 72 C62 70 72 71 80 70",
      "M30 85 C25 80 19 81 18 86 C18 91 24 91 30 85",
      "M30 85 C35 79 42 80 42 85 C42 90 36 91 30 85",
      "M30 85 C26 79 28 72 33 76 C35 80 32 83 30 85",
      "M60 55 C55 50 49 51 48 56 C48 61 54 61 60 55",
      "M60 55 C65 49 72 50 72 55 C72 60 66 61 60 55",
      "M60 55 C56 49 58 42 63 46 C65 50 62 53 60 55",
      "M80 70 C75 65 69 66 68 71 C68 76 74 76 80 70",
      "M80 70 C85 64 92 65 92 70 C92 75 86 76 80 70",
      "M80 70 C76 64 78 57 83 61 C85 65 82 68 80 70",
    ],
  },
  leaf: {
    viewBox: "0 0 50 160",
    paths: [
      "M25 157 C9 131 6 86 26 14 C43 84 42 128 25 157",
      "M25 152 C23 112 27 62 25 22",
      "M25 120 C20 113 16 110 12 104",
      "M25 90 C30 83 34 80 37 74",
    ],
  },
}

type LineFlowerProps = {
  variant: FlowerVariant
  /** Extra wait (ms) after it enters the screen, to stagger several flowers. */
  delay?: number
  /** Mirror horizontally. */
  flip?: boolean
  /** Positioning/size class from index.css (e.g. `flower--inv-bl`). */
  className?: string
}

export default function LineFlower({
  variant,
  delay = 0,
  flip = false,
  className = "",
}: LineFlowerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const { viewBox, paths } = FLOWERS[variant]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible")
      return
    }

    let swayTimer = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        el.classList.add("is-visible")
        swayTimer = window.setTimeout(
          () => el.classList.add("is-swaying"),
          delay + (paths.length - 1) * STAGGER_MS + DRAW_MS,
        )
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      window.clearTimeout(swayTimer)
    }
  }, [delay, paths.length])

  return (
    <span
      ref={ref}
      className={`line-flower ${className}`}
      style={{ "--lf-delay": `${delay}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <svg
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        style={flip ? { transform: "scaleX(-1)" } : undefined}
      >
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength={1}
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </svg>
    </span>
  )
}
