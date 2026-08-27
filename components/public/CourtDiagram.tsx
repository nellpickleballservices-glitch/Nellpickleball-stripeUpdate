interface CourtDiagramProps {
  locale: string
}

export function CourtDiagram({ locale }: CourtDiagramProps) {
  const labels = {
    overall: '20\' x 44\'',
    kitchen: locale === 'en' ? '7\' Non-Volley Zone (Kitchen)' : '7\' Zona de No Volea (Kitchen)',
    net: locale === 'en' ? 'Net' : 'Red',
    width: '20\'',
    length: '44\'',
  }

  return (
    <>
      {/* Vertical layout — mobile/tablet */}
      <div className="w-full max-w-lg mx-auto lg:hidden">
        <svg
          viewBox="0 0 240 480"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          role="img"
          aria-label={locale === 'en' ? 'Pickleball court diagram' : 'Diagrama de cancha de pickleball'}
        >
          <rect x="0" y="0" width="240" height="480" fill="#1C305D" rx="8" />
          <rect x="20" y="20" width="200" height="440" fill="none" stroke="#A3FF12" strokeWidth="2" />
          <line x1="20" y1="240" x2="220" y2="240" stroke="#F5F5F5" strokeWidth="3" />
          <rect x="20" y="170" width="200" height="70" fill="#38BDF8" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="20" y="240" width="200" height="70" fill="#38BDF8" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="1.5" />
          <line x1="120" y1="20" x2="120" y2="170" stroke="#A3FF12" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="120" y1="310" x2="120" y2="460" stroke="#A3FF12" strokeWidth="1" strokeDasharray="4 4" />
          <text x="120" y="235" textAnchor="middle" fill="#F5F5F5" fontSize="11" fontWeight="bold">{labels.net}</text>
          <text x="120" y="210" textAnchor="middle" fill="#38BDF8" fontSize="9">{labels.kitchen}</text>
          <text x="120" y="280" textAnchor="middle" fill="#38BDF8" fontSize="9">{labels.kitchen}</text>
          <text x="120" y="14" textAnchor="middle" fill="#A3FF12" fontSize="10" fontWeight="bold">{labels.width}</text>
          <text x="235" y="240" textAnchor="middle" fill="#A3FF12" fontSize="10" fontWeight="bold" transform="rotate(90, 235, 240)">{labels.length}</text>
          <text x="120" y="475" textAnchor="middle" fill="#F5F5F5" fontSize="10" fontWeight="bold">{labels.overall}</text>
        </svg>
      </div>

      {/* Horizontal layout — large screens */}
      <div className="hidden lg:block w-full max-w-3xl mx-auto">
        <svg
          viewBox="0 0 520 280"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          role="img"
          aria-label={locale === 'en' ? 'Pickleball court diagram' : 'Diagrama de cancha de pickleball'}
        >
          <rect x="0" y="0" width="520" height="280" fill="#1C305D" rx="8" />

          {/* Court outline */}
          <rect x="20" y="20" width="480" height="240" fill="none" stroke="#A3FF12" strokeWidth="2" />

          {/* Center line (net) */}
          <line x1="260" y1="20" x2="260" y2="260" stroke="#F5F5F5" strokeWidth="3" />

          {/* Kitchen zones */}
          <rect x="184" y="20" width="76" height="240" fill="#38BDF8" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="260" y="20" width="76" height="240" fill="#38BDF8" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="1.5" />

          {/* Center service line — left half */}
          <line x1="20" y1="140" x2="184" y2="140" stroke="#A3FF12" strokeWidth="1" strokeDasharray="4 4" />
          {/* Center service line — right half */}
          <line x1="336" y1="140" x2="500" y2="140" stroke="#A3FF12" strokeWidth="1" strokeDasharray="4 4" />

          {/* Net label */}
          <text x="260" y="16" textAnchor="middle" fill="#F5F5F5" fontSize="11" fontWeight="bold">{labels.net}</text>

          {/* Kitchen labels (rotated to fit vertical zones) */}
          <text x="222" y="145" textAnchor="middle" fill="#38BDF8" fontSize="9" transform="rotate(-90, 222, 145)">{labels.kitchen}</text>
          <text x="298" y="145" textAnchor="middle" fill="#38BDF8" fontSize="9" transform="rotate(90, 298, 145)">{labels.kitchen}</text>

          {/* Length label (top) */}
          <text x="260" y="275" textAnchor="middle" fill="#A3FF12" fontSize="10" fontWeight="bold">{labels.length}</text>

          {/* Width label (left side, rotated) */}
          <text x="12" y="140" textAnchor="middle" fill="#A3FF12" fontSize="10" fontWeight="bold" transform="rotate(-90, 12, 140)">{labels.width}</text>

          {/* Overall dimensions */}
          <text x="508" y="140" textAnchor="middle" fill="#F5F5F5" fontSize="10" fontWeight="bold" transform="rotate(90, 508, 140)">{labels.overall}</text>
        </svg>
      </div>
    </>
  )
}
