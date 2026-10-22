/** Shared <defs> for one room <svg>: material textures, gradients and selection outline filters. */
export function SceneDefs({ id, accent }: { id: string; accent: string }) {
  const t = (name: string) => `${id}-tex-${name}`;
  return (
    <defs>
      <pattern id={t('boucle')} width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.7" fill="#fff" opacity="0.22" />
        <circle cx="5.5" cy="5" r="1.5" fill="#000" opacity="0.09" />
        <circle cx="5.5" cy="1.5" r="0.9" fill="#fff" opacity="0.12" />
      </pattern>
      <pattern id={t('chenille')} width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1" fill="#fff" opacity="0.12" />
        <circle cx="3.8" cy="3.6" r="1" fill="#000" opacity="0.07" />
      </pattern>
      <pattern id={t('linen')} width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M0 0.5H4" stroke="#fff" strokeOpacity="0.16" />
        <path d="M2.5 0V4" stroke="#000" strokeOpacity="0.05" />
      </pattern>
      <pattern id={t('cotton')} width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 6L6 0" stroke="#000" strokeOpacity="0.05" />
      </pattern>
      <linearGradient id={t('velvet')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
        <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id={t('leather')} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
        <stop offset="0.35" stopColor="#fff" stopOpacity="0.02" />
        <stop offset="1" stopColor="#000" stopOpacity="0.16" />
      </linearGradient>
      <linearGradient id={t('metal')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.2" />
      </linearGradient>
      <pattern id={t('wood')} width="60" height="9" patternUnits="userSpaceOnUse">
        <path d="M0 3 Q15 1.5 30 3 T60 3" fill="none" stroke="#000" strokeOpacity="0.09" />
        <path d="M0 7 Q20 8.5 40 7 T60 7" fill="none" stroke="#fff" strokeOpacity="0.08" />
      </pattern>
      <pattern id={t('stone')} width="11" height="11" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="3" r="0.8" fill="#000" opacity="0.08" />
        <circle cx="7" cy="8" r="1.2" fill="#fff" opacity="0.12" />
        <path d="M0 9 Q5 7 11 10" fill="none" stroke="#000" strokeOpacity="0.05" />
      </pattern>
      <pattern id={t('rattan')} width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 0L6 6M6 0L0 6" stroke="#000" strokeOpacity="0.14" />
      </pattern>
      <pattern id={t('wool')} width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.8" fill="#000" opacity="0.06" />
        <circle cx="3" cy="3" r="0.8" fill="#fff" opacity="0.08" />
      </pattern>
      <pattern id={t('jute')} width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M0 5L5 0" stroke="#000" strokeOpacity="0.14" />
        <path d="M0 0L5 5" stroke="#fff" strokeOpacity="0.1" />
      </pattern>

      <linearGradient id={`${id}-cushionshade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
        <stop offset="1" stopColor="#000" stopOpacity="0.16" />
      </linearGradient>
      <radialGradient id={`${id}-glow`}>
        <stop offset="0" stopColor="#ffe2a8" stopOpacity="0.75" />
        <stop offset="0.5" stopColor="#ffd08a" stopOpacity="0.18" />
        <stop offset="1" stopColor="#ffd08a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-shadelight`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.08" />
        <stop offset="1" stopColor="#fff3d6" stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#bcd3e4" />
        <stop offset="0.7" stopColor="#e3ecf0" />
        <stop offset="1" stopColor="#d9dfd2" />
      </linearGradient>
      <linearGradient id={`${id}-vignette`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.06" />
        <stop offset="0.5" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.1" />
      </linearGradient>

      <filter id={`${id}-blur8`} x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <filter id={`${id}-blur20`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="20" />
      </filter>
      <filter id={`${id}-patchblur`} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      {/* Outline that follows the item's real silhouette */}
      <filter id={`${id}-outline-hover`} x="-5%" y="-5%" width="110%" height="110%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d" />
        <feFlood floodColor="#ffffff" floodOpacity="0.95" />
        <feComposite in2="d" operator="in" result="ring" />
        <feComposite in="ring" in2="SourceAlpha" operator="out" />
      </filter>
      <filter id={`${id}-outline-selected`} x="-5%" y="-5%" width="110%" height="110%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="outer" />
        <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="inner" />
        <feComposite in="outer" in2="inner" operator="out" result="band" />
        <feFlood floodColor={accent} />
        <feComposite in2="band" operator="in" />
      </filter>
    </defs>
  );
}
