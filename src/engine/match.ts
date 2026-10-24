import { fire, isFleetSunk, toView, createBoard, type FireError } from './board';
import { STANDARD_FLEET } from './fleet';
import {
  isFleetComplete,
  placeShip,
  randomPlacement,
  removeShip,
  type PlacementError,
} from './placement';
import { createRng } from './rng';
import {
  BOARD_SIZE,
  err,
  ok,
  type Board,
  type BoardView,
  type Coord,
  type Result,
  type ShipId,
  type ShipPlacement,
  type ShipSpec,
  type Shot,
} from './types';

/**
 * One battle. 'versus': player and AI fire at each other's boards.
 * 'coop': player and AI take turns firing at one shared target (the incident).
 * Chapters and story flow wrap matches; they are not part of this module.
 */
export type MatchMode = 'versus' | 'coop';
export type MatchPhase = 'placement' | 'battle' | 'over';
export type Side = 'player' | 'ai';
export type Winner = Side | 'team';

export interface TurnRecord {
  readonly by: Side;
  readonly shot: Shot;
}

export interface MatchState {
  readonly mode: MatchMode;
  readonly phase: MatchPhase;
  readonly size: number;
  /** The fleet the player must place (versus only). */
  readonly fleet: readonly ShipSpec[];
  /** The player's ships while placing; frozen into `player` on start. */
  readonly placing: readonly ShipPlacement[];
  /** The player's board: the AI fires here. Empty in co-op. */
  readonly player: Board;
  /** The board the player fires at: the AI's fleet, or the shared incident. */
  readonly target: Board;
  readonly turn: Side;
  readonly winner: Winner | null;
  readonly log: readonly TurnRecord[];
}

export type MatchAction =
  | { readonly type: 'place'; readonly placement: ShipPlacement }
  | { readonly type: 'remove'; readonly shipId: ShipId }
  | { readonly type: 'autoPlace'; readonly seed: number }
  | { readonly type: 'start' }
  | { readonly type: 'fire'; readonly by: Side; readonly coord: Coord };

export type MatchError =
  | { readonly kind: 'wrong-phase'; readonly phase: MatchPhase }
  | { readonly kind: 'not-your-turn'; readonly turn: Side }
  | { readonly kind: 'fleet-incomplete' }
  | { readonly kind: 'placement'; readonly reason: PlacementError }
  | { readonly kind: 'fire'; readonly reason: FireError };

interface VersusOptions {
  readonly opponentShips: readonly ShipPlacement[];
  readonly fleet?: readonly ShipSpec[];
  readonly firstTurn?: Side;
  readonly size?: number;
}

export function createVersusMatch({
  opponentShips,
  fleet = STANDARD_FLEET,
  firstTurn = 'player',
  size = BOARD_SIZE,
}: VersusOptions): MatchState {
  return {
    mode: 'versus',
    phase: 'placement',
    size,
    fleet,
    placing: [],
    player: createBoard([], size),
    target: createBoard(opponentShips, size),
    turn: firstTurn,
    winner: null,
    log: [],
  };
}

interface CoopOptions {
  readonly incidentShips: readonly ShipPlacement[];
  readonly firstTurn?: Side;
  readonly size?: number;
}

/** Co-op has no placement: the player's work isn't under fire, the incident is. */
export function createCoopMatch({
  incidentShips,
  firstTurn = 'player',
  size = BOARD_SIZE,
}: CoopOptions): MatchState {
  return {
    mode: 'coop',
    phase: 'battle',
    size,
    fleet: [],
    placing: [],
    player: createBoard([], size),
    target: createBoard(incidentShips, size),
    turn: firstTurn,
    winner: null,
    log: [],
  };
}

const other = (side: Side): Side => (side === 'player' ? 'ai' : 'player');

/** The board a side fires at. */
export function boardFiredAtBy(state: MatchState, side: Side): Board {
  return state.mode === 'versus' && side === 'ai' ? state.player : state.target;
}

/** What a side may see of the board it fires at. Feed this to the AI. */
export function viewFor(state: MatchState, side: Side): BoardView {
  return toView(boardFiredAtBy(state, side));
}

export function applyMatchAction(
  state: MatchState,
  action: MatchAction,
): Result<MatchState, MatchError> {
  switch (action.type) {
    case 'place': {
      if (state.phase !== 'placement') return err({ kind: 'wrong-phase', phase: state.phase });
      const placed = placeShip(state.placing, action.placement, state.fleet, state.size);
      if (!placed.ok) return err({ kind: 'placement', reason: placed.error });
      return ok({ ...state, placing: placed.value });
    }
    case 'remove': {
      if (state.phase !== 'placement') return err({ kind: 'wrong-phase', phase: state.phase });
      return ok({ ...state, placing: removeShip(state.placing, action.shipId) });
    }
    case 'autoPlace': {
      if (state.phase !== 'placement') return err({ kind: 'wrong-phase', phase: state.phase });
      const placing = randomPlacement(state.fleet, createRng(action.seed), state.size);
      return ok({ ...state, placing });
    }
    case 'start': {
      if (state.phase !== 'placement') return err({ kind: 'wrong-phase', phase: state.phase });
      if (!isFleetComplete(state.placing, state.fleet, state.size)) {
        return err({ kind: 'fleet-incomplete' });
      }
      return ok({ ...state, phase: 'battle', player: createBoard(state.placing, state.size) });
    }
    case 'fire': {
      if (state.phase !== 'battle') return err({ kind: 'wrong-phase', phase: state.phase });
      if (action.by !== state.turn) return err({ kind: 'not-your-turn', turn: state.turn });

      const firesAtPlayer = state.mode === 'versus' && action.by === 'ai';
      const fired = fire(firesAtPlayer ? state.player : state.target, action.coord);
      if (!fired.ok) return err({ kind: 'fire', reason: fired.error });

      const { board, shot } = fired.value;
      const next: MatchState = {
        ...state,
        ...(firesAtPlayer ? { player: board } : { target: board }),
        log: [...state.log, { by: action.by, shot }],
      };
      if (isFleetSunk(board)) {
        return ok({ ...next, phase: 'over', winner: state.mode === 'coop' ? 'team' : action.by });
      }
      // Classic rules: turns alternate every shot, hit or miss.
      return ok({ ...next, turn: other(action.by) });
    }
  }
}

/** useReducer-friendly wrapper: invalid actions return the same state object. */
export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  const result = applyMatchAction(state, action);
  return result.ok ? result.value : state;
}
