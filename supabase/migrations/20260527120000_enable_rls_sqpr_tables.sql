-- Enable RLS on SQPR tables that were publicly accessible without row-level security
ALTER TABLE public.sqpr_str_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sqpr_str_terms ENABLE ROW LEVEL SECURITY;

-- Allow anon role full access (same pattern as other internal tables in this project)
-- The SQPR tool uses the anon/publishable key with custom sessionStorage-based auth
CREATE POLICY "anon_all" ON public.sqpr_str_uploads
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all" ON public.sqpr_str_terms
  FOR ALL TO anon USING (true) WITH CHECK (true);
