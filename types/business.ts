export type Currency = 'XOF';

export interface OpeningPeriod {
  open: string; // HH:MM
  close: string; // HH:MM
}

export interface OpeningHours {
  mondayToFriday: OpeningPeriod;
  saturday: OpeningPeriod;
  sundayAndHolidays: OpeningPeriod;
}

export interface SubscriptionPlan {
  name: string;
  priceSingle: number; // stored in XOF (smallest unit)
  priceCouple: number | null;
  validityDays: number;
  maxReports: number;
  isActive: boolean;
}

export interface ContactInfo {
  address: string;
  phone: string;
  email: string;
}

export interface Branding {
  primaryColors: string[];
  theme: string;
  style: string;
}

export interface BusinessRules {
  calculateValidityFromActivationDate: boolean;
  maxReportsEnforced: boolean;
  priceCoupleNullable: boolean;
  bookingOutsideOpeningHoursRejected: boolean;
}

export interface BusinessConfig {
  gymIdentity: {
    name: string;
    slogan: string;
    currency: Currency;
  };
  openingHours: OpeningHours;
  subscriptionPlans: SubscriptionPlan[];
  dressCode: string[];
  location: ContactInfo;
  branding: Branding;
  rules: BusinessRules;
  adminEditable: Record<string, boolean>;
}
