const _fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))(async () => {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      console.error('GITHUB_TOKEN not set')
      process.exit(1)
    }
    const owner = 'sonron1',
      repo = 'souplesse-spec-kit',
      head = 'sonron1:feat/kkiapay-integration'
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?head=${head}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' },
    })
    const body = await res.json()
    if (!Array.isArray(body) || body.length === 0) {
      console.error('No PR found for branch')
      process.exit(2)
    }
    console.log(body[0].number)
  })()
