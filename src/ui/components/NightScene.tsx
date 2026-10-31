import styles from './NightScene.module.css';

const MASK =
  'M2 10c6-6 16-8 24-4 3 2 4 2 6 2s3 0 6-2c8-4 18-2 24 4-1 10-8 16-18 16-6 0-9-4-12-8-3 4-6 8-12 8C10 26 3 20 2 10Z';

function Mask({ eyes }: { readonly eyes: string }) {
  return (
    <>
      <path d={MASK} fill="currentColor" />
      <ellipse cx="19" cy="14" rx="7" ry="4.5" fill={eyes} />
      <ellipse cx="45" cy="14" rx="7" ry="4.5" fill={eyes} />
    </>
  );
}

/** A small domino mask: the sidekick's mark. Original artwork. */
export function MaskMark() {
  return (
    <svg className={styles.mask} viewBox="0 0 64 28" aria-hidden="true">
      <Mask eyes="var(--bg)" />
    </svg>
  );
}

const BUILDINGS: readonly (readonly [number, number, number])[] = [
  [0, 330, 40],
  [34, 290, 30],
  [70, 262, 44],
  [118, 312, 26],
  [150, 236, 34],
  [190, 224, 46],
  [242, 286, 30],
  [276, 252, 40],
  [322, 300, 34],
  [360, 240, 44],
  [408, 278, 30],
  [442, 318, 38],
];

/**
 * The night shift: a city skyline, a searchlight, and a signal in the clouds. You are the hero
 * on the tallest roof; the signal is your sidekick calling. Original artwork, theme tokens only.
 */
export function NightScene() {
  return (
    <svg className={styles.scene} viewBox="0 0 480 420" aria-hidden="true">
      <polygon className={styles.beam} points="318,420 334,420 400,120 290,120" />
      <circle className={styles.signal} cx="344" cy="96" r="62" />
      <g className={styles.signalMask} transform="translate(302 75) scale(1.3)">
        <Mask eyes="var(--signal-fill)" />
      </g>
      <g className={styles.city}>
        {BUILDINGS.map(([x, y, w]) => (
          <rect key={x} x={x} y={y} width={w} height={420 - y} />
        ))}
        <rect x="168" y="214" width="3" height="22" />
        <rect x="380" y="226" width="3" height="14" />
      </g>
      <g className={styles.windows}>
        {BUILDINGS.flatMap(([x, y, w], i) =>
          [0, 1, 2].map((k) => (
            <rect
              key={`${x}-${k}`}
              x={x + 8 + ((i + k) % 2) * (w - 22)}
              y={y + 18 + k * 26}
              width="6"
              height="8"
              opacity={(i + k) % 3 === 0 ? 1 : 0.35}
            />
          )),
        )}
      </g>
      {/* The hero, seen from behind on the tallest roof, cape down, looking up at the signal. */}
      <g className={styles.hero}>
        <circle cx="213" cy="191" r="7" />
        <path d="M207 186l1-9 3 6Z M219 186l-1-9-3 6Z" />
        <path d="M205 199h16l9 25q-4-3-8 0-4-3-9 0-5-3-9 0-4-3-8 0Z" />
      </g>
    </svg>
  );
}
