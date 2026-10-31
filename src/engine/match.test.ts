import { describe, expect, it } from 'vitest';
import { allCoords, coord } from './coord';
import { INCIDENT_FLEET, STANDARD_FLEET } from './fleet';
import {
  applyMatchAction,
  boardFiredAtBy,
  createCoopMatch,
  createVersusMatch,
  matchActions,
  matchReducer,
  replayMatch,
  viewFor,
  type MatchAction,
  type MatchState,
  type Side,
} from './match';
import { randomPlacement, shipCells } from './placement';
import { createRng, pick } from './rng';
import type { ShipPlacement } from './types';

const row = (id: ShipPlacement['id'], r: number, length: number): ShipPlacement => ({
  id,
  origin: coord(r, 0),
  orientation: 'h',
  length,
});

/** Each ship on its own row from the top: easy to reason about in tests. */
const stacked = (rowOffset = 0): ShipPlacement[] => [
  row('side-project', rowOffset + 0, 5),
  row('promotion', rowOffset + 1, 4),
  row('oss-lib', rowOffset + 2, 3),
  row('pet-project', rowOffset + 3, 3),
  row('weekend-hack', rowOffset + 4, 2),
];

const apply = (state: MatchState, ...actions: MatchAction[]): MatchState =>
  actions.reduce((s, a) => {
    const r = applyMatchAction(s, a);
    if (!r.ok) throw new Error(`${a.type} failed: ${JSON.stringify(r.error)}`);
    return r.value;
  }, state);

const started = (): MatchState =>
  apply(
    createVersusMatch({ opponentShips: stacked() }),
    ...stacked(5).map((placement): MatchAction => ({ type: 'place', placement })),
    { type: 'start' },
  );

describe('placement phase', () => {
  it('starts in placement with nothing placed', () => {
    const m = createVersusMatch({ opponentShips: stacked() });
    expect(m.phase).toBe('placement');
    expect(m.placing).toEqual([]);
    expect(m.fleet).toBe(STANDARD_FLEET);
  });

  it('places, moves and removes ships', () => {
    let m = createVersusMatch({ opponentShips: stacked() });
    m = apply(m, { type: 'place', placement: row('weekend-hack', 0, 2) });
    m = apply(m, { type: 'place', placement: row('weekend-hack', 9, 2) });
    expect(m.placing).toEqual([row('weekend-hack', 9, 2)]);
    m = apply(m, { type: 'remove', shipId: 'weekend-hack' });
    expect(m.placing).toEqual([]);
  });

  it('surfaces placement errors', () => {
    const m = createVersusMatch({ opponentShips: stacked() });
    const r = applyMatchAction(m, {
      type: 'place',
      placement: { ...row('side-project', 0, 5), origin: coord(0, 8) },
    });
    expect(r).toEqual({ ok: false, error: { kind: 'placement', reason: 'out-of-bounds' } });
  });

  it('auto-places a complete fleet deterministically', () => {
    const m = createVersusMatch({ opponentShips: stacked() });
    const a = apply(m, { type: 'autoPlace', seed: 7 });
    const b = apply(m, { type: 'autoPlace', seed: 7 });
    expect(a.placing).toHaveLength(5);
    expect(a.placing).toEqual(b.placing);
    expect(apply(a, { type: 'start' }).phase).toBe('battle');
  });

  it('refuses to start with an incomplete fleet', () => {
    const m = apply(createVersusMatch({ opponentShips: stacked() }), {
      type: 'place',
      placement: row('weekend-hack', 0, 2),
    });
    expect(applyMatchAction(m, { type: 'start' })).toEqual({
      ok: false,
      error: { kind: 'fleet-incomplete' },
    });
  });

  it('refuses to fire before the battle', () => {
    const m = createVersusMatch({ opponentShips: stacked() });
    expect(applyMatchAction(m, { type: 'fire', by: 'player', coord: coord(0, 0) })).toEqual({
      ok: false,
      error: { kind: 'wrong-phase', phase: 'placement' },
    });
  });
});

describe('battle phase (versus)', () => {
  it('freezes the placed fleet into the player board', () => {
    const m = started();
    expect(m.phase).toBe('battle');
    expect(m.player.ships).toEqual(stacked(5));
  });

  it('rejects placement changes once the battle starts', () => {
    const m = started();
    expect(applyMatchAction(m, { type: 'remove', shipId: 'weekend-hack' }).ok).toBe(false);
    expect(applyMatchAction(m, { type: 'autoPlace', seed: 1 }).ok).toBe(false);
    expect(applyMatchAction(m, { type: 'start' }).ok).toBe(false);
  });

  it('player fires at the opponent and AI fires at the player', () => {
    let m = started();
    m = apply(m, { type: 'fire', by: 'player', coord: coord(0, 0) });
    expect(m.target.shots).toHaveLength(1);
    expect(m.player.shots).toHaveLength(0);
    m = apply(m, { type: 'fire', by: 'ai', coord: coord(5, 0) });
    expect(m.player.shots).toHaveLength(1);
    expect(m.log.map((t) => [t.by, t.shot.result.kind])).toEqual([
      ['player', 'hit'],
      ['ai', 'hit'],
    ]);
  });

  it('alternates turns on hit and on miss', () => {
    let m = started();
    expect(m.turn).toBe('player');
    m = apply(m, { type: 'fire', by: 'player', coord: coord(0, 0) }); // hit
    expect(m.turn).toBe('ai');
    m = apply(m, { type: 'fire', by: 'ai', coord: coord(9, 9) }); // miss
    expect(m.turn).toBe('player');
  });

  it('rejects firing out of turn', () => {
    expect(applyMatchAction(started(), { type: 'fire', by: 'ai', coord: coord(0, 0) })).toEqual({
      ok: false,
      error: { kind: 'not-your-turn', turn: 'player' },
    });
  });

  it('rejects a repeat shot without passing the turn', () => {
    const m = apply(
      started(),
      { type: 'fire', by: 'player', coord: coord(9, 9) },
      { type: 'fire', by: 'ai', coord: coord(9, 9) },
    );
    expect(applyMatchAction(m, { type: 'fire', by: 'player', coord: coord(9, 9) })).toEqual({
      ok: false,
      error: { kind: 'fire', reason: 'already-shot' },
    });
  });

  it('honours firstTurn', () => {
    const m = createVersusMatch({ opponentShips: stacked(), firstTurn: 'ai' });
    expect(m.turn).toBe('ai');
  });

  // Opponent ships fill rows 0–4 of their board; the player's fill rows 5–9 of theirs.
  // So rows 5–9 of the target and rows 0–4 of the player board are open water.
  const waterOnTarget = allCoords(10).filter((c) => c.row >= 5);
  const waterOnPlayer = allCoords(10).filter((c) => c.row < 5);

  /** The winner fires at `targets` in order; the other side only ever misses. */
  const playOut = (m: MatchState, winner: Side): MatchState => {
    const targets = (winner === 'player' ? stacked() : stacked(5)).flatMap(shipCells);
    const water = winner === 'player' ? waterOnPlayer : waterOnTarget;
    let i = 0;
    while (m.phase === 'battle') {
      const side = m.turn;
      const next = side === winner ? targets.shift() : water[i++];
      if (!next) throw new Error('ran out of cells');
      m = apply(m, { type: 'fire', by: side, coord: next });
    }
    return m;
  };

  it('ends with the player winning when the opponent fleet sinks', () => {
    const m = playOut(started(), 'player');
    expect(m.phase).toBe('over');
    expect(m.winner).toBe('player');
    expect(m.log.at(-1)?.shot.result.kind).toBe('sunk');
  });

  it('ends with the AI winning when the player fleet sinks', () => {
    const m = playOut(started(), 'ai');
    expect(m.phase).toBe('over');
    expect(m.winner).toBe('ai');
  });

  it('rejects every action once the match is over', () => {
    const m = playOut(started(), 'player');
    expect(applyMatchAction(m, { type: 'fire', by: 'ai', coord: coord(9, 9) })).toEqual({
      ok: false,
      error: { kind: 'wrong-phase', phase: 'over' },
    });
    expect(applyMatchAction(m, { type: 'autoPlace', seed: 1 }).ok).toBe(false);
  });
});

describe('views', () => {
  it('each side sees the board it fires at, without hidden ships', () => {
    const m = apply(started(), { type: 'fire', by: 'player', coord: coord(0, 0) });
    expect(viewFor(m, 'player').cells[0]?.[0]).toBe('hit');
    expect(
      viewFor(m, 'ai')
        .cells.flat()
        .every((c) => c === 'unknown'),
    ).toBe(true);
    expect(boardFiredAtBy(m, 'ai')).toBe(m.player);
    expect(boardFiredAtBy(m, 'player')).toBe(m.target);
  });
});

describe('co-op', () => {
  it('starts in battle with the incident as the shared target', () => {
    const incident = randomPlacement(INCIDENT_FLEET, createRng(1));
    const m = createCoopMatch({ incidentShips: incident });
    expect(m.phase).toBe('battle');
    expect(m.mode).toBe('coop');
    expect(boardFiredAtBy(m, 'player')).toBe(boardFiredAtBy(m, 'ai'));
  });

  it('both sides fire at the same board, and share one view', () => {
    const incident = randomPlacement(INCIDENT_FLEET, createRng(1));
    let m = createCoopMatch({ incidentShips: incident });
    m = apply(m, { type: 'fire', by: 'player', coord: coord(0, 0) });
    m = apply(m, { type: 'fire', by: 'ai', coord: coord(0, 1) });
    expect(m.target.shots).toHaveLength(2);
    expect(m.player.shots).toHaveLength(0);
    expect(viewFor(m, 'ai')).toEqual(viewFor(m, 'player'));
  });

  it('a cell either side has shot cannot be shot again', () => {
    const m = apply(
      createCoopMatch({ incidentShips: randomPlacement(INCIDENT_FLEET, createRng(2)) }),
      {
        type: 'fire',
        by: 'player',
        coord: coord(3, 3),
      },
    );
    expect(applyMatchAction(m, { type: 'fire', by: 'ai', coord: coord(3, 3) }).ok).toBe(false);
  });

  it('ends with a team win', () => {
    const incident: ShipPlacement[] = [
      { id: 'off-by-one', origin: coord(0, 0), orientation: 'h', length: 2 },
    ];
    const m = apply(
      createCoopMatch({ incidentShips: incident }),
      { type: 'fire', by: 'player', coord: coord(0, 0) },
      { type: 'fire', by: 'ai', coord: coord(0, 1) },
    );
    expect(m.phase).toBe('over');
    expect(m.winner).toBe('team');
  });
});

describe('matchReducer', () => {
  it('returns the same object for an invalid action', () => {
    const m = started();
    expect(matchReducer(m, { type: 'fire', by: 'ai', coord: coord(0, 0) })).toBe(m);
  });

  it('applies valid actions', () => {
    const m = started();
    expect(matchReducer(m, { type: 'fire', by: 'player', coord: coord(0, 0) }).turn).toBe('ai');
  });
});

describe('full games (property)', () => {
  it('random play always terminates with a winner within 200 shots', () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(seed);
      let m = apply(
        createVersusMatch({ opponentShips: randomPlacement(STANDARD_FLEET, rng) }),
        { type: 'autoPlace', seed },
        { type: 'start' },
      );
      let shots = 0;
      while (m.phase === 'battle') {
        const side: Side = m.turn;
        const view = viewFor(m, side);
        const unknown = allCoords(10).filter((c) => view.cells[c.row]?.[c.col] === 'unknown');
        m = apply(m, { type: 'fire', by: side, coord: pick(rng, unknown) });
        shots++;
      }
      expect(m.winner === 'player' || m.winner === 'ai').toBe(true);
      expect(shots).toBeLessThanOrEqual(200);
      const loser = m.winner === 'player' ? m.target : m.player;
      expect(loser.shots.filter((s) => s.result.kind !== 'miss')).toHaveLength(17);
    }
  });
});

describe('replay (resuming a saved match)', () => {
  const fresh = () => createVersusMatch({ opponentShips: stacked() });
  const playShots = (m: MatchState, count: number): MatchState => {
    const rng = createRng(7);
    for (let i = 0; i < count && m.phase === 'battle'; i++) {
      const view = viewFor(m, m.turn);
      const unknown = allCoords(10).filter((c) => view.cells[c.row]?.[c.col] === 'unknown');
      m = apply(m, { type: 'fire', by: m.turn, coord: pick(rng, unknown) });
    }
    return m;
  };

  it.each([
    ['mid-placement', () => apply(fresh(), { type: 'place', placement: row('promotion', 2, 4) })],
    ['just started', () => started()],
    ['mid-battle', () => playShots(started(), 15)],
    ['finished', () => playShots(started(), 200)],
    [
      'co-op',
      () =>
        playShots(
          createCoopMatch({ incidentShips: randomPlacement(INCIDENT_FLEET, createRng(3)) }),
          9,
        ),
    ],
  ])('rebuilds a match %s', (_, make) => {
    const state = make();
    const initial =
      state.mode === 'coop' ? createCoopMatch({ incidentShips: state.target.ships }) : fresh();
    expect(replayMatch(initial, matchActions(state))).toEqual(state);
  });

  it('rejects actions the engine would not accept', () => {
    const tampered: MatchAction[] = [
      { type: 'place', placement: { ...row('promotion', 0, 4), length: 1 } },
    ];
    expect(replayMatch(fresh(), tampered)).toBeUndefined();
    expect(
      replayMatch(fresh(), [{ type: 'fire', by: 'player', coord: coord(0, 0) }]),
    ).toBeUndefined();
    const oneShot = matchActions(playShots(started(), 1));
    const shot = oneShot[oneShot.length - 1];
    if (!shot) throw new Error('no shot');
    expect(replayMatch(fresh(), [...oneShot, shot])).toBeUndefined();
  });
});
