import { bioPlayer } from '../../domain/bio'
import { PLAYERS, PLAYERS_SEASON } from '../../domain/data/players'
import type { QueryState } from '../../domain/query'
import { rotationsSiteLink } from '../../domain/rotations'
import { siteLinks } from '../../domain/sites'
import { useBio } from '../bio/useBio'
import styles from './SiteLinks.module.css'

interface Props {
  query: QueryState
}

/**
 * "Other sites": the current player, team or league on other free stats
 * sites (SM-5), for what StatMuse does not do well (see `domain/sites.ts`).
 * Each button names the site and, in a few words, what opens; its hover
 * says more. Nothing shows until there is a player or team.
 *
 * First comes the owner's own rotations site (SM-7), its name in orange so
 * it stands out from the others.
 */
export function SiteLinks({ query }: Props) {
  const name = bioPlayer(query, PLAYERS)
  // The same record as the background line: his exact pages on each site.
  const bio = useBio(name)
  const rotations = rotationsSiteLink(query)
  const links = [...(rotations ? [rotations] : []), ...siteLinks(query, { name, bio }, PLAYERS_SEASON)]
  if (links.length === 0) return null

  return (
    <div className={styles.row} role="group" aria-label="Other sites" data-testid="sites">
      <span className={styles.label}>Other sites</span>
      {links.map((link) => (
        // Real links (new tab). One with nowhere to go has no href.
        <a
          key={link.site}
          className={styles.link}
          href={link.href ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={link.href === null}
          role={link.href === null ? 'link' : undefined}
          title={link.tip}
          data-testid={`site-${link.site}`}
        >
          <span className={link.site === 'rotations' ? `${styles.name} ${styles.highlight}` : styles.name}>{link.name}</span>
          <span className={styles.what}>{link.what}</span>
          <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  )
}
