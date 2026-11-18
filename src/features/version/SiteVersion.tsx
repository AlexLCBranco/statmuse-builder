import { BUILD_INFO } from '../../lib/buildInfo'
import { TapTip } from '../tip/TapTip'
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
 * its tooltip, which a tap also shows (phones have no hover).
 */
export function SiteVersion() {
  const { version, commit, builtAt } = BUILD_INFO
  const time = Date.parse(builtAt)
  const when = Number.isNaN(time) ? '' : `, built ${WHEN.format(time)}`
  const tip = `Version ${version} · commit ${commit}${when}`
  return (
    <div className={styles.corner}>
      <TapTip text={tip} placement="above">
        {(toggle, tipId) => (
          <button type="button" className={styles.version} data-testid="site-version" title={tip} aria-describedby={tipId} onClick={toggle}>
            v{version}
          </button>
        )}
      </TapTip>
    </div>
  )
}
