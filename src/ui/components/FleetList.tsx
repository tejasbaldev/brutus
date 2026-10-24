import type { ShipId } from '../../engine/types';
import { shipNames } from '../../story/chapters';
import styles from './FleetList.module.css';

export type ShipStatus = 'unplaced' | 'placed' | 'afloat' | 'sunk';

export interface FleetEntry {
  readonly id: ShipId;
  readonly length: number;
  readonly status: ShipStatus;
}

interface FleetListProps {
  readonly label: string;
  readonly ships: readonly FleetEntry[];
  /** When set, entries become buttons (placement). */
  readonly selected?: ShipId | null;
  readonly onSelect?: (id: ShipId) => void;
}

const STATUS_TEXT: Record<ShipStatus, string> = {
  unplaced: 'not placed',
  placed: 'placed',
  afloat: 'afloat',
  sunk: 'sunk',
};

export function FleetList({ label, ships, selected, onSelect }: FleetListProps) {
  return (
    <section className={styles.fleet} aria-label={label}>
      <h2 className={styles.heading}>{label}</h2>
      <ul className={styles.list}>
        {ships.map((ship) => {
          const content = (
            <>
              <span className={styles.name}>{shipNames[ship.id]}</span>
              <span className={styles.pips} aria-hidden="true">
                {'■'.repeat(ship.length)}
              </span>
              <span className={styles.status}>{STATUS_TEXT[ship.status]}</span>
            </>
          );
          return (
            <li key={ship.id} className={styles.item} data-status={ship.status}>
              {onSelect ? (
                <button
                  type="button"
                  className={styles.button}
                  aria-pressed={selected === ship.id}
                  onClick={() => {
                    onSelect(ship.id);
                  }}
                >
                  {content}
                </button>
              ) : (
                <div className={styles.row}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
