const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
(async ()=>{
  const token = process.env.GITHUB_TOKEN
  if(!token) { console.error('GITHUB_TOKEN not set'); process.exit(1)}
  const owner = 'sonron1', repo='souplesse-spec-kit'
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
    body: JSON.stringify({ title: 'feat(payments): add Kkiapay integration (server, client, tests, migrations)', head: 'feat/kkiapay-integration', base: 'main', body: 'Implements Kkiapay integration: server endpoints, webhook handling, Prisma models and migrations, frontend checkout component, unit and integration tests, and CI workflow. Ready for review as a draft.', draft: true })
  })
  const data = await res.json()
  if (!res.ok) { console.error('Failed to create PR', data); process.exit(2) }
  console.log('PR_CREATED', data.number, data.html_url)
})()
