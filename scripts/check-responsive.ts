// Responsive check: builds the app (unless BASE_URL is given), opens it at
// several viewports and fails on horizontal overflow or small touch targets.
//
// Usage: pnpm check:responsive            (build + vite preview)
//        BASE_URL=http://localhost:8443 pnpm check:responsive
//
// Outputs to screenshots/:
//   <w>x<h>-full.png   full page, each chapter painted with its own color
//                      (in the live page the color is scroll-driven, so a
//                      full-page capture would otherwise be a single color)
//   <w>x<h>/NN.png     viewport-sized frames while scrolling (real behavior),
//                      only for phone sizes
import fs from "node:fs/promises"
import path from "node:path"
import { chromium, type Page } from "playwright"
import { build, preview } from "vite"

const VIEWPORTS = [
  [360, 740],
  [375, 812],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1440, 1024],
] as const
const MOBILE_MAX = 430
const MIN_TARGET = 44
const OUT = path.resolve("screenshots")

async function startServer() {
  if (process.env.BASE_URL) return { url: process.env.BASE_URL, close: async () => {} }
  await build({ logLevel: "warn" })
  const server = await preview({ preview: { port: 4317, strictPort: false, host: "127.0.0.1" } })
  const url = server.resolvedUrls?.local[0] ?? "http://127.0.0.1:4317/"
  return { url, close: () => new Promise<void>((r) => server.httpServer.close(() => r())) }
}

/** Scroll the whole page so every reveal fires and lazy images load. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto"
    const step = window.innerHeight * 0.6
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1200)
}

async function checkOverflow(page: Page) {
  return page.evaluate(() => {
    // Disable the overflow-x safety net so the real cause is measured.
    const style = document.createElement("style")
    style.textContent = "html, body { overflow-x: visible !important; }"
    document.head.appendChild(style)
    const width = window.innerWidth
    const scrollWidth = document.documentElement.scrollWidth
    const offenders: string[] = []
    if (scrollWidth > width) {
      document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.width && rect.right > width + 0.5) {
          offenders.push(`${el.tagName.toLowerCase()}.${el.className} → right ${Math.round(rect.right)}`)
        }
      })
    }
    style.remove()
    return { width, scrollWidth, offenders: offenders.slice(0, 10) }
  })
}

async function checkTargets(page: Page, min: number) {
  return page.evaluate((min) => {
    const failures: string[] = []
    document
      .querySelectorAll<HTMLElement>('a[href], button, [role="button"], input[type="submit"]')
      .forEach((el) => {
        const style = getComputedStyle(el)
        if (style.display === "none" || style.visibility === "hidden") return
        const rect = el.getBoundingClientRect()
        if (!rect.width && !rect.height) return
        if (rect.width < min - 0.5 || rect.height < min - 0.5) {
          const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40)
          failures.push(`${el.tagName.toLowerCase()} "${label}" ${Math.round(rect.width)}×${Math.round(rect.height)}`)
        }
      })
    return failures
  }, min)
}

async function paintChapters(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>("[data-bg]").forEach((el) => {
      el.style.setProperty("--theme-bg", el.dataset.bg!)
      el.style.setProperty("--theme-fg", el.dataset.fg!)
      el.style.background = el.dataset.bg!
      el.style.color = el.dataset.fg!
    })
  })
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true })
  await fs.mkdir(OUT, { recursive: true })
  const server = await startServer()
  const browser = await chromium.launch()
  const errors: string[] = []

  try {
    for (const [width, height] of VIEWPORTS) {
      const mobile = width <= MOBILE_MAX
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: mobile ? 2 : 1,
        isMobile: mobile,
        hasTouch: mobile,
      })
      const page = await context.newPage()
      page.on("pageerror", (err) => errors.push(`${width}x${height}: page error ${err.message}`))
      await page.goto(server.url, { waitUntil: "networkidle" })
      await page.evaluate(() => document.fonts.ready)
      await scrollThrough(page)

      const name = `${width}x${height}`
      const overflow = await checkOverflow(page)
      if (overflow.scrollWidth > overflow.width) {
        errors.push(`${name}: scrollWidth ${overflow.scrollWidth} > innerWidth ${overflow.width}\n    ${overflow.offenders.join("\n    ")}`)
      }

      if (mobile) {
        const small = await checkTargets(page, MIN_TARGET)
        if (small.length) errors.push(`${name}: targets under ${MIN_TARGET}px\n    ${small.join("\n    ")}`)

        // Real scroll-driven frames for visual review.
        const dir = path.join(OUT, name)
        await fs.mkdir(dir, { recursive: true })
        const total = await page.evaluate(() => document.documentElement.scrollHeight)
        let i = 0
        for (let y = 0; y < total; y += Math.round(height * 0.75)) {
          await page.evaluate((y) => window.scrollTo(0, y), y)
          await page.waitForTimeout(350)
          await page.screenshot({ path: path.join(dir, `${String(i++).padStart(2, "0")}.png`) })
        }
        await page.evaluate(() => window.scrollTo(0, 0))
      }

      await paintChapters(page)
      await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true })
      console.log(`✓ ${name}  scrollWidth=${overflow.scrollWidth}`)
      await context.close()
    }
  } finally {
    await browser.close()
    await server.close()
  }

  if (errors.length) {
    console.error(`\n✗ ${errors.length} problem(s):\n  ${errors.join("\n  ")}`)
    process.exit(1)
  }
  console.log("\nAll viewports passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
