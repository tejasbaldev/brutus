import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { coord, coordKey, sameCoord, toLabel } from '../../engine/coord';
import type { Coord } from '../../engine/types';
import styles from './Grid.module.css';

export type CellKind = 'water' | 'ship' | 'miss' | 'hit' | 'sunk';
export type CellOverlay = 'preview' | 'invalid';

export interface CellModel {
  readonly kind: CellKind;
  readonly overlay?: CellOverlay | undefined;
  /** Spoken after the coordinate, e.g. "hit, The Promotion". */
  readonly description: string;
  /** 0-1: a faint hint of where the AI thinks ships are (co-op). Visual only. */
  readonly heat?: number | undefined;
}

interface GridProps {
  readonly label: string;
  readonly size: number;
  readonly cellAt: (c: Coord) => CellModel;
  readonly cursor: Coord;
  readonly onCursorChange: (c: Coord) => void;
  /** Omit for a read-only board: still navigable, never actionable. */
  readonly onActivate?: ((c: Coord) => void) | undefined;
  /** Keys the grid doesn't handle itself (e.g. R to rotate). Return true if handled. */
  readonly onCommandKey?: ((key: string) => boolean) | undefined;
  /** Cells that can't be activated right now (e.g. already fired at). */
  readonly isDisabled?: ((c: Coord) => boolean) | undefined;
  /** Smaller cells on narrow screens (your own board in battle). */
  readonly compact?: boolean;
}

const GLYPH: Record<CellKind, string> = { water: '', ship: '', miss: '', hit: '×', sunk: '×' };

export function Grid({
  label,
  size,
  cellAt,
  cursor,
  onCursorChange,
  onActivate,
  onCommandKey,
  isDisabled,
  compact = false,
}: GridProps) {
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const columns = Array.from({ length: size }, (_, i) => i);

  const moveTo = (next: Coord) => {
    onCursorChange(next);
    cells.current.get(coordKey(next))?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const { row, col } = cursor;
    const last = size - 1;
    const moves: Record<string, Coord> = {
      ArrowUp: coord(Math.max(0, row - 1), col),
      ArrowDown: coord(Math.min(last, row + 1), col),
      ArrowLeft: coord(row, Math.max(0, col - 1)),
      ArrowRight: coord(row, Math.min(last, col + 1)),
      Home: event.ctrlKey ? coord(0, 0) : coord(row, 0),
      End: event.ctrlKey ? coord(last, last) : coord(row, last),
    };
    const next = moves[event.key];
    if (next) {
      event.preventDefault();
      moveTo(next);
    } else if (onCommandKey?.(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <div className={compact ? `${styles.frame} ${styles.compact}` : styles.frame}>
      <div className={styles.columnLabels} aria-hidden="true">
        <span />
        {columns.map((c) => (
          <span key={c}>{c + 1}</span>
        ))}
      </div>
      <div
        role="grid"
        aria-label={label}
        aria-readonly={onActivate ? undefined : true}
        className={styles.grid}
        onKeyDown={onKeyDown}
      >
        {columns.map((r) => (
          <div role="row" key={r} className={styles.row}>
            <span className={styles.rowLabel} aria-hidden="true">
              {String.fromCharCode(65 + r)}
            </span>
            {columns.map((c) => {
              const at = coord(r, c);
              const model = cellAt(at);
              const activate = isDisabled?.(at) ? undefined : onActivate;
              const disabled = !activate;
              const focused = sameCoord(at, cursor);
              return (
                <button
                  role="gridcell"
                  key={c}
                  type="button"
                  ref={(el) => {
                    if (el) cells.current.set(coordKey(at), el);
                    else cells.current.delete(coordKey(at));
                  }}
                  className={styles.cell}
                  data-kind={model.kind}
                  data-overlay={model.overlay}
                  data-heat={model.heat === undefined ? undefined : ''}
                  style={
                    model.heat === undefined
                      ? undefined
                      : ({ '--heat': model.heat.toFixed(2) } as CSSProperties)
                  }
                  tabIndex={focused ? 0 : -1}
                  aria-label={`${toLabel(at)}, ${model.description}`}
                  aria-disabled={disabled || undefined}
                  onFocus={() => {
                    if (!focused) onCursorChange(at);
                  }}
                  // Move, not enter: a resting pointer must not fight the keyboard.
                  onPointerMove={() => {
                    if (!focused) onCursorChange(at);
                  }}
                  onClick={() => {
                    activate?.(at);
                  }}
                >
                  <span aria-hidden="true">{GLYPH[model.kind]}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
