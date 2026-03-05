/**
 * Transactional email helper — powered by Resend.
 * All emails are sent as HTML with a plain-text fallback.
 */
import { Resend } from 'resend'
import logger from './logger'

function getResend(): Resend {
  return new Resend((process.env.RESEND_API_KEY ?? '').trim())
}

function getFrom(): string {
  return (process.env.RESEND_FROM ?? 'Souplesse Fitness <noreply@souplessefitness.com>').trim()
}

function getAppUrl(): string {
  return (process.env.APP_URL ?? 'https://souplesse-speckit.vercel.app').trim()
}

// ─── Email templates ──────────────────────────────────────────────────────────

function verificationHtml(verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vérifiez votre adresse email</title></head>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#000000;padding:28px 40px;text-align:center;">
            <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
              Souplesse<span style="color:#EAB308;">·</span>Fitness
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;color:#1a1a1a;">
            <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Confirmez votre email</h2>
            <p style="margin:0 0 24px;color:#555;line-height:1.6;">
              Bienvenue ! Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.
            </p>
            <p style="text-align:center;margin:0 0 32px;">
              <a href="${verifyUrl}" style="display:inline-block;background:#EAB308;color:#000000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
                Vérifier mon email
              </a>
            </p>
            <p style="margin:0;color:#888;font-size:13px;line-height:1.5;">
              Ce lien expire dans <strong>24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet email.<br><br>
              Lien alternatif :<br>
              <a href="${verifyUrl}" style="color:#EAB308;word-break:break-all;">${verifyUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
            <span style="color:#aaa;font-size:12px;">© ${new Date().getFullYear()} Souplesse Fitness — Cotonou, Bénin</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send an email-verification link to a newly registered user.
 * Non-blocking: errors are caught and logged; registration is never blocked.
 *
 * ⚠️  Resend restriction: without a verified custom domain, emails can only be
 * delivered to the Resend account owner's email address. In dev, the verification
 * URL is always printed to the server console as a fallback.
 */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${getAppUrl()}/verify-email?token=${token}`

  // Always log the link in dev so you can verify accounts without email delivery
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEV] Email verification link for ${to}:\n  ${verifyUrl}\n`)
  }

  const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
  if (!apiKey) {
    logger.warn({ to }, 'RESEND_API_KEY not set — skipping email send')
    return
  }

  const resend = getResend()

  try {
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to,
      subject: 'Vérifiez votre adresse email — Souplesse Fitness',
      html: verificationHtml(verifyUrl),
      text: `Vérifiez votre email en cliquant sur ce lien : ${verifyUrl}`,
    })

    if (error) {
      logger.error({ to, error }, 'Resend: failed to send verification email')
      console.error(`[Resend error] ${error.name}: ${error.message}`)
    } else {
      logger.info({ to, emailId: data?.id }, 'Verification email sent via Resend')
    }
  } catch (err) {
    logger.error({ to, err }, 'Resend: unexpected error sending verification email')
    console.error('[Resend unexpected error]', err)
  }
}
