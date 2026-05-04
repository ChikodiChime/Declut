-- Seed: sample listings for development
-- Run against your Supabase project via the SQL editor or CLI.
-- Safe to re-run — uses ON CONFLICT DO NOTHING throughout.

-- 1. Seed seller user (no real password needed — just a placeholder hash)
INSERT INTO public.users (id, email, name, password_hash, account_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'seed@declut.test',
  'Declut Seed Seller',
  '$2b$10$placeholder_not_a_real_hash_do_not_use',
  'individual'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Sample listings
INSERT INTO public.listings
  (id, seller_id, title, description, price, category, condition, listing_type, area, images, status)
VALUES

-- For Sale listings
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'iPhone 14 Pro — 256GB Space Black',
  'Bought in December, barely used. No scratches, comes with original box, charger, and unused EarPods. Battery health 97%.',
  185000,
  'Electronics',
  'like_new',
  'for_sale',
  'Lekki Phase 1, Lagos',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Samsung 43" Smart TV (2022)',
  'Moving abroad and can''t take it along. Crystal-clear 4K display, Netflix and YouTube built in. Remote included.',
  95000,
  'Electronics',
  'good',
  'for_sale',
  'Ajah, Lagos',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'L-shaped Office Desk — Solid Wood',
  'Heavy-duty desk from a home office clearance. Fits a dual-monitor setup comfortably. Buyer handles pickup.',
  28000,
  'Furniture & Home',
  'good',
  'for_sale',
  'Ikeja GRA, Lagos',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Ankara Kaftan Set (M) — Barely Worn',
  'Custom-made for one occasion, worn once. Excellent tailoring. Fits medium build comfortably.',
  8500,
  'Clothing & Accessories',
  'like_new',
  'for_sale',
  'Garki, Abuja',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'Standing Fan — Binatone 18"',
  'Works perfectly. Selling because we upgraded to AC. All 3 speeds work, oscillation is smooth.',
  7000,
  'Appliances',
  'good',
  'for_sale',
  'Wuse 2, Abuja',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'Trek Mountain Bike — 21-speed',
  'Used for weekend rides for about a year. New brake pads installed last month. Minor scratches on frame.',
  45000,
  'Sports & Outdoors',
  'good',
  'for_sale',
  'VI, Lagos',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'Toyota Camry 2008 Gear Lever',
  'Removed when doing interior upgrade. Perfect working condition, no cracks.',
  4500,
  'Vehicles & Parts',
  'good',
  'for_sale',
  'Oshodi, Lagos',
  '{}',
  'available'
),

-- Free listings
(
  '10000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'Stack of WAEC & JAMB Past Question Books',
  'About 30 booklets from 2015–2021. All subjects. Giving to anyone who needs them — please actually use them.',
  NULL,
  'Books & Stationery',
  'fair',
  'free',
  'Surulere, Lagos',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'Baby Cot with Mattress — Wooden Frame',
  'Baby outgrew it. Clean, no breakage. Mattress included. You come pick it up from Yaba.',
  NULL,
  'Kids & Baby',
  'good',
  'free',
  'Yaba, Lagos',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '3 Leather Office Chairs',
  'Office clearing. All functional, minor wear on armrests. Come with a van — they''re heavy.',
  NULL,
  'Furniture & Home',
  'fair',
  'free',
  'Maryland, Lagos',
  '{}',
  'available'
),

-- Donate listings
(
  '10000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Children''s School Uniforms (Age 5–8)',
  'Outgrown by our kids. 4 sets in good condition. Donating to any school or NGO that can use them.',
  NULL,
  'Kids & Baby',
  'good',
  'donate',
  'Magodo, Lagos',
  '{}',
  'available'
),
(
  '10000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'Assorted Fiction Novels — 20 books',
  'Chimamanda, Teju Cole, Chinua Achebe, and more. Donating to a community library or reading club.',
  NULL,
  'Books & Stationery',
  'good',
  'donate',
  'Ikeja, Lagos',
  '{}',
  'available'
)

ON CONFLICT (id) DO NOTHING;
