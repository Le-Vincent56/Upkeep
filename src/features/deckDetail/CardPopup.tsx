import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { StatusMark } from '../../ui/StatusMark';
import { CardImage } from './CardImage';
import styles from './CardPopup.module.css';
import type { DeckRow } from './deckRows';
import type { PopupLine } from './describe';
import { placePopup, type Box } from './popupPlacement';
import type { ShownPopup } from './useCardPopup';

interface CardPopupProps {
  readonly shown: ShownPopup;
  readonly row: DeckRow;
  readonly lines: readonly PopupLine[];
  readonly placeTick: number;
}

function columnBounds(anchor: HTMLElement): Box {
  const column = anchor.closest('[data-screen-column]');
  return (
    column?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    }
  );
}

export function CardPopup({ shown, row, lines, placeTick }: CardPopupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const popup = ref.current;
    if (popup === null) return;

    // offsetWidth and offsetHeight ignore the appear transform, so this is the settled size.
    const place = placePopup(shown.anchor.getBoundingClientRect(), columnBounds(shown.anchor), {
      width: popup.offsetWidth,
      height: popup.offsetHeight,
    });

    // Written to the element, not rendered, so React never resets it; keep left and top out of the style prop.
    popup.dataset.placed = String(place !== null);
    if (place === null) return;

    popup.style.left = `${place.left}px`;
    popup.style.top = `${place.top}px`;
    popup.dataset.side = place.side;
  }, [shown, placeTick]);

  return (
    <div
      ref={ref}
      className={styles.popup}
      data-motion={shown.motion}
      data-placed="false"
      style={{ '--popup-turn': `${shown.turn}deg` } as CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.card}>
        <CardImage row={row} />
      </div>
      {lines.length > 0 && (
        <ul className={styles.caption}>
          {lines.map((line, index) => (
            <li key={index}>
              {line.status !== null && (
                <span className={styles.mark}>
                  <StatusMark status={line.status} />
                </span>
              )}
              {line.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
