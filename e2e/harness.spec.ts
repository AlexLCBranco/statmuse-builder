import { test } from './test.js'

/**
 * The test harness itself (e2e/test.ts). Not about the app.
 */

test('a page whose stylesheet does not load fails its test, saying which file', async ({ page }) => {
  // Nothing below fails by itself: the page "works" without its styles.
  // The harness must fail this test, so it is marked as expected to fail.
  test.fail()
  await page.route(/\/assets\/.*\.css$/, (route) => route.abort())
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Player', exact: true }).fill('Jalen Brunson')
})
