/**
 * Daant ki shakl.
 *
 * Har number ki apni banawat hoti hai:
 *   1, 2  incisor   patla, seedha, aik jarr
 *   3     canine    nokdaar, lambi jarr
 *   4, 5  premolar  do choti, aik ya do jarr
 *   6,7,8 molar     chaura, kai choti, do-teen jarr
 *
 * Upper daant ki jarrein upar, lower ki neeche.
 */

interface Props {
  /** 1 se 8 tak */
  number: string
  /** upper arch hai to jarrein upar jayengi */
  upper?: boolean
  selected?: boolean
  /** condition ka rang, agar koi lagi ho */
  fill?: string
  size?: number
}

function paths(n: string) {
  switch (n) {
    // Incisors — patla crown, aik seedhi jarr
    case '1':
    case '2':
      return {
        crown: 'M13 40 h14 v14 a7 7 0 0 1 -14 0 z',
        roots: ['M16 40 L20 8 L24 40 z'],
      }

    // Canine — nokdaar crown, sabse lambi jarr
    case '3':
      return {
        crown: 'M13 40 h14 v10 l-7 9 l-7 -9 z',
        roots: ['M16 40 L20 4 L24 40 z'],
      }

    // Premolars — do choti wala crown, aik jarr
    case '4':
    case '5':
      return {
        crown: 'M11 40 h18 v11 a9 8 0 0 1 -18 0 z M15 40 v-3 M25 40 v-3',
        roots: ['M16 40 L20 10 L24 40 z'],
      }

    // Molars — chaura crown, do jarrein
    case '6':
    case '7':
      return {
        crown: 'M9 40 h22 v12 a11 9 0 0 1 -22 0 z',
        roots: ['M12 40 L14 10 L18 40 z', 'M22 40 L26 10 L28 40 z'],
      }

    // Wisdom — thora chota, jarrein qareeb
    default:
      return {
        crown: 'M10 40 h20 v11 a10 8 0 0 1 -20 0 z',
        roots: ['M14 40 L16 14 L19 40 z', 'M21 40 L24 14 L26 40 z'],
      }
  }
}

export default function ToothShape({
  number,
  upper = true,
  selected = false,
  fill,
  size = 34,
}: Props) {
  const { crown, roots } = paths(number)

  const crownFill = fill ?? (selected ? '#0B4F4A' : '#FFFFFF')
  const rootFill = fill ? fill : selected ? '#0B4F4A' : '#F3EDE2'
  const stroke = selected ? '#0B4F4A' : '#9FB8B3'

  return (
    <svg
      width={size}
      height={size * 1.6}
      viewBox="0 0 40 64"
      // Lower daant ke liye poori shakl ulti kar dein
      style={{ transform: upper ? undefined : 'rotate(180deg)' }}
      aria-hidden
    >
      {roots.map((d, i) => (
        <path key={i} d={d} fill={rootFill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      ))}
      <path
        d={crown}
        fill={crownFill}
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}
