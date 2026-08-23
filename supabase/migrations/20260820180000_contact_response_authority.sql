-- One flag on profiles so admin can let a selected Safety Mitra open Responses.
-- Not a contact inbox. Contact messages stay in the Google Sheet.
--
-- RUN once in the Supabase SQL editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_handle_contact_responses boolean NOT NULL DEFAULT false;
