import { useState, type KeyboardEvent } from 'react';
import { meetDevin as copy } from '../../story/chapters';
import { useFocusOnMount } from '../hooks/useFocusOnMount';
import styles from './Screen.module.css';
import tour from './MeetDevinScreen.module.css';

const steps = [...copy.cards.map((c) => c.name), copy.cta.name];

/** A click-through of Cognition's tools, ending in a call to action. */
export function MeetDevinScreen({ onRestart }: { readonly onRestart: () => void }) {
  const h1 = useFocusOnMount<HTMLHeadingElement>();
  const [step, setStep] = useState(0);
  const last = steps.length - 1;
  const card = copy.cards[step];
  const go = (n: number) => {
    setStep(Math.max(0, Math.min(last, n)));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(step + 1);
    if (e.key === 'ArrowLeft') go(step - 1);
  };

  return (
    <main className={`${styles.screen} ${styles.story}`} onKeyDown={onKeyDown}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 ref={h1} tabIndex={-1}>
          {copy.heading}
        </h1>
        <p className={styles.lede}>{copy.lede}</p>
      </header>

      <div className={tour.tour}>
        <nav aria-label="Products" className={tour.rail}>
          <ol>
            {steps.map((name, i) => (
              <li key={name}>
                <button
                  type="button"
                  className={tour.railItem}
                  aria-current={i === step ? 'step' : undefined}
                  onClick={() => {
                    go(i);
                  }}
                >
                  <span className={tour.index} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {name}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className={tour.card} aria-live="polite" aria-label={steps[step]}>
          <p className={styles.label}>{card ? card.kind : copy.cta.kind}</p>
          <h2 className={tour.name}>{card ? card.name : copy.cta.name}</h2>
          <p className={tour.body}>{card ? card.body : copy.cta.body}</p>
          {card ? (
            <p className={tour.forYou}>{card.forYou}</p>
          ) : (
            <div className={styles.actions}>
              <a className={styles.primary} href={copy.cta.url} target="_blank" rel="noreferrer">
                {copy.cta.button}
              </a>
              <a
                className={styles.secondary}
                href={copy.cta.docsUrl}
                target="_blank"
                rel="noreferrer"
              >
                {copy.cta.docs}
              </a>
            </div>
          )}
        </section>
      </div>

      <div className={tour.controls}>
        <button
          type="button"
          className={styles.secondary}
          disabled={step === 0}
          onClick={() => {
            go(step - 1);
          }}
        >
          Back
        </button>
        <span className={tour.count} aria-hidden="true">
          {step + 1} / {steps.length}
        </span>
        {step < last ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              go(step + 1);
            }}
          >
            Next
          </button>
        ) : (
          <button type="button" className={styles.secondary} onClick={onRestart}>
            Start over
          </button>
        )}
      </div>
    </main>
  );
}
