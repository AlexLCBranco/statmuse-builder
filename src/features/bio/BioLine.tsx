import { Fragment, useCallback, useRef, useState } from 'react'

import { bioDetails, bioParts } from '../../domain/bio'
import { useDismiss } from '../../lib/useDismiss'
import styles from './BioLine.module.css'
import { useBio } from './useBio'

interface Props {
  /** A roster player, spelled as the roster spells him. */
  name: string
}

/**
 * The player's background after the action buttons (SM-4): a short line
 * ("Draft 2023, pick 1 (SAS) · No US college · France") whose draft and
 * college parts are links, and the full details in a small box that opens
 * when the mouse is over the line or the "i" button is pressed (phones have
 * no hover). The slot keeps its place while the data loads, so nothing jumps.
 */
export function BioLine({ name }: Props) {
  const bio = useBio(name)
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const unpin = useCallback(() => setPinned(false), [])
  useDismiss(pinned, box, unpin)
  const open = hover || pinned

  return (
    <div
      ref={box}
      className={styles.slot}
      data-testid="bio"
      // Only a real mouse hovers; a finger's "hover" would fight the button.
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {bio && (
        <>
          <span className={styles.line} data-testid="bio-line">
            {bioParts(bio).map((part, i) => (
              <Fragment key={part.key}>
                {i > 0 && (
                  <span className={styles.dot} aria-hidden="true">
                    ·
                  </span>
                )}
                {part.href ? (
                  <a className={styles.link} href={part.href} target="_blank" rel="noopener noreferrer" title={part.linkLabel} data-testid={`bio-${part.key}`}>
                    {part.text} <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className={styles.text} data-testid={`bio-${part.key}`}>
                    {part.text}
                  </span>
                )}
              </Fragment>
            ))}
          </span>
          <button
            type="button"
            className={styles.more}
            aria-label={`More about where ${name} comes from`}
            title="Show the full details"
            aria-expanded={open}
            onClick={() => setPinned((wasPinned) => !wasPinned)}
          >
            <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 7.2v4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="8" cy="4.8" r="1" fill="currentColor" />
            </svg>
          </button>
          {open && (
            <div className={styles.details} role="group" aria-label={`About ${name}`} data-testid="bio-details">
              <div className={styles.name}>{name}</div>
              {bioDetails(bio).map((detail, i) => (
                <div key={i} className={styles.detail}>
                  <span className={styles.label}>{detail.label}</span>
                  <span>
                    {detail.text}{' '}
                    {detail.href && (
                      <a className={styles.detailLink} href={detail.href} target="_blank" rel="noopener noreferrer">
                        {detail.linkText} <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
