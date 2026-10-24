import type { ReactNode } from 'react';
import { Typewriter } from '../components/Typewriter';
import { useFocusOnMount } from '../hooks/useFocusOnMount';
import styles from './Screen.module.css';

interface Props {
  readonly eyebrow: string;
  readonly heading: string;
  readonly lines: readonly string[];
  readonly children: ReactNode;
}

/** Interstitials, the chapter 4 choice and the ending: a few typed lines, then actions. */
export function StoryScreen({ eyebrow, heading, lines, children }: Props) {
  const h1 = useFocusOnMount<HTMLHeadingElement>();
  return (
    <main className={`${styles.screen} ${styles.narrow} ${styles.story}`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 ref={h1} tabIndex={-1}>
          {heading}
        </h1>
      </header>
      <Typewriter lines={lines} />
      <div className={styles.actions}>{children}</div>
    </main>
  );
}
