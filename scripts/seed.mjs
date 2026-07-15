/**
 * Seed script — 100 intentional declutter listings across 4 Nigerian sellers.
 * No food. No filler. Just things real people actually sell secondhand.
 *
 * Images: DummyJSON CDN (real product photos, no API key needed)
 * Run:    node scripts/seed.mjs
 *
 * Accounts created:
 *   seed-seller1@unstash.dev  / password123  — Amara Okafor (Individual, Lagos)
 *   seed-seller2@unstash.dev  / password123  — Emeka Nwosu  (Business, Abuja)
 *   seed-seller3@unstash.dev  / password123  — Zainab Ibrahim (Individual, Kano)
 *   seed-seller4@unstash.dev  / password123  — Temi Adeyemi (Individual, Lagos)
 *   seed-buyer1@unstash.dev   / password123  — Chidi Eze
 *   seed-buyer2@unstash.dev   / password123  — Fatima Bello
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'

// ── Env ──────────────────────────────────────────────────────────────────────

function loadEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter(line => line && !line.startsWith('#') && line.includes('='))
        .map(line => {
          const idx = line.indexOf('=')
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')]
        })
    )
  } catch { return {} }
}

const env = { ...loadEnvFile('.env.local'), ...process.env }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Constants ─────────────────────────────────────────────────────────────────

const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor']
const AREAS = [
  'Lekki Phase 1, Lagos', 'Victoria Island, Lagos', 'Ajah, Lagos',
  'Ikeja GRA, Lagos', 'Yaba, Lagos', 'Surulere, Lagos', 'Gbagada, Lagos',
  'Garki 2, Abuja', 'Wuse 2, Abuja', 'Maitama, Abuja', 'Gwarinpa, Abuja',
  'Nasarawa GRA, Kano', 'Sabon Gari, Kano',
  'Bodija, Ibadan', 'Ring Road, Ibadan',
  'GRA, Port Harcourt', 'Trans-Amadi, Port Harcourt',
]

const SEED_EMAILS = [
  'seed-seller1@unstash.dev',
  'seed-seller2@unstash.dev',
  'seed-seller3@unstash.dev',
  'seed-seller4@unstash.dev',
  'seed-buyer1@unstash.dev',
  'seed-buyer2@unstash.dev',
  'seed-dispatcher1@unstash.dev',
]

const STREET_NAMES = [
  '14 Freedom Way', '8 Admiralty Road', '22 Bourdillon Road', '5 Kofo Abayomi Street',
  '31 Aminu Kano Crescent', '19 Ahmadu Bello Way', '2 Adeola Odeku Street', '40 Herbert Macaulay Way',
]

// Two requests per VALID_CATEGORIES entry (app/api/listings/utils.ts) so the
// /requests category filter has more than one result for every category.
const REQUESTS = [
  { title: 'Need an Android phone under ₦60k', description: 'Old phone just died. Anything decent and working, screen can have minor scratches.', category: 'Electronics', listing_type: 'for_sale', maxPrice: 60000 },
  { title: 'Anyone giving away an old laptop that still boots?', description: 'Just need something basic for typing and browsing, not gaming.', category: 'Electronics', listing_type: 'free', maxPrice: null },
  { title: 'Looking for office chairs, 2-3 units', description: 'Setting up a small home office for my team. Comfortable over looks.', category: 'Furniture & Home', listing_type: null, maxPrice: 25000 },
  { title: 'Want a bookshelf, any size', description: 'Books are piling up on the floor, anything with 3+ shelves works.', category: 'Furniture & Home', listing_type: 'for_sale', maxPrice: 18000 },
  { title: 'Looking for a smart-casual jacket, size L', description: 'Need something decent for interviews, don\'t mind if it\'s worn as long as it\'s presentable.', category: 'Clothing & Accessories', listing_type: 'for_sale', maxPrice: 15000 },
  { title: 'Any donated shoes, size 42-43?', description: 'Lost my job recently and could really use a decent pair for interviews.', category: 'Clothing & Accessories', listing_type: 'donate', maxPrice: null },
  { title: 'Want a standing fan before the heat kicks in', description: 'AC is out for repairs, need a stopgap fan.', category: 'Appliances', listing_type: 'for_sale', maxPrice: 15000 },
  { title: 'Looking for a working electric kettle', description: 'Just need hot water quickly in the mornings, don\'t mind older models.', category: 'Appliances', listing_type: null, maxPrice: 8000 },
  { title: 'Anyone donating books for a school library?', description: 'Volunteering at a community school in need of any secondary school textbooks or novels.', category: 'Books & Stationery', listing_type: 'donate', maxPrice: null },
  { title: 'Need JAMB/UTME study materials', description: 'Preparing for next year\'s exam, would take used past-question books or guides.', category: 'Books & Stationery', listing_type: null, maxPrice: 5000 },
  { title: 'Any free baby clothes 0-6 months?', description: 'Expecting soon and would gladly take any gently used baby clothes people are giving away.', category: 'Kids & Baby', listing_type: 'free', maxPrice: null },
  { title: 'Looking for a used baby cot', description: 'Just needs to be sturdy and safe, cosmetic wear is fine.', category: 'Kids & Baby', listing_type: 'for_sale', maxPrice: 30000 },
  { title: 'Looking for a men\'s bicycle, any condition', description: 'Want to start cycling to work, budget is tight so open to fixer-uppers.', category: 'Sports & Outdoors', listing_type: null, maxPrice: 30000 },
  { title: 'Need a football, size 5', description: 'For weekend games with the neighbourhood kids, doesn\'t need to be new.', category: 'Sports & Outdoors', listing_type: 'for_sale', maxPrice: 5000 },
  { title: 'Need a spare tyre for a Toyota Corolla', description: 'Size 195/65R15, doesn\'t have to be new — just decent tread left.', category: 'Vehicles & Parts', listing_type: 'for_sale', maxPrice: 20000 },
  { title: 'Looking for a motorcycle helmet', description: 'Just started riding, need a helmet that actually fits — used is fine.', category: 'Vehicles & Parts', listing_type: null, maxPrice: 12000 },
  { title: 'Looking for moving boxes, any quantity', description: 'Relocating soon and could use any sturdy cardboard boxes people are done with.', category: 'Other', listing_type: 'free', maxPrice: null },
  { title: 'Want a decent suitcase for travel', description: 'Traveling next month, need a mid-size suitcase with working wheels and zips.', category: 'Other', listing_type: 'for_sale', maxPrice: 12000 },
]

function pick(arr, i) { return arr[i % arr.length] }

// listing_type cycle: 6× for_sale → 3× free → 1× donate
function listingType(i) {
  const slot = i % 10
  if (slot < 6) return 'for_sale'
  if (slot < 9) return 'free'
  return 'donate'
}

// NGN price — secondhand discount already baked in per category
function ngnPrice(usdPrice, multiplier) {
  return Math.round(usdPrice * multiplier / 500) * 500  // round to nearest ₦500
}

// ── DummyJSON fetch plan ─────────────────────────────────────────────────────
// 100 products, zero food, categories that real Nigerians sell secondhand

const FETCH_PLAN = [
  // Electronics — ~23 items
  { path: '/category/smartphones?limit=10&skip=0',       category: 'Electronics',            mult: 900 },
  { path: '/category/laptops?limit=10&skip=0',           category: 'Electronics',            mult: 700 },
  { path: '/category/tablets?limit=5&skip=0',            category: 'Electronics',            mult: 750 },
  { path: '/category/mobile-accessories?limit=5&skip=0', category: 'Electronics',            mult: 400 },

  // Clothing & Accessories — ~35 items
  { path: '/category/womens-dresses?limit=7&skip=0',     category: 'Clothing & Accessories', mult: 350 },
  { path: '/category/mens-shirts?limit=6&skip=0',        category: 'Clothing & Accessories', mult: 280 },
  { path: '/category/womens-bags?limit=5&skip=0',        category: 'Clothing & Accessories', mult: 450 },
  { path: '/category/mens-shoes?limit=4&skip=0',         category: 'Clothing & Accessories', mult: 360 },
  { path: '/category/womens-shoes?limit=4&skip=0',       category: 'Clothing & Accessories', mult: 360 },
  { path: '/category/sunglasses?limit=4&skip=0',         category: 'Clothing & Accessories', mult: 280 },
  { path: '/category/tops?limit=4&skip=0',               category: 'Clothing & Accessories', mult: 260 },
  { path: '/category/mens-watches?limit=3&skip=0',       category: 'Clothing & Accessories', mult: 380 },
  { path: '/category/womens-watches?limit=3&skip=0',     category: 'Clothing & Accessories', mult: 380 },
  { path: '/category/womens-jewellery?limit=3&skip=0',   category: 'Clothing & Accessories', mult: 320 },

  // Furniture & Home — ~15 items
  { path: '/category/furniture?limit=8&skip=0',          category: 'Furniture & Home',       mult: 600 },
  { path: '/category/home-decoration?limit=8&skip=0',    category: 'Furniture & Home',       mult: 480 },

  // Appliances — ~5 items (kitchen-accessories = cookware, not food)
  { path: '/category/kitchen-accessories?limit=5&skip=0',category: 'Appliances',             mult: 350 },

  // Sports & Outdoors — 8 items
  { path: '/category/sports-accessories?limit=8&skip=0', category: 'Sports & Outdoors',      mult: 380 },

  // Vehicles & Parts — ~4 items
  { path: '/category/motorcycle?limit=4&skip=0',         category: 'Vehicles & Parts',       mult: 1800 },
]

// ── Hardcoded products for categories DummyJSON doesn't cover ─────────────────
// Books & Stationery (4) + Kids & Baby (4) = 8 extra → total 108, trim to ~100

const HARDCODED = [
  // Books & Stationery
  {
    title: 'Think and Grow Rich – Napoleon Hill',
    description: 'Classic personal finance and mindset book. Read twice, spine still good. Hardcover edition.',
    category: 'Books & Stationery',
    images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80'],
  },
  {
    title: 'The Alchemist – Paulo Coelho',
    description: 'Lightly used paperback. A timeless read — great condition.',
    category: 'Books & Stationery',
    images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80'],
  },
  {
    title: 'WAEC & JAMB Past Questions Bundle (2018–2023)',
    description: 'Complete set of past questions for Sciences and Commercials. Some pages annotated in pencil.',
    category: 'Books & Stationery',
    images: ['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80'],
  },
  {
    title: 'Office Stationery Set',
    description: 'Assorted pens, notebooks, staplers and binders. Barely used. Great for a home office.',
    category: 'Books & Stationery',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'],
  },
  // Kids & Baby
  {
    title: 'Wooden Toy Building Blocks (50 pcs)',
    description: 'Colourful hardwood blocks for toddlers 2–5. All pieces present, no splinters.',
    category: 'Kids & Baby',
    images: ['https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&q=80'],
  },
  {
    title: 'Baby Stroller – Portable Foldable',
    description: 'Lightweight umbrella stroller, used for about 8 months. Washed and clean.',
    category: 'Kids & Baby',
    images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80'],
  },
  {
    title: 'Children\'s Story Books Bundle (10 books)',
    description: 'Mix of picture books and early-reader chapter books. Ages 3–8.',
    category: 'Kids & Baby',
    images: ['https://images.unsplash.com/photo-1599751453628-a3c2b63b0b5b?w=600&q=80'],
  },
  {
    title: 'Baby High Chair – Foldable',
    description: 'Good condition high chair with removable tray. Wipe-clean material. Suitable from 6 months.',
    category: 'Kids & Baby',
    images: ['https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&q=80'],
  },
  // Appliances
  {
    title: 'Binatone Standing Fan – 18 inch',
    description: 'Three-speed standing fan. Works perfectly. Selling because we got AC installed.',
    category: 'Appliances',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'],
  },
  {
    title: 'Scanfrost Microwave Oven 25L',
    description: 'Fully functional, clean inside. Relocating and can\'t take it. Comes with manual.',
    category: 'Appliances',
    images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80'],
  },
  {
    title: 'Blender – National 3-in-1',
    description: 'Used for smoothies only, blades sharp. All 3 jugs included.',
    category: 'Appliances',
    images: ['https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&q=80'],
  },
  {
    title: 'LG 2-Door Refrigerator 200L',
    description: 'Fully functional fridge. 4 years old but runs cold. Reason for sale: upgrading.',
    category: 'Appliances',
    images: ['https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80'],
  },
]

const HARDCODED_PRICES = {
  'Books & Stationery': [2500, 1800, 5000, 3000],
  'Kids & Baby': [8500, 22000, 6000, 18000],
  'Appliances': [15000, 45000, 12000, 95000],
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Unstash — 100 intentional listings...\n')

  const passwordHash = await bcrypt.hash('password123', 10)

  // ── 1. Wipe existing seed data ─────────────────────────────────────────────
  console.log('🧹 Cleaning up previous seed data...')

  const { data: existingUsers } = await db
    .from('users')
    .select('id')
    .in('email', SEED_EMAILS)

  if (existingUsers?.length) {
    const ids = existingUsers.map(u => u.id)
    const orderOwnerFilter = `buyer_id.in.(${ids.join(',')}),seller_id.in.(${ids.join(',')}),dispatcher_id.in.(${ids.join(',')})`
    await db.from('order_items').delete().in(
      'order_id',
      (await db.from('orders').select('id').or(orderOwnerFilter)
        .then(r => (r.data ?? []).map(o => o.id)))
    )
    await db.from('orders').delete().or(orderOwnerFilter)
    await db.from('listings').delete().in('seller_id', ids)
    await db.from('request_follows').delete().in('user_id', ids)
    await db.from('item_requests').delete().in('user_id', ids)
    await db.from('users').delete().in('id', ids)
    console.log(`  ✓ Removed ${ids.length} seed users and their data`)
  } else {
    console.log('  ✓ No previous seed data found')
  }

  // ── 2. Create sellers ──────────────────────────────────────────────────────
  console.log('\n👤 Creating sellers & buyers...')

  const sellerProfiles = [
    { email: 'seed-seller1@unstash.dev', name: 'Amara Okafor',   account_type: 'individual', area: 'Lekki Phase 1, Lagos' },
    { email: 'seed-seller2@unstash.dev', name: 'Emeka Nwosu',    account_type: 'business',   area: 'Wuse 2, Abuja' },
    { email: 'seed-seller3@unstash.dev', name: 'Zainab Ibrahim', account_type: 'individual', area: 'Sabon Gari, Kano' },
    { email: 'seed-seller4@unstash.dev', name: 'Temi Adeyemi',   account_type: 'individual', area: 'Surulere, Lagos' },
  ]

  const sellers = []
  for (const profile of sellerProfiles) {
    const { data, error } = await db
      .from('users')
      .insert({
        email: profile.email,
        name: profile.name,
        password_hash: passwordHash,
        account_type: profile.account_type,
        paystack_recipient_code: `RCP_seed_${profile.email.split('@')[0].replace('seed-', '')}`,
        paystack_onboarding_complete: true,
        email_verified: true,
      })
      .select('id, name, email')
      .single()

    if (error) throw new Error(`Seller insert failed for ${profile.email}: ${error.message}`)
    sellers.push({ ...data, area: profile.area })
    console.log(`  ✓ ${data.name} (${profile.email})`)
  }

  const buyerProfiles = [
    { email: 'seed-buyer1@unstash.dev', name: 'Chidi Eze' },
    { email: 'seed-buyer2@unstash.dev', name: 'Fatima Bello' },
  ]

  const buyers = []
  for (const profile of buyerProfiles) {
    const { data, error } = await db
      .from('users')
      .insert({
        email: profile.email,
        name: profile.name,
        password_hash: passwordHash,
        account_type: 'individual',
        email_verified: true,
      })
      .select('id, name')
      .single()

    if (error) throw new Error(`Buyer insert failed for ${profile.email}: ${error.message}`)
    buyers.push(data)
    console.log(`  ✓ ${data.name} (${profile.email})`)
  }

  const { data: dispatcher, error: dispatcherErr } = await db
    .from('users')
    .insert({
      email: 'seed-dispatcher1@unstash.dev',
      name: 'Yusuf Aliyu',
      password_hash: passwordHash,
      account_type: 'dispatcher',
      email_verified: true,
    })
    .select('id, name')
    .single()

  if (dispatcherErr) throw new Error(`Dispatcher insert failed: ${dispatcherErr.message}`)
  console.log(`  ✓ ${dispatcher.name} (seed-dispatcher1@unstash.dev)`)

  // ── 3. Fetch products from DummyJSON ───────────────────────────────────────
  console.log('\n⬇  Fetching products from DummyJSON (no food categories)...')

  const allProducts = []

  for (const plan of FETCH_PLAN) {
    const res = await fetch(`https://dummyjson.com/products${plan.path}`)
    if (!res.ok) throw new Error(`DummyJSON fetch failed for ${plan.path}: ${res.status}`)
    const { products } = await res.json()

    for (const p of products) {
      allProducts.push({
        title: p.title,
        description: p.description ?? '',
        category: plan.category,
        usdPrice: p.price,
        mult: plan.mult,
        images: [p.thumbnail, ...p.images.slice(0, 2)].filter(Boolean),
      })
    }

    process.stdout.write(`  ✓ ${plan.category.padEnd(25)} ${products.length} products\n`)
  }

  // Append hardcoded items
  let hardcodedIdx = 0
  for (const item of HARDCODED) {
    const cat = item.category
    const prices = HARDCODED_PRICES[cat]
    allProducts.push({
      title: item.title,
      description: item.description,
      category: cat,
      usdPrice: null,
      mult: null,
      ngnPriceFixed: prices[hardcodedIdx % prices.length],
      images: item.images,
    })
    hardcodedIdx++
  }

  console.log(`\n  📦 Total products collected: ${allProducts.length}`)

  // ── 4. Build and insert listings ───────────────────────────────────────────
  console.log('\n📋 Inserting listings...')

  const listingRows = allProducts.map((p, i) => {
    const type = listingType(i)
    const seller = sellers[i % sellers.length]
    const condition = pick(CONDITIONS, i + 3)
    const area = pick(AREAS, i + seller.id.charCodeAt(0))

    let price = null
    if (type === 'for_sale') {
      price = p.ngnPriceFixed ?? ngnPrice(p.usdPrice, p.mult)
      if (price < 500) price = 500
    }

    return {
      seller_id: seller.id,
      title: p.title,
      description: p.description,
      price,
      category: p.category,
      condition,
      listing_type: type,
      area,
      images: p.images,
      status: 'available',
    }
  })

  const BATCH = 50
  const insertedListings = []
  for (let i = 0; i < listingRows.length; i += BATCH) {
    const { data, error } = await db
      .from('listings')
      .insert(listingRows.slice(i, i + BATCH))
      .select('id')

    if (error) throw new Error(`Listings insert failed (batch ${i}): ${error.message}`)
    insertedListings.push(...data)
  }

  console.log(`  ✓ Inserted ${insertedListings.length} listings`)

  // Distribution summary
  const typeCounts = listingRows.reduce((acc, l) => {
    acc[l.listing_type] = (acc[l.listing_type] ?? 0) + 1
    return acc
  }, {})
  const catCounts = listingRows.reduce((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + 1
    return acc
  }, {})

  console.log('\n  Listing types:')
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`    ${type.padEnd(10)} ${count}`)
  }
  console.log('\n  Categories:')
  for (const [cat, count] of Object.entries(catCounts)) {
    console.log(`    ${cat.padEnd(30)} ${count}`)
  }

  // ── 5. Seed a handful of orders ────────────────────────────────────────────
  console.log('\n🛒 Inserting sample orders...')

  // Only order for_sale listings (they have a price)
  const forSaleListings = insertedListings.filter((_, i) => listingRows[i].listing_type === 'for_sale')

  // Explicit per-order plan, not a status cycle — dispatch reads status='confirmed'
  // + delivery_type='delivery' + dispatcher_id=null as its claimable pool
  // (app/api/dispatch/orders/route.ts), and status='shipped' + dispatcher_id=<me>
  // as "my deliveries" (app/api/dispatch/orders/mine/route.ts), so we need at
  // least one of each on purpose rather than leaving it to chance.
  const ORDER_PLAN = [
    { status: 'confirmed', isPickup: false },                        // dispatch pool
    { status: 'confirmed', isPickup: false },                        // dispatch pool
    { status: 'confirmed', isPickup: true },                         // pickup — not in dispatch pool
    { status: 'shipped', isPickup: false, assignDispatcher: true },  // dispatcher's "my deliveries"
    { status: 'delivered', isPickup: false },
    { status: 'completed', isPickup: true },
    { status: 'cancelled', isPickup: false },
    { status: 'paid', isPickup: false },
    { status: 'pending', isPickup: false },
    { status: 'confirmed', isPickup: false },                        // dispatch pool
  ]

  const orderRows = forSaleListings.slice(0, ORDER_PLAN.length).map((l, i) => {
    const row = listingRows[insertedListings.indexOf(l)]
    const plan = ORDER_PLAN[i]
    const isLagos = row.area.includes('Lagos')
    const deliveryFee = plan.isPickup ? 0 : (isLagos ? 1500 : 3500)
    const buyer = buyers[i % buyers.length]
    const street = pick(STREET_NAMES, i)

    return {
      listing_id: null,
      buyer_id: buyer.id,
      seller_id: row.seller_id,
      dispatcher_id: plan.assignDispatcher ? dispatcher.id : null,
      status: plan.status,
      delivery_type: plan.isPickup ? 'pickup' : 'delivery',
      item_price: row.price,
      delivery_fee: deliveryFee,
      total_price: row.price + deliveryFee,
      pickup_address: plan.isPickup ? `${street}, ${row.area}` : null,
      buyer_address: plan.isPickup ? null : `${street}, ${row.area}`,
    }
  })

  const { data: orders, error: ordErr } = await db
    .from('orders')
    .insert(orderRows)
    .select('id')

  if (ordErr) throw new Error(`Orders insert failed: ${ordErr.message}`)

  const orderItemRows = orders.map((o, i) => ({
    order_id: o.id,
    listing_id: forSaleListings[i].id,
    item_price: orderRows[i].item_price,
  }))

  const { error: itemErr } = await db.from('order_items').insert(orderItemRows)
  if (itemErr) throw new Error(`Order items insert failed: ${itemErr.message}`)

  const dispatchPoolCount = ORDER_PLAN.filter(p => p.status === 'confirmed' && !p.isPickup).length
  console.log(`  ✓ Inserted ${orders.length} orders with ${orderItemRows.length} order items`)
  console.log(`  ✓ ${dispatchPoolCount} orders confirmed + unclaimed (visible in dispatch pool), 1 shipped to ${dispatcher.name} (dispatch "mine")`)

  // ── 6. Seed community requests ─────────────────────────────────────────────
  console.log('\n📝 Inserting sample requests...')

  const requesters = [...buyers, sellers[2], sellers[3]]

  const requestRows = REQUESTS.map((r, i) => ({
    user_id: pick(requesters, i).id,
    title: r.title,
    description: r.description,
    category: r.category,
    listing_type: r.listing_type,
    area: pick(AREAS, i + 5),
    max_price: r.maxPrice,
    status: 'open',
  }))

  const { data: insertedRequests, error: reqErr } = await db
    .from('item_requests')
    .insert(requestRows)
    .select('id')

  if (reqErr) throw new Error(`Requests insert failed: ${reqErr.message}`)
  console.log(`  ✓ Inserted ${insertedRequests.length} requests`)

  // Creator auto-follows their own request (mirrors app/api/requests/route.ts),
  // plus everyone else follows the first request so it clears the "Hot" threshold (>=5).
  const allUserIds = [...sellers.map(s => s.id), ...buyers.map(b => b.id)]
  const followRows = insertedRequests.flatMap((req, i) => {
    const creatorId = requestRows[i].user_id
    const followerIds = i === 0
      ? allUserIds
      : [creatorId]
    return followerIds.map(user_id => ({ user_id, request_id: req.id }))
  })

  const { error: followErr } = await db.from('request_follows').insert(followRows)
  if (followErr) throw new Error(`Request follows insert failed: ${followErr.message}`)
  console.log(`  ✓ Inserted ${followRows.length} follows (1 request is "Hot")`)

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log(`
✅ Seed complete!

  ${insertedListings.length} listings across ${Object.keys(catCounts).length} categories
  ${Object.keys(typeCounts).map(t => `${typeCounts[t]} ${t}`).join(' · ')}
  ${orders.length} orders (${dispatchPoolCount} claimable in dispatch pool, 1 assigned to dispatcher)
  ${insertedRequests.length} requests (1 "Hot")

  Sellers
    seed-seller1@unstash.dev  / password123  — Amara Okafor (Individual, Lagos)
    seed-seller2@unstash.dev  / password123  — Emeka Nwosu  (Business, Abuja)
    seed-seller3@unstash.dev  / password123  — Zainab Ibrahim (Individual, Kano)
    seed-seller4@unstash.dev  / password123  — Temi Adeyemi (Individual, Lagos)

  Buyers
    seed-buyer1@unstash.dev   / password123  — Chidi Eze
    seed-buyer2@unstash.dev   / password123  — Fatima Bello

  Dispatcher
    seed-dispatcher1@unstash.dev / password123 — Yusuf Aliyu
`)
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
