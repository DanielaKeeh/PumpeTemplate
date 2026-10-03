import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react"
import {
  book as personBook,
  childhoodPink as photoChildhoodPink,
  childhoodTeal as photoChildhoodTeal,
  facepaint as photoFacepaint,
  gift as personGift,
  mirror as personMirror,
  robot as personRobot,
  selfie as photoSelfie,
  shades as photoShades,
  stripes as personStripes,
  wave as personWave,
  auroraDan,
  clowndan as clownDan,
  deadDan,
  normieDan,
  omgDan,
  smartLittleDan,
  stemDan,
} from "./assets/optimized"
import confirmClipWebp from "./assets/confirm-clip.webp"
import confirmClipPoster from "./assets/confirm-clip-poster.jpg"
import heroMobileBgWebp from "./assets/hero-mobile-bg.webp"
import heroMobilePoster from "./assets/hero-mobile-poster.jpg"
import LineFlower from "./LineFlower"
import Picture, { ResponsiveImage } from "./Picture"
import useScrollTheme from "./useScrollTheme"

/** Same breakpoint the rest of the site uses for its mobile layout (see the
 * `@media (max-width: 700px)` rules in index.css). */
const MOBILE_QUERY = "(max-width: 700px)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

type Attendance = "yes" | "no" | null
type Reply = {
  name: string
  attendance: Exclude<Attendance, null>
  message?: string
  timestamp: string
}

const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches

const RSVP_TIMEOUT_MS = 15_000

/** Tracks a media query reactively (resize, rotation, or the user flipping
 * an OS setting while the tab is open), initialized synchronously so there's
 * no first-paint flash of the wrong layout. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}

const useIsMobile = () => useMediaQuery(MOBILE_QUERY)
const usePrefersReducedMotion = () => useMediaQuery(REDUCED_MOTION_QUERY)

function Tape({ className = "" }: { className?: string }) {
  return <span className={`tape ${className}`} aria-hidden="true" />
}

/** Every photo from the project, reused here (none were cut) for the closing
 * carousel — no captions, the photos speak for themselves. */
const carouselPhotos: {
  key: string
  image: ResponsiveImage
  alt: string
  tape?: "default" | "blue"
}[] = [
  { key: "selfie", image: photoSelfie, alt: "Dan tomándose una selfie frente al espejo", tape: "default" },
  { key: "facepaint", image: photoFacepaint, alt: "Dan con la cara pintada, posando para la cámara" },
  { key: "childhoodTeal", image: photoChildhoodTeal, alt: "Dan de niña, con un vestido turquesa" },
  { key: "book", image: personBook, alt: "Dan sentada, sosteniendo un libro", tape: "blue" },
  { key: "shades", image: photoShades, alt: "Dan con lentes de sol en forma de corazón" },
  { key: "childhoodPink", image: photoChildhoodPink, alt: "Dan de niña, con una playera rosa", tape: "default" },
  { key: "robot", image: personRobot, alt: "Dan haciendo una cara sorprendida frente a la cámara" },
  { key: "stripes", image: personStripes, alt: "Dan en un momento cotidiano, sin pose" },
  { key: "mirror", image: personMirror, alt: "Dan tomándose una selfie frente al espejo", tape: "blue" },
  { key: "gift", image: personGift, alt: "Dan sonriendo y sosteniendo un libro pequeño" },
  { key: "wave", image: personWave, alt: "Dan saludando con la mano" },
  { key: "aurora", image: auroraDan, alt: "Dan con un vestido de princesa Aurora" },
  { key: "clown", image: clownDan, alt: "Dan con un disfraz de payaso" },
  { key: "dead", image: deadDan, alt: "Dan cansada de chambear" },
  { key: "normie", image: normieDan, alt: "Dan siendo Dan" },
  { key: "omg", image: omgDan, alt: "Dan impresionada" },
  { key: "smart", image: smartLittleDan, alt: "Dan predicando desde chikita" },
  { key: "stem", image: stemDan, alt: "Dan con un robot perro" },
]

function App() {
  const [attendance, setAttendance] = useState<Attendance>(null)
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [website, setWebsite] = useState("") // honeypot: real people never fill this
  const [error, setError] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "complete">(
    "idle",
  )
  const [reply, setReply] = useState<Reply | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  useScrollTheme()

  // Closing carousel: an infinite "marquee" (the photo list rendered twice
  // back to back, animated by CSS from translateX(0) to translateX(-50%))
  // for everyone except reduced-motion users, who get the original
  // single-set, manually-scrollable row instead (see .carousel-static).
  const carouselReducedMotion = usePrefersReducedMotion()
  const marqueeTrackRef = useRef<HTMLDivElement>(null)
  const pauseMarquee = () => marqueeTrackRef.current?.classList.add("is-paused")
  const resumeMarquee = () => marqueeTrackRef.current?.classList.remove("is-paused")
  const marqueePhotos = carouselReducedMotion
    ? carouselPhotos
    : [...carouselPhotos, ...carouselPhotos]
  // ~4.5s of travel per photo keeps the pace steady regardless of count.
  const marqueeDuration = `${carouselPhotos.length * 4.5}s`

  // Section 1's background: mobile only (on desktop/tablet this chapter is
  // just flat color). An animated WebP <img> instead of a <video> — iOS
  // Safari won't autoplay a muted <video> reliably (it shows a play button
  // over it), but an <img> just plays, everywhere, with no JS needed.
  const isMobile = useIsMobile()
  const videoReducedMotion = usePrefersReducedMotion()

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })

  useEffect(() => {
    document.title = "Dan — Invitación de cumpleaños"
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]")
    elements.forEach((element) => {
      if (element.dataset.reveal !== "stagger") return
      Array.from(element.children).forEach((child, index) => {
        const target =
          child instanceof HTMLPictureElement ? child.querySelector("img") : child
        ;(target as HTMLElement | null)?.style.setProperty("--i", String(index))
      })
    })
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const target = entry.target as HTMLElement
          observer.unobserve(target)
          // will-change only while the reveal is running.
          target.classList.add("is-animating", "is-visible")
          window.setTimeout(() => target.classList.remove("is-animating"), 1800)
        }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  // Both outcomes now render through the same form (the Apps Script needs a
  // name either way, to know who's not coming too), so there's nothing left
  // to scroll to on choosing — just reset and focus the name field.
  const chooseAttendance = (value: Exclude<Attendance, null>) => {
    setAttendance(value)
    setError("")
    setStatus("idle")
    setReply(null)
    window.setTimeout(() => nameInput.current?.focus(), 100)
  }

  const submitRsvp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!attendance) return
    if (!name.trim()) {
      setError("Pon tu nombre, porfa.")
      nameInput.current?.focus()
      return
    }

    const endpoint = import.meta.env.VITE_RSVP_ENDPOINT
    if (!endpoint) {
      console.warn("VITE_RSVP_ENDPOINT no está configurado; no se puede enviar el RSVP.")
      setError("algo falló, ¿lo intentas otra vez?")
      return
    }

    setError("")
    setStatus("submitting")

    const trimmedName = name.trim()
    const trimmedMessage = message.trim() || undefined

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), RSVP_TIMEOUT_MS)

    try {
      // No headers on purpose: a Content-Type header turns this into a
      // "preflighted" CORS request, and Apps Script web apps don't answer
      // OPTIONS preflights. Omitting headers keeps it a "simple request"
      // (sent as text/plain), which Apps Script can read fine via
      // JSON.parse(e.postData.contents).
      const res = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          attendance,
          message: trimmedMessage,
          website, // honeypot — real visitors never fill this in
        }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error("RSVP endpoint reported failure")

      setReply({
        name: trimmedName,
        attendance,
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
      })
      setStatus("complete")
    } catch {
      setStatus("idle")
      setError("algo falló, ¿lo intentas otra vez?")
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  return (
    <main>
      <a className="skip-link" href="#rsvp">
        Ir directo al RSVP
      </a>

      <section
        id="invitation"
        className="poster poster-1"
        data-bg="#293D7C"
        data-fg="#D7D0C8"
      >
        {isMobile && (
          <div className="hero-video" aria-hidden="true">
            <img
              className="hero-video-el"
              src={videoReducedMotion ? heroMobilePoster : heroMobileBgWebp}
              alt=""
            />
            <div className="hero-video-overlay" />
          </div>
        )}

        <LineFlower variant="sprig" className="flower--inv-bl" />
        <LineFlower variant="lily" className="flower--inv-br" delay={250} />
        {!isMobile && (
          <LineFlower variant="lavender" className="flower--inv-side" delay={500} />
        )}

        <div className="poster-content" data-reveal="stagger">
          <p className="poster-label">LA SÚPER INVITACIóN</p>
          <h1 className="poster-title">dan cumple años.</h1>
          <p className="poster-subtitle">y pues hay que festejar, ¿no?</p>

          <div className="poster-details">
            <p>10 de octubre, 2026</p>
            <p>5:00 PM</p>
            <p>Clandestina Pizza</p>
            <a
              className="location-button"
              href="https://maps.app.goo.gl/9X9bPHvcJdrPdy2S8?g_st=iw"
              target="_blank"
              rel="noreferrer"
            >
              Ver ubicación <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className="note poster-note">cada quien paga su consumo, obvio ♡</p>
        </div>

        <button
          className="poster-arrow"
          type="button"
          onClick={() => scrollTo("rsvp")}
          aria-label="Ir a la sección de RSVP"
        >
          <span aria-hidden="true">↓</span>
        </button>
      </section>

      <section
        id="rsvp"
        className="poster poster-2"
        data-bg="#22335F"
        data-fg="#D7D0C8"
        aria-live="polite"
      >
        <LineFlower variant="wildflower" className="flower--rsvp-main" />
        {!isMobile && (
          <LineFlower variant="leaf" className="flower--rsvp-leaf" delay={300} />
        )}

        <div className="poster-content" data-reveal="stagger">
          <p className="poster-label">TU RESPUESTA</p>
          <h2 className="poster-title">¿jalas?</h2>

          {!reply ? (
            <>
              <p className="poster-subtitle">
                nomás dime quién eres para saber a quién esperar.
              </p>

              <fieldset className="attendance-options poster-attendance">
                <legend className="sr-only">¿Puedes venir?</legend>
                <button
                  className={attendance === "yes" ? "is-selected" : ""}
                  type="button"
                  aria-pressed={attendance === "yes"}
                  onClick={() => chooseAttendance("yes")}
                >
                  sí, ahí estaré ♡
                </button>
                <button
                  className={attendance === "no" ? "is-selected" : ""}
                  type="button"
                  aria-pressed={attendance === "no"}
                  onClick={() => chooseAttendance("no")}
                >
                  esta vez no puedo :(
                </button>
              </fieldset>

              {attendance && (
                <form className="rsvp-form poster-form" onSubmit={submitRsvp} noValidate>
                  <label htmlFor="rsvp-name" className="sr-only">
                    Tu nombre
                  </label>
                  <input
                    ref={nameInput}
                    id="rsvp-name"
                    name="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      if (error) setError("")
                    }}
                    placeholder="tu nombre…"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "rsvp-error" : undefined}
                    disabled={status === "submitting"}
                  />
                  {error && (
                    <p className="error-message" id="rsvp-error" role="alert">
                      <span aria-hidden="true">!</span> {error}
                    </p>
                  )}
                  <label htmlFor="rsvp-message" className="sr-only">
                    Un mensaje (opcional)
                  </label>
                  <textarea
                    id="rsvp-message"
                    name="message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="algo que quieras decir… (opcional)"
                    rows={2}
                    disabled={status === "submitting"}
                  />
                  <input
                    name="website"
                    type="text"
                    className="sr-only"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting" ? "enviando…" : "confirmar respuesta"}
                    <span aria-hidden="true">↗</span>
                  </button>
                  <p className="privacy-note">
                    Tu respuesta se guardará en una lista,
                    cualquier pregunta adicional me mandas wsp.
                  </p>
                </form>
              )}
            </>
          ) : (
            <div className="poster-reply">
              {reply.attendance === "yes" ? (
                <>
                  <img
                    className="poster-reply-photo"
                    src={videoReducedMotion ? confirmClipPoster : confirmClipWebp}
                    alt=""
                    aria-hidden="true"
                  />
                  <p className="poster-reply-text">
                    arre, quedaste en la lista :D, {reply.name} ♡
                    <LineFlower variant="wildflower" className="flower--reply" delay={200} />
                  </p>
                </>
              ) : (
                <p className="poster-reply-text">
                  chale, tons será pal otro año :c
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="closing">
        <div
          className={`carousel ${carouselReducedMotion ? "carousel-static" : ""}`}
          aria-label="Fotos del proyecto"
        >
          <div
            ref={marqueeTrackRef}
            className="carousel-track"
            style={
              carouselReducedMotion
                ? undefined
                : ({ "--marquee-duration": marqueeDuration } as CSSProperties)
            }
            onTouchStart={pauseMarquee}
            onTouchEnd={resumeMarquee}
            onTouchCancel={resumeMarquee}
          >
            {marqueePhotos.map((photo, index) => {
              // The second, identical half exists only so the loop has no
              // seam — screen readers should see it as one real set of photos.
              const isDuplicate = index >= carouselPhotos.length
              return (
                <figure
                  className="carousel-item"
                  key={`${photo.key}-${index}`}
                  aria-hidden={isDuplicate || undefined}
                >
                  {photo.tape && (
                    <Tape className={photo.tape === "blue" ? "tape-blue" : ""} />
                  )}
                  <Picture
                    image={photo.image}
                    alt={isDuplicate ? "" : photo.alt}
                    sizes="(max-width: 700px) 62vw, 20vw"
                    priority={index < 2}
                  />
                </figure>
              )
            })}
          </div>
        </div>
        <footer className="closing-footer">
          hecho con decisiones cuestionables y buenos recuerdos.
        </footer>
      </div>
    </main>
  )
}

export default App