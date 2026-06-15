-- supabase/migrations/022_enable_rls.sql
-- Enable RLS on all tables.
--
-- All writes go through API route handlers that use the service role key
-- (supabaseAdmin), which bypasses RLS. RLS here protects against direct
-- Supabase REST/realtime access with the anon key.
--
-- Since this app uses custom JWTs (not Supabase Auth), auth.uid() is null
-- for anon requests. Policy strategy:
--   - Truly public data (listings, charities, reviews): SELECT open to all
--   - Everything else: service role only (no anon access)
--
-- Rollback:
--   alter table public.users         disable row level security;
--   alter table public.listings      disable row level security;
--   alter table public.orders        disable row level security;
--   alter table public.order_items   disable row level security;
--   alter table public.cart_items    disable row level security;
--   alter table public.reviews       disable row level security;
--   alter table public.claims        disable row level security;
--   alter table public.charities     disable row level security;
--   alter table public.donations     disable row level security;
--   alter table public.otp_codes     disable row level security;
--   alter table public.notifications disable row level security;
--   -- (drop all policies created below)

-- ── Helper: enable RLS + policies only if the table exists ───────────────────

do $$ begin
  -- users: no public access
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'users') then
    alter table public.users enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users: service role only') then
      create policy "users: service role only" on public.users for all using (false);
    end if;
  end if;

  -- listings: public SELECT allowed (browse, OG images)
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'listings') then
    alter table public.listings enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'listings' and policyname = 'listings: public read') then
      create policy "listings: public read" on public.listings for select using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'listings' and policyname = 'listings: no direct write') then
      create policy "listings: no direct write" on public.listings for all using (false);
    end if;
  end if;

  -- orders: private
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'orders') then
    alter table public.orders enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'orders: service role only') then
      create policy "orders: service role only" on public.orders for all using (false);
    end if;
  end if;

  -- order_items: private
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'order_items') then
    alter table public.order_items enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'order_items: service role only') then
      create policy "order_items: service role only" on public.order_items for all using (false);
    end if;
  end if;

  -- cart_items: private
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'cart_items') then
    alter table public.cart_items enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_items: service role only') then
      create policy "cart_items: service role only" on public.cart_items for all using (false);
    end if;
  end if;

  -- reviews: public SELECT (seller ratings)
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'reviews') then
    alter table public.reviews enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'reviews: public read') then
      create policy "reviews: public read" on public.reviews for select using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reviews' and policyname = 'reviews: no direct write') then
      create policy "reviews: no direct write" on public.reviews for all using (false);
    end if;
  end if;

  -- claims: private
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'claims') then
    alter table public.claims enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'claims' and policyname = 'claims: service role only') then
      create policy "claims: service role only" on public.claims for all using (false);
    end if;
  end if;

  -- charities: public SELECT for active charities (donate UI)
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'charities') then
    alter table public.charities enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'charities' and policyname = 'charities: public read') then
      create policy "charities: public read" on public.charities for select using (active = true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'charities' and policyname = 'charities: no direct write') then
      create policy "charities: no direct write" on public.charities for all using (false);
    end if;
  end if;

  -- donations: private
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'donations') then
    alter table public.donations enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'donations' and policyname = 'donations: service role only') then
      create policy "donations: service role only" on public.donations for all using (false);
    end if;
  end if;

  -- otp_codes: private
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'otp_codes') then
    alter table public.otp_codes enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'otp_codes' and policyname = 'otp_codes: service role only') then
      create policy "otp_codes: service role only" on public.otp_codes for all using (false);
    end if;
  end if;

  -- notifications: private
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'notifications') then
    alter table public.notifications enable row level security;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications: service role only') then
      create policy "notifications: service role only" on public.notifications for all using (false);
    end if;
  end if;
end $$;

