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
  return (process.env.APP_URL ?? 'https://souplessefitness.com').trim()
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

/**
 * Sends one email with up to `maxAttempts` retries on transient failures.
 * Retries on thrown exceptions AND on Resend API-level errors (e.g. 429, 5xx).
 * Uses exponential backoff: 500ms, 1000ms, 2000ms between attempts.
 *
 * Non-retryable errors (4xx validation, missing key) are surfaced immediately.
 */
async function sendWithRetry(
  params: Parameters<Resend['emails']['send']>[0],
  maxAttempts = 3,
): Promise<void> {
  const resend = getResend()
  let lastErr: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await resend.emails.send(params)

      // Resend returns errors in the response body (not as throws) for API-level issues
      if (error) {
        // Non-retryable: validation errors (missing field, bad address, etc.)
        const isValidationError = typeof error === 'object' && 'statusCode' in error
          && (error as { statusCode: number }).statusCode < 500
          && (error as { statusCode: number }).statusCode !== 429

        if (isValidationError) {
          logger.error({ to: params.to, error }, 'Resend: non-retryable error sending email')
          return
        }

        lastErr = error
        logger.warn({ to: params.to, error, attempt }, `Resend: transient error on attempt ${attempt}/${maxAttempts}`)
      } else {
        logger.info({ to: params.to, emailId: data?.id, attempt }, 'Email sent via Resend')
        return
      }
    } catch (err) {
      lastErr = err
      logger.warn({ to: params.to, err, attempt }, `Resend: exception on attempt ${attempt}/${maxAttempts}`)
    }

    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)))
    }
  }

  logger.error({ to: params.to, err: lastErr }, `Resend: all ${maxAttempts} attempts failed`)
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
    logger.info({ to, verifyUrl }, '[DEV] Email verification link')
  }

  const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
  if (!apiKey) {
    logger.warn({ to }, 'RESEND_API_KEY not set — skipping email send')
    return
  }

  await sendWithRetry({
    from: getFrom(),
    to,
    subject: 'Vérifiez votre adresse email — Souplesse Fitness',
    html: verificationHtml(verifyUrl),
    text: `Vérifiez votre email en cliquant sur ce lien : ${verifyUrl}`,
  })
}
/**
 * Send a subscription expiry reminder email (3 days before expiry).
 * Silently skipped when RESEND_API_KEY is not configured.
 */
export async function sendSubscriptionReminderEmail(
  to: string,
  firstName: string,
  planName: string,
  expiryDate: string,
): Promise<void> {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
  if (!apiKey) {
    logger.warn({ to }, 'RESEND_API_KEY not set — skipping reminder email')
    return
  }

  const renewUrl = `${getAppUrl()}/subscribe`
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Abonnement bientôt expiré</title></head>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#000000;padding:28px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Souplesse<span style="color:#EAB308;">·</span>Fitness</span>
        </td></tr>
        <tr><td style="padding:40px;color:#1a1a1a;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Votre abonnement expire bientôt</h2>
          <p style="margin:0 0 16px;color:#555;line-height:1.6;">Bonjour ${firstName},</p>
          <p style="margin:0 0 24px;color:#555;line-height:1.6;">
            Votre <strong>${planName}</strong> expire le <strong>${expiryDate}</strong>.
            Renouvelez dès maintenant pour continuer à profiter des séances du club.
          </p>
          <p style="text-align:center;margin:0 0 32px;">
            <a href="${renewUrl}" style="display:inline-block;background:#EAB308;color:#000000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
              Renouveler mon abonnement
            </a>
          </p>
          <p style="margin:0;color:#888;font-size:13px;">Si vous avez déjà renouvelé, ignorez cet email.</p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
          <span style="color:#aaa;font-size:12px;">© ${new Date().getFullYear()} Souplesse Fitness — Cotonou, Bénin</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await sendWithRetry({
    from: getFrom(),
    to,
    subject: `Votre ${planName} expire le ${expiryDate} — Souplesse Fitness`,
    html,
    text: `Bonjour ${firstName}, votre ${planName} expire le ${expiryDate}. Renouvelez sur ${renewUrl}`,
  })
}

/**
 * J005: Notify admin(s) by email when a subscription is paused.
 * Silently skipped when RESEND_API_KEY is not configured.
 */
export async function sendAdminPauseNotification(opts: {
  adminEmails: string[]
  userLabel: string
  planName: string
  pauseCount: number
  maxPauses: number
}): Promise<void> {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
  if (!apiKey || !opts.adminEmails.length) {
    logger.warn('RESEND_API_KEY not set or no admins — skipping pause notification email')
    return
  }

  const dashboardUrl = `${getAppUrl()}/admin/users`
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Abonnement mis en pause</title></head>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#000000;padding:28px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Souplesse<span style="color:#EAB308;">·</span>Fitness</span>
        </td></tr>
        <tr><td style="padding:40px;color:#1a1a1a;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Abonnement mis en pause</h2>
          <p style="margin:0 0 16px;color:#555;line-height:1.6;">
            <strong>${opts.userLabel}</strong> a mis en pause son abonnement <strong>${opts.planName}</strong>.
          </p>
          <p style="margin:0 0 24px;color:#555;line-height:1.6;">
            Pauses utilisées : <strong>${opts.pauseCount} / ${opts.maxPauses}</strong>
          </p>
          <p style="text-align:center;margin:0 0 32px;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#EAB308;color:#000000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
              Voir les utilisateurs
            </a>
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
          <span style="color:#aaa;font-size:12px;">© ${new Date().getFullYear()} Souplesse Fitness — Cotonou, Bénin</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await Promise.all(opts.adminEmails.map(adminEmail =>
    sendWithRetry({
      from: getFrom(),
      to: adminEmail,
      subject: `Pause abonnement — ${opts.userLabel} — ${opts.planName}`,
      html,
      text: `${opts.userLabel} a mis en pause son abonnement ${opts.planName}. Pauses : ${opts.pauseCount}/${opts.maxPauses}. Voir : ${dashboardUrl}`,
    })
  ))
}