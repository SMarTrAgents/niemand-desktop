/**
 * Nobody / Niemand — der weiße Hase vom Golden Ticket.
 * SVG 1:1 aus dem Cloud-Frontend übernommen (kein Redesign!).
 * Die Gruppen tragen Klassen, damit CSS-Animationen (winken, Ohr, hüpfen,
 * schlafen) gezielt greifen können. Animation selbst lebt in pet.css.
 */
interface Props {
  className?: string;
  title: string; // barrierefreier Name: "Niemand, der weiße Hase"
}

export default function NobodyRabbitSvg({ className, title }: Props) {
  return (
    <svg viewBox="0 0 100 110" className={className} role="img" aria-label={title}>
      <g fill="#f7f7ff">
        <ellipse className="nobody-ear" cx="40" cy="22" rx="7" ry="20" />
        <ellipse cx="58" cy="20" rx="7" ry="21" transform="rotate(9 58 20)" />
        <ellipse cx="40" cy="24" rx="3.4" ry="13" fill="#ffd4e0" />
        <ellipse cx="58" cy="22" rx="3.4" ry="14" fill="#ffd4e0" transform="rotate(9 58 22)" />
        <circle cx="49" cy="50" r="21" />
        <ellipse cx="49" cy="85" rx="19" ry="20" />
        <g className="nobody-arm">
          <ellipse cx="28" cy="76" rx="6.5" ry="14" transform="rotate(38 28 76)" />
          <circle cx="20" cy="64" r="5.4" />
        </g>
        <ellipse cx="70" cy="82" rx="6.5" ry="14" transform="rotate(-24 70 82)" />
        <ellipse cx="40" cy="103" rx="9" ry="5.5" />
        <ellipse cx="58" cy="103" rx="9" ry="5.5" />
      </g>
      <circle className="nobody-eye nobody-eye--l" cx="42" cy="48" r="2.6" fill="#14141c" />
      <circle className="nobody-eye nobody-eye--r" cx="56" cy="48" r="2.6" fill="#14141c" />
      <path d="M46 56 q3 3 6 0" stroke="#14141c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse className="nobody-nose" cx="49" cy="53.5" rx="2.4" ry="1.7" fill="#ff9db3" />
      {/* Denk-Punkte (nur im Zustand "thinking" sichtbar) */}
      <g className="nobody-think" aria-hidden="true">
        <circle cx="74" cy="34" r="2.1" fill="#00d4ff" />
        <circle cx="81" cy="28" r="2.7" fill="#00d4ff" />
        <circle cx="89" cy="21" r="3.3" fill="#00d4ff" />
      </g>
      {/* Zzz (nur im Zustand "sleeping" sichtbar) */}
      <g className="nobody-zzz" aria-hidden="true" fill="#9ad8e8" fontFamily="system-ui, sans-serif" fontWeight="700">
        <text x="70" y="34" fontSize="9">z</text>
        <text x="78" y="26" fontSize="12">Z</text>
        <text x="88" y="17" fontSize="15">Z</text>
      </g>
    </svg>
  );
}
