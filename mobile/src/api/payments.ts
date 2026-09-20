import { apiFetch, extractErrorMessage } from './client';

export type MobileOperator = 'MTN' | 'MOOV' | 'CELTIIS';
export type PaymentProofStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Matches souplesse-api's PaymentProof Prisma model (payments.service.ts).
export interface PaymentProof {
  id: string;
  userId: string;
  subscriptionId: string;
  amountDeclared: number;
  senderPhone: string;
  operator: MobileOperator;
  screenshotPath: string | null;
  status: PaymentProofStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface PendingProofPlan {
  id: string;
  name: string;
  priceSingle: number;
  priceCouple: number | null;
}

export interface PendingProofSubscription {
  id: string;
  subscriptionPlanId: string | null;
  partnerUserId: string | null;
  subscriptionPlan: PendingProofPlan | null;
}

export interface PendingProofUser {
  id: string;
  name: string;
  phone: string | null;
  email: string;
}

// GET /payments/pending includes user + subscription.subscriptionPlan
// (payments.service.ts getPending) — the moderator queue needs those to show
// who's paying and for which formula without a second round-trip.
export interface PendingPaymentProof extends PaymentProof {
  user: PendingProofUser;
  subscription: PendingProofSubscription;
}

export interface SubmitProofInput {
  subscriptionId: string;
  amountDeclared: number;
  senderPhone: string;
  operator: MobileOperator;
  imageUri: string;
  imageName: string;
  imageMimeType: string;
}

export async function submitProof(input: SubmitProofInput): Promise<PaymentProof> {
  const formData = new FormData();
  formData.append('subscriptionId', input.subscriptionId);
  formData.append('amountDeclared', String(input.amountDeclared));
  formData.append('senderPhone', input.senderPhone);
  formData.append('operator', input.operator);
  // React Native's FormData accepts a {uri, name, type} file descriptor at
  // runtime — lib.dom.d.ts only types append() for string | Blob, hence the cast.
  formData.append('screenshot', { uri: input.imageUri, name: input.imageName, type: input.imageMimeType } as unknown as Blob);

  const response = await apiFetch('/payments/proof', { method: 'POST', body: formData });
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}

export async function getPending(page = 1, limit = 20): Promise<{ items: PendingPaymentProof[]; total: number }> {
  const response = await apiFetch(`/payments/pending?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}

export async function approveProof(id: string): Promise<PaymentProof> {
  const response = await apiFetch(`/payments/${id}/validate`, { method: 'PATCH' });
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}

export async function rejectProof(id: string, reason: string): Promise<PaymentProof> {
  const response = await apiFetch(`/payments/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json();
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture de l'image impossible."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// RN's <Image> never sends a custom Authorization header for a remote uri,
// and this endpoint requires one (Modérateur/Admin only) — so the screenshot
// is fetched as a blob through the authenticated client and converted to a
// data: URI that <Image> can render directly.
export async function fetchScreenshotDataUri(id: string): Promise<string> {
  const response = await apiFetch(`/payments/${id}/screenshot`);
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  const blob = await response.blob();
  return blobToDataUri(blob);
}
