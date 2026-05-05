-- Users table
-- id is a UUID we generate (not a Clerk ID)
-- password_hash stores the bcrypt hash — never the plain password
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text not null,
  account_type text not null default 'individual'
    check (account_type in ('individual', 'business')),
  stripe_account_id text,
  stripe_onboarding_complete boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Listings table
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2),                   -- null for free/donate listings
  category text not null,
  condition text not null
    check (condition in ('new', 'like_new', 'good', 'fair', 'poor')),
  listing_type text not null
    check (listing_type in ('for_sale', 'free', 'donate')),
  area text not null,                    -- e.g. "Ajah, Lagos"
  images text[] not null default '{}',  -- Cloudinary public_ids
  status text not null default 'available'
    check (status in ('available', 'sold', 'claimed', 'donated')),
  created_at timestamptz not null default now()
);

-- Orders table (for_sale listings only)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled')),
  delivery_type text not null
    check (delivery_type in ('delivery', 'pickup')),
  item_price numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total_price numeric(10,2) not null,
  stripe_payment_intent_id text,
  pickup_address text,                   -- revealed only after payment confirmed
  auto_cancel_at timestamptz,            -- 12h after payment; auto-cancel if seller silent
  created_at timestamptz not null default now()
);

-- Cart items
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id)
);

-- Reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  reviewer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index listings_seller_id_idx on public.listings(seller_id);
create index listings_status_idx on public.listings(status);
create index listings_listing_type_idx on public.listings(listing_type);
create index orders_buyer_id_idx on public.orders(buyer_id);
create index orders_seller_id_idx on public.orders(seller_id);
create index orders_status_idx on public.orders(status);
