-- Allow anonymous users to view limited profile data for certificate verification
-- This is required for QR code scans to work without the scanner needing a login.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Allow public certificate verification'
    ) THEN
        CREATE POLICY "Allow public certificate verification" 
        ON public.profiles 
        FOR SELECT 
        TO anon 
        USING (true);
    END IF;
END $$;

-- Verify the policy state
SELECT * FROM pg_policies WHERE tablename = 'profiles';
