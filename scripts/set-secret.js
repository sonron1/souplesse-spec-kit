const sodium = require('libsodium-wrappers')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

async function encryptAndUpload(secretName, secretValue) {
  await sodium.ready
  const owner = 'sonron1'
  const repo = 'souplesse-spec-kit'
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN not set in env')

  const pubRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`,
    {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' },
    }
  )
  if (!pubRes.ok) throw new Error('Failed to get public key: ' + (await pubRes.text()))
  const pk = await pubRes.json()
  const key = pk.key
  const key_id = pk.key_id

  const publicKeyBytes = sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
  const messageBytes = Buffer.from(secretValue)

  const sealedBox = sodium.crypto_box_seal(messageBytes, publicKeyBytes)
  const encrypted = sodium.to_base64(sealedBox, sodium.base64_variants.ORIGINAL)

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({ encrypted_value: encrypted, key_id }),
    }
  )
  if (!putRes.ok)
    throw new Error('Failed to upload secret ' + secretName + ': ' + (await putRes.text()))
  return true
}

// Run with environment variables SECRET_NAME and SECRET_VALUE
const name = process.env.SECRET_NAME
const value = process.env.SECRET_VALUE
if (!name || !value) {
  console.error('Please set SECRET_NAME and SECRET_VALUE env vars')
  process.exit(1)
}

encryptAndUpload(name, value)
  .then(() => {
    console.log('OK', name)
  })
  .catch((e) => {
    console.error('ERROR', e.message)
    process.exit(2)
  })
