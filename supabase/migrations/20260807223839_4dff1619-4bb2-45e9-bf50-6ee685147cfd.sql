ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS questions_file_url TEXT; 
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS answer_key_url TEXT; 
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS answer_key_text TEXT;