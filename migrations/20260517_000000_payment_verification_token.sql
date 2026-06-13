-- Add verification_token column to payments table for QR-based receipt verification
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verification_token UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_payments_verification_token ON public.payments(verification_token);
