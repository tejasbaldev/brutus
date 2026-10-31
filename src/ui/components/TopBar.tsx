import { MaskMark } from './NightScene';
import styles from './TopBar.module.css';

interface Props {
  readonly sound: boolean;
  readonly onToggleSound: () => void;
}

/** The one piece of chrome on every screen: the wordmark and the sound switch. */
export function TopBar({ sound, onToggleSound }: Props) {
  return (
    <div className={styles.bar}>
      <span className={styles.mark}>
        <MaskMark />
        Robin
      </span>
      <button
        type="button"
        className={styles.toggle}
        aria-label="Sound"
        aria-pressed={sound}
        onClick={onToggleSound}
      >
        sound {sound ? 'on' : 'off'}
      </button>
    </div>
  );
}
