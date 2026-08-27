ALTER TABLE public.motorcycles
  ADD COLUMN IF NOT EXISTS cilindrada integer;

CREATE INDEX IF NOT EXISTS idx_motorcycles_cilindrada
  ON public.motorcycles (cilindrada);

NOTIFY pgrst, 'reload schema';
