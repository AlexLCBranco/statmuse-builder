import { BUILD_INFO } from '../../lib/buildInfo'
import styles from './SiteVersion.module.css'

const WHEN = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * The site's version in the bottom-right corner ("v0.8.0"), so the live site
 * can be checked against the latest push. The commit and build time are in
 * its tooltip.
 */
export function SiteVersion() {
  const { version, commit, builtAt } = BUILD_INFO
  const time = Date.parse(builtAt)
  const when = Number.isNaN(time) ? '' : `, built ${WHEN.format(time)}`
  return (
    <div className={styles.version} data-testid="site-version" title={`Version ${version} · commit ${commit}${when}`}>
      v{version}
    </div>
  )
}
