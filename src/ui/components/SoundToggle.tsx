import styles from './SoundToggle.module.css';

interface Props {
  readonly on: boolean;
  readonly onToggle: () => void;
}

export function SoundToggle({ on, onToggle }: Props) {
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label="Sound"
      aria-pressed={on}
      onClick={onToggle}
    >
      sound: {on ? 'on' : 'off'}
    </button>
  );
}
