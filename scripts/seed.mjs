/**
 * Seed script — populates the DB with real product data from DummyJSON.
 * Run: node scripts/seed.mjs
 *
 * Creates:
 *   seed-seller@declut.dev  / password123  (individual, Stripe onboarding complete)
 *   seed-buyer@declut.dev   / password123  (individual)
 *   20 listings from dummyjson.com/products (images stored as external URLs)
 *   8 orders in varied statuses
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'

// ── Env loading ──────────────────────────────────────────────────────────────

function loadEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter(line => line && !line.startsWith('#') && line.includes('='))
        .map(line => {
          const idx = line.indexOf('=')
          const key = line.slice(0, idx).trim()
          const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
          return [key, val]
        })
    )
  } catch {
    return {}
  }
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

// ── Seed constants ───────────────────────────────────────────────────────────

const AREAS = [
  'Lekki, Lagos', 'Ajah, Lagos', 'Victoria Island, Lagos',
  'Ikeja, Lagos', 'Yaba, Lagos', 'Surulere, Lagos',
  'Garki, Abuja', 'Wuse, Abuja', 'Gwarinpa, Abuja',
  'Bodija, Ibadan',
]

const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor']

const ORDER_STATUSES = ['paid', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'paid', 'confirmed']

function pick(arr, i) { return arr[i % arr.length] }

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Declutter database...\n')

  // 1. Hash shared password
  const passwordHash = await bcrypt.hash('password123', 10)

  // 2. Upsert seed seller
  const { data: seller, error: sellerErr } = await db
    .from('users')
    .upsert({
      email: 'seed-seller@declut.dev',
      name: 'Amara Okafor',
      password_hash: passwordHash,
      account_type: 'individual',
      stripe_account_id: 'acct_seed_seller',
      stripe_onboarding_complete: true,
      email_verified: true,
    }, { onConflict: 'email' })
    .select('id')
    .single()

  if (sellerErr) throw new Error(`Seller upsert failed: ${sellerErr.message}`)
  console.log(`✓ Seller: ${seller.id}  (seed-seller@declut.dev)`)

  // 3. Upsert seed buyer
  const { data: buyer, error: buyerErr } = await db
    .from('users')
    .upsert({
      email: 'seed-buyer@declut.dev',
      name: 'Chidi Eze',
      password_hash: passwordHash,
      account_type: 'individual',
      email_verified: true,
    }, { onConflict: 'email' })
    .select('id')
    .single()

  if (buyerErr) throw new Error(`Buyer upsert failed: ${buyerErr.message}`)
  console.log(`✓ Buyer:  ${buyer.id}  (seed-buyer@declut.dev)`)

  // 4. Fetch products from DummyJSON
  console.log('\n⬇  Fetching products from dummyjson.com...')
  const res = await fetch('https://dummyjson.com/products?limit=20&skip=0')
  if (!res.ok) throw new Error(`DummyJSON fetch failed: ${res.status}`)
  const { products } = await res.json()
  console.log(`✓ Fetched ${products.length} products`)

  // 5. Delete existing seed listings (clean re-seed)
  await db.from('orders').delete().eq('seller_id', seller.id)
  await db.from('listings').delete().eq('seller_id', seller.id)

  // 6. Insert listings
  const listingRows = products.map((p, i) => ({
    seller_id: seller.id,
    title: p.title,
    description: p.description ?? null,
    price: Math.round(p.price * 1600),  // USD → NGN (rough)
    category: p.category,
    condition: pick(CONDITIONS, i),
    listing_type: 'for_sale',
    area: pick(AREAS, i),
    // Store external URLs directly — rendered via ListingImage component
    images: [p.thumbnail, ...p.images.slice(0, 2)].filter(Boolean),
    status: 'available',
  }))

  const { data: listings, error: listErr } = await db
    .from('listings')
    .insert(listingRows)
    .select('id')

  if (listErr) throw new Error(`Listings insert failed: ${listErr.message}`)
  console.log(`✓ Inserted ${listings.length} listings`)

  // 7. Insert orders — first 6 are single-item, last group is 2-item (same seller)
  //    listing indices 0-5: one listing each
  //    listing indices 6-7: grouped into one order (two items, same seller)
  const singleOrderRows = listings.slice(0, 6).map((l, i) => {
    const isPickup = i % 3 === 0
    const isLagos = listingRows[i].area.includes('Lagos')
    const deliveryFee = isPickup ? 0 : (isLagos ? 3000 : 6000)
    const itemPrice = listingRows[i].price
    return {
      listing_id: null,
      buyer_id: buyer.id,
      seller_id: seller.id,
      status: ORDER_STATUSES[i],
      delivery_type: isPickup ? 'pickup' : 'delivery',
      item_price: itemPrice,
      delivery_fee: deliveryFee,
      total_price: itemPrice + deliveryFee,
      pickup_address: isPickup ? '12 Adeola Odeku Street, Victoria Island, Lagos' : null,
    }
  })

  const groupedItemPrice = listingRows[6].price + listingRows[7].price
  const groupedDeliveryFee = listingRows[6].area.includes('Lagos') ? 3000 : 6000
  const groupedOrderRow = {
    listing_id: null,
    buyer_id: buyer.id,
    seller_id: seller.id,
    status: ORDER_STATUSES[6],
    delivery_type: 'delivery',
    item_price: groupedItemPrice,
    delivery_fee: groupedDeliveryFee,
    total_price: groupedItemPrice + groupedDeliveryFee,
    pickup_address: null,
  }

  const { data: orders, error: ordErr } = await db
    .from('orders')
    .insert([...singleOrderRows, groupedOrderRow])
    .select('id')

  if (ordErr) throw new Error(`Orders insert failed: ${ordErr.message}`)
  console.log(`✓ Inserted ${orders.length} orders`)

  // 8. Insert order_items for each order
  const orderItemRows = [
    ...orders.slice(0, 6).map((o, i) => ({
      order_id: o.id,
      listing_id: listings[i].id,
      item_price: listingRows[i].price,
    })),
    // Grouped order: two items
    { order_id: orders[6].id, listing_id: listings[6].id, item_price: listingRows[6].price },
    { order_id: orders[6].id, listing_id: listings[7].id, item_price: listingRows[7].price },
  ]

  const { error: itemErr } = await db.from('order_items').insert(orderItemRows)
  if (itemErr) throw new Error(`Order items insert failed: ${itemErr.message}`)
  console.log(`✓ Inserted ${orderItemRows.length} order items`)

  console.log(`
✅ Seed complete!

  Seller  seed-seller@declut.dev  / password123
  Buyer   seed-buyer@declut.dev   / password123

Log in as the buyer to see purchases in /dashboard/orders?tab=purchases
Log in as the seller to see incoming sales in /dashboard/orders?tab=sales
`)
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
