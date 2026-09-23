-- STAFF-004: accent-insensitive Client search (see
-- docs/implementation/STAFF-004-accent-insensitive-search-review.md).
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- unaccent(text) is only STABLE; naming the dictionary makes this wrapper
-- safe to declare IMMUTABLE so it can back an index.
CREATE FUNCTION "booking"."search_text"(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT lower(public.unaccent('public.unaccent'::regdictionary, value))
$$;

CREATE INDEX "clients_name_search_idx"
    ON "booking"."clients"
    USING gin ("booking"."search_text"("name") public.gin_trgm_ops);
