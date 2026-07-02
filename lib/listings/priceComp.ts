const MIN_COMPS_FOR_SUGGESTION = 3

interface CompListing {
  price: number | null
  condition: string
}

interface PriceSuggestion {
  suggested_price: number | null
  price_range: { min: number; max: number } | null
  comp_count: number
}

export function computePriceSuggestion(
  targetCondition: string,
  comps: CompListing[],
): PriceSuggestion {
  const validPrices = comps.filter(
    (c): c is CompListing & { price: number } => c.price != null && c.price > 0,
  )

  if (validPrices.length < MIN_COMPS_FOR_SUGGESTION) {
    return { suggested_price: null, price_range: null, comp_count: validPrices.length }
  }

  // Count condition-matching comps twice so the suggestion leans toward
  // items in the same condition as the one being priced.
  const weighted = validPrices.flatMap((c) =>
    c.condition === targetCondition ? [c.price, c.price] : [c.price],
  )
  const sorted = [...weighted].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  const rawPrices = validPrices.map((c) => c.price)

  return {
    suggested_price: Math.round(median),
    price_range: { min: Math.min(...rawPrices), max: Math.max(...rawPrices) },
    comp_count: validPrices.length,
  }
}
