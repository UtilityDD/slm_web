-- Ensure uuid-ossp extension is enabled for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Also verify if the RPC can be called with explicit casts
-- (This is just a check, no changes needed here)
