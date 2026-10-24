import { useEffect, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import styles from './Typewriter.module.css';

const CHAR_MS = 28;

/**
 * Types the lines out one character at a time; instant under reduced motion, and a click
 * reveals everything. Screen readers get the full text at once.
 */
export function Typewriter({ lines }: { readonly lines: readonly string[] }) {
  const reducedMotion = useReducedMotion();
  const total = lines.reduce((n, line) => n + line.length, 0);
  const [progress, setProgress] = useState(0);
  const typed = reducedMotion ? total : progress;

  // Lines are fixed for the life of a screen (each story screen is keyed by stage).
  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setProgress((n) => {
        if (n >= total) window.clearInterval(timer);
        return Math.min(n + 1, total);
      });
    }, CHAR_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [total, reducedMotion]);

  const starts = lines.map((_, i) => lines.slice(0, i).reduce((n, l) => n + l.length, 0));
  return (
    <div className={styles.typewriter}>
      <div className={styles.srOnly}>
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      {/* Untyped text is laid out but hidden, so nothing reflows while typing. */}
      <div
        aria-hidden="true"
        onClick={() => {
          setProgress(total);
        }}
      >
        {lines.map((line, i) => {
          const shown = Math.max(0, Math.min(line.length, typed - (starts[i] ?? 0)));
          const typing = shown > 0 && shown < line.length;
          return (
            <p key={i} className={styles.line}>
              {line.slice(0, shown)}
              {typing && <span className={styles.caret} />}
              <span className={styles.untyped}>{line.slice(shown)}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
