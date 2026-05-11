# MFA_FLOW.md — TOTP + Backup Codes

## Provider
Native Supabase Auth MFA (`supabase.auth.mfa.*`). The TOTP secret is generated and stored by Supabase — never persisted in our schema. We only store **hashed backup codes** in `public.mfa_backup_codes`.

## Enrollment
```
1. User clicks "Begin enrollment"
   └─► securityApi.mfaEnrollStart()
       └─► supabase.auth.mfa.enroll({ factorType: "totp" })
           returns { factorId, qr (svg data url), secret, uri }

2. UI renders QR + manual key
3. User scans with Authenticator app, enters 6-digit code
   └─► securityApi.mfaEnrollVerify(factorId, code)
       └─► mfa.challenge({ factorId }) → mfa.verify({ factorId, challengeId, code })
       └─► audit_log: mfa.enrolled (severity=high)

4. Auto-generate 10 backup codes
   └─► generateBackupCodes() → SHA-256 each → INSERT mfa_backup_codes
   └─► audit_log: mfa.backup_codes_generated (severity=medium)
   └─► UI shows codes ONCE (must copy or save)
```

## Verification on Sign-In
Supabase Auth handles AAL (Authenticator Assurance Level) automatically. If the user has a verified TOTP factor, they must complete a challenge to elevate from `aal1 → aal2`.

## Backup Code Use
```
1. User submits code XXXX-XXXX
2. sha256(input.toUpperCase().replace("-",""))
3. SELECT id FROM mfa_backup_codes WHERE code_hash=$1 AND used_at IS NULL
4. If found → UPDATE used_at = now()
5. audit_log: mfa.backup_code_used (severity=high)
```

## Disable
```
1. For each factor (verified + unverified): mfa.unenroll(factorId)
2. DELETE FROM mfa_backup_codes WHERE user_id = auth.uid()
3. audit_log: mfa.disabled (severity=high)
```

## Storage
| Field | Storage |
|-------|---------|
| TOTP secret | Supabase Auth (encrypted at rest by platform) |
| Backup codes (plaintext) | Shown once in UI, never stored |
| Backup codes (hashes) | `public.mfa_backup_codes.code_hash` (SHA-256) |
| Recovery code usage | `used_at timestamptz` |

## UI States
- **Disabled** → status badge "DISABLED", warning microcopy, "Begin enrollment" CTA
- **Enrolling** → QR + manual key + 6-digit input
- **Enrolled** → success badge, factor list, regen / disable controls
- **Codes Generated** → one-time reveal panel with copy-all
