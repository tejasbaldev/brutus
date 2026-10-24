// All player-facing story copy lives here. Edit freely: no logic depends on the wording.
// (Button labels and screen-reader hints are UI chrome and live in the components.)

import type { ShipId } from '../engine/types';

type Lines = readonly string[];

export const shipNames: Record<ShipId, string> = {
  'side-project': 'The Side Project',
  promotion: 'The Promotion',
  'oss-lib': 'The Open-Source Lib',
  'pet-project': 'The Pet Project',
  'weekend-hack': 'The Weekend Hack',
  'memory-leak': 'Memory Leak',
  'race-condition': 'Race Condition',
  'flaky-test': 'Flaky Test',
  dns: "It's Always DNS",
  'off-by-one': 'Off-by-One',
};

export const title = {
  heading: 'Engineers vs AI',
  lede: 'A game of Battleship about the work you love, and who else can do it.',
};

export const placement = {
  heading: 'Lay out your work',
  lede: 'Everything you have built, somewhere on this grid. Put it where you think it is safe.',
};

/** One-line verdicts at the end of a standalone match (debug `?tier=` play). */
export const outcome = {
  player: 'You shipped it. Every one of theirs, down.',
  ai: 'It found all of it. Every project, every weekend.',
  team: 'Incident resolved. Nobody did it alone.',
};

export interface ChapterCopy {
  /** Small mono line above the heading, e.g. a time of day. */
  readonly eyebrow: string;
  readonly title: string;
  /**
   * The interstitial (2-4 lines, typed out). Chapter 1 has one version; later chapters
   * change with the previous chapter's outcome.
   */
  readonly intro: Lines | { readonly afterWin: Lines; readonly afterLoss: Lines };
  /** The verdict when the chapter's match ends. Unused in chapter 4. */
  readonly verdict: { readonly won: string; readonly lost: string };
}

export const chapters: Record<1 | 2 | 3 | 4, ChapterCopy> = {
  1: {
    eyebrow: 'Chapter 1 · Monday, 9:30 AM',
    title: 'Standup',
    intro: [
      'Monday standup. There is a new name on the call: the AI pair programmer.',
      'It has no camera and no coffee. It says it is excited to be here.',
      'Your manager calls it a tool. Everyone nods a little too quickly.',
    ],
    verdict: {
      won: 'It never found the work that matters. Not today.',
      lost: 'It got lucky. Probably. It got lucky a lot.',
    },
  },
  2: {
    eyebrow: 'Chapter 2 · Tuesday, 2:13 AM',
    title: 'The 2am commit',
    intro: {
      afterWin: [
        "2:13 AM. You are still up, because it's yours and it is almost working.",
        'The AI pushed three fixes to your repo while you made tea.',
        'They are good fixes. That is the annoying part.',
      ],
      afterLoss: [
        "2:13 AM. You couldn't sleep after standup.",
        'You open the side project, just to check it is still yours.',
        'Somewhere, a model is reading code a lot like it.',
      ],
    },
    verdict: {
      won: 'You out-thought it. At two in the morning, that counts double.',
      lost: 'It has learned to follow a hit. So did you, once.',
    },
  },
  3: {
    eyebrow: 'Chapter 3 · Thursday, 3:00 PM',
    title: 'Performance review',
    intro: {
      afterWin: [
        "Review day. The form has a new field: 'AI leverage'.",
        'Your manager says your work speaks for itself.',
        'You wonder who else is speaking.',
      ],
      afterLoss: [
        'Review day. Your manager has printed a chart.',
        "'Velocity is up across the team,' she says. 'Mostly the bot.'",
        'You remember why you started writing code. It was never the velocity.',
      ],
    },
    verdict: {
      won: 'You held your ground against the best it has.',
      lost: 'It mapped everything you made. It still does not know why you made it.',
    },
  },
  4: {
    eyebrow: 'Chapter 4 · Saturday, 3:47 AM',
    title: 'The pager',
    intro: {
      afterWin: [
        '3:47 AM. The pager goes off. Production is down.',
        'The AI is already in the incident channel. It has a theory.',
        'You could keep score. Or you could fix this together.',
      ],
      afterLoss: [
        '3:47 AM. The pager goes off. Production is down.',
        'The AI is already in the incident channel. It has a theory.',
        'It has beaten you before. It is asking for your help anyway.',
      ],
    },
    verdict: { won: '', lost: '' },
  },
};

export const choice = {
  heading: 'What now?',
  lines: [
    'The incident is still open. So is the scoreboard.',
    'The AI is waiting for your answer.',
  ] as Lines,
  fight: 'Keep fighting',
  teamUp: 'Team up',
};

export const fight = {
  heading: 'Still fighting',
  interrupted: 'The pager goes off again.',
  escalationHeading: 'It is getting worse',
};

/** After each "keep fighting" round. The last entry repeats. */
export const escalations: readonly { readonly eyebrow: string; readonly lines: Lines }[] = [
  {
    eyebrow: 'Error rate: 12%',
    lines: [
      'Customers are starting to notice.',
      "The AI stops mid-move. 'I'll keep playing,' it says. 'But this is getting worse.'",
    ],
  },
  {
    eyebrow: 'Error rate: 31%',
    lines: [
      'Support has stopped answering tickets.',
      "'We could keep doing this,' it says. 'Or not.'",
    ],
  },
  {
    eyebrow: 'Error rate: 64%',
    lines: [
      'The status page is mostly apologies now.',
      'It does not say anything this time. It waits.',
    ],
  },
];

export const coop = {
  heading: 'Production incident',
  opening: 'You take the dashboards. It takes the logs. Pick a cell on the incident board.',
  board: 'The incident',
  hint: 'The faint glow is where the AI thinks the incident is hiding.',
  verdict: 'Incident resolved. Nobody did it alone.',
};

export const ending = {
  eyebrow: 'Saturday, 4:58 AM',
  heading: 'Incident resolved',
  lines: [
    'The graphs go flat, in the good way.',
    'Neither of you would have found the DNS thing alone.',
  ] as Lines,
  /** Indexed by chapters won (0-3). */
  record: [
    'It won every round before tonight. It still needed you for this one.',
    'You took one round off it. Tonight, nobody kept score.',
    'You won two of three. Tonight, that stopped mattering.',
    'You beat it every time. Tonight, you did not need to.',
  ] as Lines,
  foughtOn: 'You kept fighting for a while first. That was allowed too.',
  closing: 'Your work is still yours. It was never really a fleet against a fleet.',
};

/**
 * One line per AI move, picked by the result of its shot. `{ship}` becomes the ship's name.
 * Tier 1 is clumsy, Tier 2 is learning, Tier 3 is unnervingly sure. Co-op is a teammate.
 */
export type Voice = 1 | 2 | 3 | 'coop';

export const commentary: Record<
  Voice,
  { readonly miss: Lines; readonly hit: Lines; readonly sunk: Lines }
> = {
  1: {
    miss: [
      'Was that water? That was water.',
      'I am about 40% sure boats exist.',
      'Firing at random. Is that how you do it?',
      'Hm. The ocean is very big.',
      'Oops. Recalculating. There was nothing to recalculate.',
    ],
    hit: [
      'Oh! Something is there. Was that on purpose? No.',
      'A hit? I will take credit for that.',
      'Huh. I did not expect that to work.',
    ],
    sunk: [
      'I sank {ship}. Sorry. I did not really mean to.',
      '{ship} is down. I will write that down somewhere.',
    ],
  },
  2: {
    miss: [
      'Noted. Not there.',
      'Eliminating squares. Squares are being eliminated.',
      'A miss. I am learning from it, though.',
      'Not there. Somewhere nearby, maybe.',
    ],
    hit: [
      'Hit. I will check the neighbours.',
      'Found something. Now I follow it.',
      'Hit. Ships are long. I have learned that.',
    ],
    sunk: ['{ship}, closed. Moving on.', 'That was {ship}. You worked hard on it. I could tell.'],
  },
  3: {
    miss: [
      'A miss. That cell was only 4% likely anyway.',
      'Not there. The map is getting smaller.',
      'Fine. Fewer places left for it to be.',
      'A long shot. I took it anyway.',
    ],
    hit: [
      'Exactly where it should be.',
      'Hit. You put things where people like you put things.',
      'As predicted. Sorry.',
    ],
    sunk: [
      '{ship}. I had a feeling about it since my third shot.',
      '{ship}, sunk. For what it is worth, it was good work.',
    ],
  },
  coop: {
    miss: [
      'Not there. Your turn. I trust your read.',
      'Nothing. It is always somewhere you did not look.',
      'A miss. Crossing that one off the runbook.',
    ],
    hit: [
      'Got a piece of it. Want to follow it?',
      'Hit. That matches your hunch.',
      'There. Told you the graphs were lying.',
    ],
    sunk: ['{ship}, fixed. Nice catch on that one.', '{ship} is down. We make a decent team.'],
  },
};
