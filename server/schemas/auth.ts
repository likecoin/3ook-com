import * as v from 'valibot'

export const LoginBodySchema = v.object({
  walletAddress: v.pipe(
    v.string('MISSING_ADDRESS'),
    v.nonEmpty('MISSING_ADDRESS'),
    v.regex(/^0x[a-fA-F0-9]{40}$/, 'INVALID_ADDRESS'),
  ),
  message: v.pipe(
    v.string('MISSING_MESSAGE'),
    v.nonEmpty('MISSING_MESSAGE'),
  ),
  signature: v.pipe(
    v.string('MISSING_SIGNATURE'),
    v.nonEmpty('MISSING_SIGNATURE'),
  ),
  email: v.optional(v.string()),
  loginMethod: v.optional(v.string()),
})

export const RegisterBodySchema = v.object({
  walletAddress: v.pipe(
    v.string('REGISTER_MISSING_ADDRESS'),
    v.nonEmpty('REGISTER_MISSING_ADDRESS'),
    v.regex(/^0x[a-fA-F0-9]{40}$/, 'REGISTER_INVALID_ADDRESS'),
  ),
  message: v.pipe(
    v.string('REGISTER_MISSING_MESSAGE'),
    v.nonEmpty('REGISTER_MISSING_MESSAGE'),
  ),
  signature: v.pipe(
    v.string('REGISTER_MISSING_SIGNATURE'),
    v.nonEmpty('REGISTER_MISSING_SIGNATURE'),
  ),
  email: v.optional(v.string()),
  accountId: v.optional(v.string()),
  loginMethod: v.optional(v.string()),
  magicUserId: v.optional(v.string()),
  magicDIDToken: v.optional(v.string()),
  locale: v.optional(v.string()),
  utmSource: v.optional(v.string()),
  utmMedium: v.optional(v.string()),
  utmCampaign: v.optional(v.string()),
  utmContent: v.optional(v.string()),
  utmTerm: v.optional(v.string()),
  gadClickId: v.optional(v.string()),
  gadSource: v.optional(v.string()),
  fbClickId: v.optional(v.string()),
  fbp: v.optional(v.string()),
  fbc: v.optional(v.string()),
  gaClientId: v.optional(v.string()),
  gaSessionId: v.optional(v.union([v.string(), v.number()])),
  referrer: v.optional(v.string()),
})

export const AccountDeleteBodySchema = v.object({
  wallet: v.pipe(
    v.string('MISSING_WALLET'),
    v.nonEmpty('MISSING_WALLET'),
  ),
  signMethod: v.pipe(
    v.string('MISSING_SIGN_METHOD'),
    v.nonEmpty('MISSING_SIGN_METHOD'),
  ),
  authorizeSignature: v.pipe(
    v.string('MISSING_AUTHORIZE_SIGNATURE'),
    v.nonEmpty('MISSING_AUTHORIZE_SIGNATURE'),
  ),
  authorizeMessage: v.pipe(
    v.string('MISSING_AUTHORIZE_MESSAGE'),
    v.nonEmpty('MISSING_AUTHORIZE_MESSAGE'),
  ),
  deleteSignature: v.pipe(
    v.string('MISSING_DELETE_SIGNATURE'),
    v.nonEmpty('MISSING_DELETE_SIGNATURE'),
  ),
  deleteMessage: v.pipe(
    v.string('MISSING_DELETE_MESSAGE'),
    v.nonEmpty('MISSING_DELETE_MESSAGE'),
  ),
})
