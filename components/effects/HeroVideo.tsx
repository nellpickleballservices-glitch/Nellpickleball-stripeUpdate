/**
 * Full-bleed hero background — autoplay video on every screen size.
 * `playsInline` + `muted` are required for autoplay on iOS Safari.
 */
export function HeroVideo() {
  return (
    <div className="absolute inset-0 z-[1]" aria-hidden="true">
      <video
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        poster="/images/siteImages/hero-mobile-img.jpeg"
        className="absolute inset-0 w-full h-full object-cover object-right sm:object-center"
      >
        <source src="/videos/Hero-video2.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay — bottom-heavy gradient for text legibility */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: `
            linear-gradient(
              to top,
              rgba(28, 48, 93, 0.92) 0%,
              rgba(28, 48, 93, 0.55) 35%,
              rgba(28, 48, 93, 0.15) 60%,
              rgba(28, 48, 93, 0.10) 100%
            )
          `,
        }}
      />
      {/* Left-edge gradient so bottom-left text stays readable */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: `
            linear-gradient(
              to right,
              rgba(28, 48, 93, 0.50) 0%,
              rgba(28, 48, 93, 0.20) 30%,
              transparent 60%
            )
          `,
        }}
      />
    </div>
  )
}
