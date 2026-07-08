import { useState } from 'react'
import { createCampaign } from '../services/campaignStore'
import { getDisasterIcon } from '../services/disasterFeed'
import { X, Target, MapPin, FileText, Coins, ArrowRight, CheckCircle } from 'lucide-react'

/**
 * CreateCampaignModal — Admin modal for creating a new disaster campaign.
 * Can optionally be pre-filled with a linked disaster from the feed.
 */
export default function CreateCampaignModal({ isOpen, onClose, onCreated, linkedDisaster }) {
  const [name, setName] = useState(linkedDisaster?.title || '')
  const [region, setRegion] = useState(linkedDisaster?.region || linkedDisaster?.country || '')
  const [goal, setGoal] = useState('')
  const [description, setDescription] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Reset form when linkedDisaster changes
  useState(() => {
    if (linkedDisaster) {
      setName(linkedDisaster.title || '')
      setRegion(linkedDisaster.region || linkedDisaster.country || '')
    }
  })

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Campaign name is required')
      return
    }
    if (!region.trim()) {
      setError('Region is required')
      return
    }
    if (!goal || Number(goal) <= 0) {
      setError('Goal must be a positive number')
      return
    }

    try {
      const campaign = createCampaign({
        name: name.trim(),
        region: region.trim(),
        goal: Number(goal),
        description: description.trim(),
        disasterId: linkedDisaster?.id || null,
        disasterTitle: linkedDisaster?.title || null,
      })

      setSuccess(true)
      onCreated?.(campaign)

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (e) {
      setError('Failed to create campaign: ' + e.message)
    }
  }

  const handleClose = () => {
    setName('')
    setRegion('')
    setGoal('')
    setDescription('')
    setSuccess(false)
    setError(null)
    onClose?.()
  }

  return (
    <div className="create-campaign-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="create-campaign-modal" role="dialog" aria-modal="true" aria-labelledby="create-campaign-title">

        <button className="modal-close-btn" onClick={handleClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {success ? (
          <div className="campaign-success">
            <CheckCircle size={48} style={{ color: 'var(--success)' }} />
            <h3 id="create-campaign-title" style={{ marginTop: '1rem' }}>Campaign Created!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              "{name}" is now live on the Donor Portal.
            </p>
          </div>
        ) : (
          <>
            <h3 id="create-campaign-title" className="card-title" style={{ marginBottom: '0.5rem' }}>
              <Target size={20} aria-hidden="true" /> Create Campaign
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
              Link a fundraising campaign to a specific disaster event. Donors will see this on the portal.
            </p>

            {linkedDisaster && (
              <div className="linked-disaster-badge">
                <span>{getDisasterIcon(linkedDisaster.type)}</span>
                <span>Linked to: <strong>{linkedDisaster.title}</strong></span>
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="campaign-name">
                  <FileText size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Campaign Name
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  required
                  placeholder="e.g. Bangladesh Flood Relief 2026"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group-split">
                <div>
                  <label className="form-label" htmlFor="campaign-region">
                    <MapPin size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Region
                  </label>
                  <input
                    id="campaign-region"
                    type="text"
                    required
                    placeholder="e.g. South Asia"
                    className="form-input"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="campaign-goal">
                    <Coins size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Target Goal (XLM)
                  </label>
                  <input
                    id="campaign-goal"
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="e.g. 5000"
                    className="form-input"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="campaign-desc">Description</label>
                <textarea
                  id="campaign-desc"
                  placeholder="Brief description of the campaign and how funds will be used..."
                  className="form-input campaign-textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" id="btn-create-campaign">
                <span>Create Campaign</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
