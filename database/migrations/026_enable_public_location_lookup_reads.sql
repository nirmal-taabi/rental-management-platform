ALTER TABLE public.location_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_cities ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.location_states, public.location_cities TO anon, authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'location_states'
          AND policyname = 'location_states_public_read'
    ) THEN
        CREATE POLICY location_states_public_read
            ON public.location_states
            FOR SELECT
            TO anon, authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'location_cities'
          AND policyname = 'location_cities_public_read'
    ) THEN
        CREATE POLICY location_cities_public_read
            ON public.location_cities
            FOR SELECT
            TO anon, authenticated
            USING (true);
    END IF;
END
$$;