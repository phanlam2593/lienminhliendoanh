ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;