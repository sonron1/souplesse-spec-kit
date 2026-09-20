/**
 * NUMÉROS PROVISOIRES — à remplacer par les vrais numéros marchands de la
 * salle dès qu'Ange les communique. C'est le SEUL fichier à modifier : aucun
 * écran ne doit contenir de numéro en dur (voir PaymentInstructionsScreen).
 */
export const MOBILE_MONEY_NUMBERS: Record<'MTN' | 'MOOV' | 'CELTIIS', string> = {
  MTN: '+229 00 00 00 01',
  MOOV: '+229 00 00 00 02',
  CELTIIS: '+229 00 00 00 03',
};

export const MOBILE_MONEY_OPERATOR_LABELS: Record<keyof typeof MOBILE_MONEY_NUMBERS, string> = {
  MTN: 'MTN Mobile Money',
  MOOV: 'Moov Money',
  CELTIIS: 'Celtiis Cash',
};
