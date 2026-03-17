import { z } from 'zod'
import { emailSchema, passwordSchema } from './index'

export const registerSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit comporter au moins 2 caractères').max(100).trim(),
  lastName: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').max(100).trim(),
  name: z.string().max(200).trim().optional(), // legacy / auto-computed if omitted
  email: emailSchema,
  phone: z
    .string()
    .min(8, 'Le numéro de téléphone doit comporter au moins 8 chiffres')
    .max(20)
    .regex(/^[+\d\s\-().]+$/, 'Numéro de téléphone invalide')
    .trim(),
  gender: z.enum(['MALE', 'FEMALE'], {
    required_error: 'Le sexe est requis',
    invalid_type_error: 'Valeur invalide pour le sexe',
  }),
  birthDay: z.number().int().min(1).max(31).optional().nullish(),
  birthMonth: z.number().int().min(1).max(12).optional().nullish(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'La confirmation du mot de passe est requise'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est requis'),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Le token de rafraîchissement est requis'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'La confirmation est requise'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'Le nouveau mot de passe doit être différent de l\'actuel',
  path: ['newPassword'],
})

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(100).trim().optional(),
  lastName: z.string().min(2).max(100).trim().optional(),
  phone: z
    .string()
    .min(8)
    .max(20)
    .regex(/^[+\d\s\-().]+$/)
    .trim()
    .optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  birthDay: z.number().int().min(1).max(31).optional().nullish(),
  birthMonth: z.number().int().min(1).max(12).optional().nullish(),
  avatarUrl: z.string().url().optional().nullish(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
