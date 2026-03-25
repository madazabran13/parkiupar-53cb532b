-- Testimonials table
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  business_name text,
  rating integer NOT NULL DEFAULT 5,
  review text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved testimonials" ON public.testimonials FOR SELECT TO public USING (is_approved = true);
CREATE POLICY "Authenticated users can insert testimonials" ON public.testimonials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Superadmin manages all testimonials" ON public.testimonials FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Users read own testimonials" ON public.testimonials FOR SELECT TO authenticated USING (user_id = auth.uid());

-- FAQs table
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active FAQs" ON public.faqs FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Superadmin manages FAQs" ON public.faqs FOR ALL TO authenticated USING (is_superadmin(auth.uid()));