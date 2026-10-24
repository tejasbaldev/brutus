import { title } from '../../story/chapters';
import styles from './Screen.module.css';

export function TitleScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <main className={`${styles.screen} ${styles.narrow}`}>
      <p className={styles.eyebrow}>~/brutus $</p>
      <h1>{title.heading}</h1>
      <p className={styles.lede}>{title.lede}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onBegin}>
          Begin
        </button>
      </div>
    </main>
  );
}
