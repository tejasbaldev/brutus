import { title } from '../../story/chapters';
import styles from './Screen.module.css';

interface Props {
  readonly onBegin: () => void;
  /** Present when there is a saved campaign to resume. */
  readonly onContinue?: (() => void) | undefined;
}

export function TitleScreen({ onBegin, onContinue }: Props) {
  return (
    <main className={`${styles.screen} ${styles.narrow}`}>
      <p className={styles.eyebrow}>~/brutus $</p>
      <h1>{title.heading}</h1>
      <p className={styles.lede}>{title.lede}</p>
      <div className={styles.actions}>
        {onContinue ? (
          <>
            <button type="button" className={styles.primary} onClick={onContinue}>
              Continue
            </button>
            <button type="button" className={styles.secondary} onClick={onBegin}>
              Start over
            </button>
          </>
        ) : (
          <button type="button" className={styles.primary} onClick={onBegin}>
            Begin
          </button>
        )}
      </div>
    </main>
  );
}
