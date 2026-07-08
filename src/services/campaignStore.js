/**
 * Campaign Store
 * 
 * Lightweight localStorage-based campaign CRUD for the Disaster Relief Rail app.
 * Maps campaigns to real disaster events and tracks donations/disbursements
 * without modifying the existing Soroban smart contracts.
 */

const CAMPAIGNS_KEY = 'drr_campaigns'
const CAMPAIGN_DONATIONS_KEY = 'drr_campaign_donations'
const CAMPAIGN_DISBURSEMENTS_KEY = 'drr_campaign_disbursements'

// ── Internal helpers ──────────────────────────────────────────────────────────

function generateId() {
  return 'camp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function loadJSON(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    console.error(`[CampaignStore] Failed to save to localStorage key: ${key}`)
  }
}

// ── Campaign CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a new campaign.
 * @param {{ name: string, region: string, goal: number, description: string, disasterId?: string, disasterTitle?: string }} params
 * @returns {object} The created campaign
 */
export function createCampaign({ name, region, goal, description, disasterId, disasterTitle }) {
  const campaigns = loadJSON(CAMPAIGNS_KEY)

  const campaign = {
    id: generateId(),
    name,
    region,
    goal: Number(goal),
    raised: 0,
    disbursed: 0,
    description,
    disasterId: disasterId || null,
    disasterTitle: disasterTitle || null,
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  campaigns.push(campaign)
  saveJSON(CAMPAIGNS_KEY, campaigns)
  return campaign
}

/**
 * Get all campaigns.
 */
export function getCampaigns() {
  return loadJSON(CAMPAIGNS_KEY)
}

/**
 * Get only active campaigns.
 */
export function getActiveCampaigns() {
  return loadJSON(CAMPAIGNS_KEY).filter(c => c.status === 'active')
}

/**
 * Get a single campaign by ID.
 */
export function getCampaignById(id) {
  return loadJSON(CAMPAIGNS_KEY).find(c => c.id === id) || null
}

/**
 * Update a campaign (partial update).
 */
export function updateCampaign(id, updates) {
  const campaigns = loadJSON(CAMPAIGNS_KEY)
  const idx = campaigns.findIndex(c => c.id === id)
  if (idx === -1) return null

  campaigns[idx] = { ...campaigns[idx], ...updates }
  saveJSON(CAMPAIGNS_KEY, campaigns)
  return campaigns[idx]
}

/**
 * Close/archive a campaign.
 */
export function closeCampaign(id) {
  return updateCampaign(id, { status: 'closed' })
}

// ── Donation Tracking ─────────────────────────────────────────────────────────

/**
 * Record a donation against a campaign.
 * @param {string} campaignId
 * @param {number} amountXlm
 * @param {string} donorAddress
 */
export function recordDonation(campaignId, amountXlm, donorAddress) {
  // Update campaign raised amount
  const campaigns = loadJSON(CAMPAIGNS_KEY)
  const idx = campaigns.findIndex(c => c.id === campaignId)
  if (idx !== -1) {
    campaigns[idx].raised = (campaigns[idx].raised || 0) + Number(amountXlm)
    saveJSON(CAMPAIGNS_KEY, campaigns)
  }

  // Record the individual donation
  const donations = loadJSON(CAMPAIGN_DONATIONS_KEY)
  donations.push({
    id: 'don_' + Date.now().toString(36),
    campaignId,
    amountXlm: Number(amountXlm),
    donorAddress,
    timestamp: new Date().toISOString(),
  })
  saveJSON(CAMPAIGN_DONATIONS_KEY, donations)
}

/**
 * Get all donations for a campaign.
 */
export function getCampaignDonations(campaignId) {
  return loadJSON(CAMPAIGN_DONATIONS_KEY).filter(d => d.campaignId === campaignId)
}

// ── Disbursement Tracking ─────────────────────────────────────────────────────

/**
 * Record a disbursement tagged to a campaign.
 * @param {string} campaignId
 * @param {number} amountXlm
 * @param {string} recipientAddress
 */
export function recordDisbursement(campaignId, amountXlm, recipientAddress) {
  // Update campaign disbursed amount
  const campaigns = loadJSON(CAMPAIGNS_KEY)
  const idx = campaigns.findIndex(c => c.id === campaignId)
  if (idx !== -1) {
    campaigns[idx].disbursed = (campaigns[idx].disbursed || 0) + Number(amountXlm)
    saveJSON(CAMPAIGNS_KEY, campaigns)
  }

  // Record the individual disbursement tag
  const disbursements = loadJSON(CAMPAIGN_DISBURSEMENTS_KEY)
  disbursements.push({
    id: 'dis_' + Date.now().toString(36),
    campaignId,
    amountXlm: Number(amountXlm),
    recipientAddress,
    timestamp: new Date().toISOString(),
  })
  saveJSON(CAMPAIGN_DISBURSEMENTS_KEY, disbursements)
}

/**
 * Get all disbursements for a campaign.
 */
export function getCampaignDisbursements(campaignId) {
  return loadJSON(CAMPAIGN_DISBURSEMENTS_KEY).filter(d => d.campaignId === campaignId)
}

/**
 * Get the campaign ID tagged to a specific disbursement recipient+amount combo (most recent).
 */
export function getDisbursementCampaignTag(recipientAddress) {
  const all = loadJSON(CAMPAIGN_DISBURSEMENTS_KEY).filter(d => d.recipientAddress === recipientAddress)
  if (all.length === 0) return null
  const latest = all[all.length - 1]
  const campaign = getCampaignById(latest.campaignId)
  return campaign ? campaign.name : null
}
