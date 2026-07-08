/**
 * Disaster Feed Service
 * 
 * Fetches live disaster data from multiple sources with graceful fallback:
 * 1. ReliefWeb v2 API (requires pre-approved appname via VITE_RELIEFWEB_APPNAME)
 * 2. GDACS GeoJSON feed (free, no auth)
 * 3. Curated seed data (always works offline)
 * 
 * Implements localStorage caching so the feed survives temporary API failures.
 */

const CACHE_KEY = 'drr_disaster_feed_cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ── Normalized disaster object shape ──────────────────────────────────────────
// { id, title, country, region, date, type, severity, source, url }

// ── ReliefWeb v2 API ──────────────────────────────────────────────────────────

async function fetchFromReliefWeb() {
  const appname = import.meta.env.VITE_RELIEFWEB_APPNAME
  if (!appname) return null

  const url = `https://api.reliefweb.int/v2/disasters?appname=${encodeURIComponent(appname)}&limit=12&fields[include][]=name&fields[include][]=country&fields[include][]=date&fields[include][]=type&fields[include][]=status&fields[include][]=description-html&sort[]=date:desc&filter[field]=status&filter[value]=current`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null

  const data = await res.json()
  if (!data?.data?.length) return null

  return data.data.map(item => {
    const fields = item.fields || {}
    const countries = (fields.country || []).map(c => c.name)
    const types = (fields.type || []).map(t => t.name)

    return {
      id: `rw-${item.id}`,
      title: fields.name || 'Unknown Disaster',
      country: countries[0] || 'Unknown',
      region: countries.join(', '),
      date: fields.date?.created || new Date().toISOString(),
      type: mapDisasterType(types[0] || ''),
      severity: 'alert',
      source: 'ReliefWeb',
      url: `https://reliefweb.int/disaster/${item.id}`,
    }
  })
}

// ── GDACS GeoJSON Feed ────────────────────────────────────────────────────────

async function fetchFromGDACS() {
  // GDACS provides a public GeoJSON feed of recent events
  // We only fetch Orange and Red alert levels to show events that cost damages
  const url = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO,DR,WF&fromDate=' +
    getDateDaysAgo(30) + '&toDate=' + getTodayDate() + '&alertlevel=Orange;Red'

  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'Accept': 'application/json' }
  })
  if (!res.ok) return null

  const data = await res.json()
  if (!data?.features?.length) return null

  return data.features.slice(0, 12).map(f => {
    const p = f.properties || {}
    return {
      id: `gdacs-${p.eventid || Math.random().toString(36).slice(2)}`,
      title: p.name || p.htmldescription || 'Disaster Event',
      country: p.country || 'Unknown',
      region: p.country || 'Unknown',
      date: p.fromdate || new Date().toISOString(),
      type: mapGDACSType(p.eventtype),
      severity: mapGDACSAlertLevel(p.alertlevel),
      source: 'GDACS',
      url: p.url || `https://www.gdacs.org/report.aspx?eventid=${p.eventid}&eventtype=${p.eventtype}`,
    }
  })
}

// ── Curated seed data (always-available fallback) ─────────────────────────────

function getSeedDisasters() {
  return [
    {
      id: 'seed-1',
      title: 'Severe Flooding — Bangladesh & Myanmar',
      country: 'Bangladesh',
      region: 'South Asia',
      date: '2026-06-28T00:00:00Z',
      type: 'flood',
      severity: 'critical',
      source: 'Seed Data',
      url: '#',
    },
    {
      id: 'seed-2',
      title: 'Earthquake M6.4 — Southern Turkey',
      country: 'Turkey',
      region: 'Middle East',
      date: '2026-06-25T00:00:00Z',
      type: 'earthquake',
      severity: 'alert',
      source: 'Seed Data',
      url: '#',
    },
    {
      id: 'seed-3',
      title: 'Tropical Cyclone Amara — Mozambique Coast',
      country: 'Mozambique',
      region: 'East Africa',
      date: '2026-06-20T00:00:00Z',
      type: 'cyclone',
      severity: 'critical',
      source: 'Seed Data',
      url: '#',
    },
    {
      id: 'seed-4',
      title: 'Drought Emergency — Horn of Africa',
      country: 'Ethiopia',
      region: 'East Africa',
      date: '2026-06-15T00:00:00Z',
      type: 'drought',
      severity: 'warning',
      source: 'Seed Data',
      url: '#',
    },
    {
      id: 'seed-5',
      title: 'Volcanic Eruption — Mount Kanlaon, Philippines',
      country: 'Philippines',
      region: 'Southeast Asia',
      date: '2026-06-12T00:00:00Z',
      type: 'volcano',
      severity: 'alert',
      source: 'Seed Data',
      url: '#',
    },
    {
      id: 'seed-6',
      title: 'Wildfire Crisis — Southern California',
      country: 'United States',
      region: 'North America',
      date: '2026-06-08T00:00:00Z',
      type: 'wildfire',
      severity: 'warning',
      source: 'Seed Data',
      url: '#',
    },
  ]
}

// ── Type mappers ──────────────────────────────────────────────────────────────

function mapDisasterType(typeStr) {
  const t = (typeStr || '').toLowerCase()
  if (t.includes('flood')) return 'flood'
  if (t.includes('earthquake') || t.includes('quake')) return 'earthquake'
  if (t.includes('cyclone') || t.includes('typhoon') || t.includes('hurricane') || t.includes('storm') || t.includes('tropical')) return 'cyclone'
  if (t.includes('drought')) return 'drought'
  if (t.includes('volcano') || t.includes('volcanic') || t.includes('eruption')) return 'volcano'
  if (t.includes('wildfire') || t.includes('fire')) return 'wildfire'
  if (t.includes('tsunami')) return 'tsunami'
  if (t.includes('landslide') || t.includes('mudslide')) return 'landslide'
  return 'other'
}

function mapGDACSType(type) {
  const map = { EQ: 'earthquake', TC: 'cyclone', FL: 'flood', VO: 'volcano', DR: 'drought', WF: 'wildfire' }
  return map[type] || 'other'
}

function mapGDACSAlertLevel(level) {
  const l = (level || '').toLowerCase()
  if (l === 'red') return 'critical'
  if (l === 'orange') return 'alert'
  return 'warning'
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function getDateDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function getCachedFeed() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    // Return cached data even if stale (for fallback), but mark freshness
    return { data, isFresh: Date.now() - timestamp < CACHE_TTL_MS }
  } catch {
    return null
  }
}

function setCacheFeed(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Deduplicate disasters based on title and filter out low-severity (non-damaging) events.
 */
function deduplicateDisasters(disasters) {
  const seen = new Set()
  return disasters.filter(d => {
    // Only show events that cause damages (alert or critical)
    if (d.severity === 'warning') return false
    
    const key = (d.title || '').toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Fetch active disasters with multi-source fallback + caching.
 * @returns {{ disasters: Array, source: string, isCached: boolean }}
 */
export async function fetchDisasters() {
  // 1. Try ReliefWeb
  try {
    const rwData = await fetchFromReliefWeb()
    if (rwData && rwData.length > 0) {
      const deduped = deduplicateDisasters(rwData)
      setCacheFeed(deduped)
      return { disasters: deduped, source: 'ReliefWeb', isCached: false }
    }
  } catch (e) {
    console.warn('[DisasterFeed] ReliefWeb fetch failed:', e.message)
  }

  // 2. Try GDACS
  try {
    const gdacsData = await fetchFromGDACS()
    if (gdacsData && gdacsData.length > 0) {
      const deduped = deduplicateDisasters(gdacsData)
      setCacheFeed(deduped)
      return { disasters: deduped, source: 'GDACS', isCached: false }
    }
  } catch (e) {
    console.warn('[DisasterFeed] GDACS fetch failed:', e.message)
  }

  // 3. Try localStorage cache
  const cached = getCachedFeed()
  if (cached && cached.data?.length > 0) {
    const deduped = deduplicateDisasters(cached.data)
    return { disasters: deduped, source: 'Cached', isCached: true }
  }

  // 4. Fall back to seed data
  const seeds = deduplicateDisasters(getSeedDisasters())
  return { disasters: seeds, source: 'Seed', isCached: false }
}

/**
 * Returns the emoji icon for a disaster type.
 */
export function getDisasterIcon(type) {
  const icons = {
    flood: '🌊',
    earthquake: '🌍',
    cyclone: '🌪️',
    drought: '☀️',
    volcano: '🌋',
    wildfire: '🔥',
    tsunami: '🌊',
    landslide: '⛰️',
    other: '⚠️',
  }
  return icons[type] || '⚠️'
}

/**
 * Returns a human-readable label for a disaster type.
 */
export function getDisasterLabel(type) {
  const labels = {
    flood: 'Flood',
    earthquake: 'Earthquake',
    cyclone: 'Cyclone',
    drought: 'Drought',
    volcano: 'Volcanic Eruption',
    wildfire: 'Wildfire',
    tsunami: 'Tsunami',
    landslide: 'Landslide',
    other: 'Crisis',
  }
  return labels[type] || 'Crisis'
}

/**
 * Format a date string to a short human-readable format.
 */
export function formatDisasterDate(dateStr) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Unknown date'
  }
}
