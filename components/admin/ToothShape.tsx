/**
 * Daant ki shakl.
 *
 * Har number ki apni banawat hoti hai:
 *   1, 2  incisor   patla, seedha, aik jarr
 *   3     canine    nokdaar, lambi jarr
 *   4, 5  premolar  do choti, aik jarr
 *   6,7,8 molar     chaura, kai choti, do jarrein
 *
 * Upper daant ki jarrein upar, lower ki neeche. Rang gehra rakha hai taake chhote size par bhi saaf nazar aaye.
 */

interface Props {
  /** 1 se 8 tak */
  number: string
  /** upper arch hai to jarrein upar jayengi */
  upper?: boolean
  selected?: boolean
  /** condition ka rang, agar koi lagi ho */
  fill?: string
  /** purani (pichli visit ki) nishani: halka dikhao */
  ghost?: boolean
  /** chhote (doodh ke) daant */
  primary?: boolean
  size?: number
}

function paths(n: string) {
  switch (n) {
    // Incisors: patli, chaori crown, aik seedhi jarr
    case '1':
    case '2':
      return {
        crown: 'M12.5 38 H27.5 L27 52 Q26.5 60 20 60 Q13.5 60 13 52 Z',
        roots: ['M15 38 Q16 22 19.2 6 Q20 4.5 20.8 6 Q24 22 25 38 Z'],
        detail: '',
      }
    // Canine: nokdaar crown, sab se lambi jarr
    case '3':
      return {
        crown: 'M12 38 H28 L27.5 50 L20 62 L12.5 50 Z',
        roots: ['M15 38 Q16 20 19 3 Q20 1.5 21 3 Q24 20 25 38 Z'],
        detail: '',
      }
    // Premolars: chaori crown, beech mein darar, aik jarr
    case '4':
    case '5':
      return {
        crown: 'M10 38 H30 L29 52 Q28 60 20 60 Q12 60 11 52 Z',
        roots: ['M15 38 Q16 22 19 8 Q20 6.5 21 8 Q24 22 25 38 Z'],
        detail: 'M20 43 V52',
      }
    // Molars: chaura crown, kai ubhar, do jarrein
    case '6':
    case '7':
      return {
        crown: 'M7 38 H33 L32 52 Q31 61 24 61 H16 Q9 61 8 52 Z',
        roots: ['M10 38 Q10.5 22 14 8 Q15 6 16 8 Q18.5 22 19 38 Z', 'M21 38 Q21.5 22 25 8 Q26 6 27 8 Q29.5 22 30 38 Z'],
        detail: 'M20 43 V55 M12 48 H28',
      }
    // Aqal daarh: thori chhoti, jarrein qareeb
    default:
      return {
        crown: 'M9 38 H31 L30 51 Q29 60 23 60 H17 Q11 60 10 51 Z',
        roots: ['M13 38 Q14 24 16 12 Q17 10 18 12 Q19.5 24 20 38 Z', 'M21 38 Q22 24 24 12 Q25 10 26 12 Q27.5 24 28 38 Z'],
        detail: 'M20 43 V53',
      }
  }
}

export default function ToothShape({ number, upper = true, selected = false, fill, ghost = false, primary = false, size = 34 }: Props) {
  const { crown, roots, detail } = paths(number)

  const crownFill = fill ?? (selected ? '#BFDBFE' : '#FFFFFF')
  const rootFill = fill ?? (selected ? '#BFDBFE' : '#E2E8F0')
  const stroke = selected ? '#1D4ED8' : '#475569'
  const sw = selected ? 2 : 1.6

  return (
    <svg
      width={size}
      height={size * 1.6}
      viewBox="0 0 40 64"
      // Lower daant ke liye poori shakl ulti kar dein
      style={{ transform: upper ? undefined : 'rotate(180deg)', opacity: ghost ? 0.6 : 1 }}
      aria-hidden
    >
      <g transform={primary ? 'translate(4 6) scale(0.8)' : undefined}>
        {roots.map((d, i) => (
          <path key={i} d={d} fill={rootFill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        <path d={crown} fill={crownFill} stroke={stroke} strokeWidth={sw + 0.2} strokeLinejoin="round" />
        {detail && <path d={detail} fill="none" stroke={stroke} strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round" />}
      </g>
    </svg>
  )
}
