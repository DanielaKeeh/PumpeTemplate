import { useEffect } from "react"

type Lab = [number, number, number]
type Rgb = [number, number, number]

const INK = "#242522"
const WHITE = "#F8F6F0"
const PARALLAX_MAX = 28

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const toGamma = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055

function hexToLinear(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    toLinear(c / 255),
  ) as Rgb
}

function linearToOklab([r, g, b]: Rgb): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToLinear([L, a, b]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(clamp01) as Rgb
}

const linearToHex = (rgb: Rgb) =>
  "#" +
  rgb
    .map((c) =>
      Math.round(toGamma(c) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

const mix = (a: Lab, b: Lab, t: number): Lab => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/**
 * Scroll-driven chapter colors. Every element with `data-bg` is a chapter;
 * as the top edge of the next chapter crosses the viewport (bottom → top),
 * the page background blends into its color in OKLab. The foreground snaps
 * to whichever of ink / white has more contrast (CSS crossfades it).
 *
 * The same rAF also drives subtle parallax (`data-parallax`, fine pointers
 * only) and scroll-linked reveals (`data-scroll-reveal="0.6"`).

 */
export default function useScrollTheme() {
  useEffect(() => {
    const root = document.documentElement
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-bg]"))
    const palette = blocks.map((b) => linearToOklab(hexToLinear(b.dataset.bg!)))
    const parallax = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    )
    const scrollReveals = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"),
    )
    const inkLum = luminance(hexToLinear(INK))
    const whiteLum = luminance(hexToLinear(WHITE))
    const parallaxQuery = window.matchMedia(
      "(pointer: fine) and (min-width: 701px) and (prefers-reduced-motion: no-preference)",
    )

    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "theme-color"
      document.head.appendChild(meta)
    }

    let frame = 0
    let lastBg = ""
    let lastFg = ""
    let lastMeta: Lab | null = null
    let parallaxOn = false

    const update = () => {
      frame = 0
      const vh = window.innerHeight

      // Reads first.
      const tops = blocks.map((b) => b.getBoundingClientRect().top)
      const revealRects = scrollReveals.map((el) =>
        (el.closest("section") ?? el).getBoundingClientRect(),
      )
      const useParallax = parallaxQuery.matches
      const parallaxRects = useParallax
        ? parallax.map((el) => el.getBoundingClientRect())
        : []

      // Background: blend chapter by chapter so it is continuous even when
      // several chapter edges are on screen at once.
      let color = palette[0]
      for (let i = 1; i < blocks.length; i++) {
        const t = clamp01((vh - tops[i]) / vh)
        if (t <= 0) break
        color = mix(color, palette[i], smoothstep(t))
      }
      const rgb = oklabToLinear(color)
      const hex = linearToHex(rgb)
      const lum = luminance(rgb)
      const fg = contrast(lum, inkLum) >= contrast(lum, whiteLum) ? INK : WHITE

      // Writes.
      if (hex !== lastBg) {
        root.style.setProperty("--theme-bg", hex)
        lastBg = hex
      }
      if (fg !== lastFg) {
        root.style.setProperty("--theme-fg", fg)
        root.dataset.themeTone = fg === INK ? "light" : "dark"
        lastFg = fg
      }
      if (
        !lastMeta ||
        Math.hypot(
          color[0] - lastMeta[0],
          color[1] - lastMeta[1],
          color[2] - lastMeta[2],
        ) > 0.02
      ) {
        meta!.content = hex
        lastMeta = color
      }

      revealRects.forEach((rect, i) => {
        const at = Number(scrollReveals[i].dataset.scrollReveal) || 0.6
        if ((vh - rect.top) / rect.height >= at) {
          scrollReveals[i].classList.add("is-revealed")
        }
      })

      if (useParallax) {
        parallaxRects.forEach((rect, i) => {
          if (rect.bottom < -vh || rect.top > vh * 2) return
          const offset = (rect.top + rect.height / 2 - vh / 2) / vh
          const y = Math.max(-1, Math.min(1, offset)) * -PARALLAX_MAX
          parallax[i].style.translate = `0 ${y.toFixed(1)}px`
        })
        parallaxOn = true
      } else if (parallaxOn) {
        parallax.forEach((el) => (el.style.translate = ""))
        parallaxOn = false
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule, { passive: true })
    parallaxQuery.addEventListener("change", schedule)
    // Layout can change without scrolling (RSVP form opening, fonts loading).
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(document.body)
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      parallaxQuery.removeEventListener("change", schedule)
    }
  }, [])
}
