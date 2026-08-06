import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * A preview build is a `noindex` mirror of the site. An unfinished research
 * radar surfacing in search results under a VTT / University of Helsinki
 * byline is a credibility risk, and it costs two attribute rewrites to
 * prevent.
 *
 * The trigger is the base path rather than an environment variable: what makes
 * a build a preview is where it is deployed, and that is already encoded in
 * `base`. Nothing to remember to set.
 *
 * The canonical link is removed rather than repointed. Left pointing at the
 * production URL it would tell a crawler that this page and the real home page
 * are the same document — true today, and false the moment the preview carries
 * drafts the live site does not.
 */
function previewNoindex(): Plugin {
  let isPreview = false
  return {
    name: 'preview-noindex',
    configResolved(config) {
      isPreview = config.base.includes('/preview/')
    },
    transformIndexHtml(html) {
      if (!isPreview) return html
      const needle = '<meta name="robots" content="index, follow" />'
      if (!html.includes(needle)) {
        // A silent no-op here would ship an indexable preview. If the markup
        // has drifted, failing the build is the only safe direction.
        throw new Error(
          `preview-noindex: expected ${needle} in index.html and did not find it. ` +
            'The preview build would have shipped indexable — failing instead.',
        )
      }
      return html
        .replace(needle, '<meta name="robots" content="noindex, nofollow" />')
        .replace(/\n\s*<link rel="canonical"[^>]*>/, '')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), previewNoindex()],
  base: '/FoSW/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
