import { Heart, MapPin, Target, ArrowRight } from 'lucide-react'

/**
 * CampaignCards — Grid of active campaign cards with progress bars.
 * Shown below the disaster feed on the Donor Portal.
 */
export default function CampaignCards({ campaigns, onSelectCampaign }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <section className="campaign-section" aria-label="Active Campaigns">
        <h3 className="card-title">
          <Target size={20} aria-hidden="true" /> Active Campaigns
        </h3>
        <div className="campaign-empty">
          <Target className="empty-icon" style={{ width: '2rem', height: '2rem' }} aria-hidden="true" />
          <p>No campaigns yet. Admins can create campaigns from the Admin Portal.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="campaign-section" aria-label="Active Campaigns">
      <h3 className="card-title">
        <Target size={20} aria-hidden="true" /> Active Campaigns
        <span className="campaign-count-badge">{campaigns.length}</span>
      </h3>

      <div className="campaign-grid">
        {campaigns.map((c, i) => {
          const percentage = c.goal > 0 ? Math.min((c.raised / c.goal) * 100, 100) : 0
          const isFullyFunded = percentage >= 100

          return (
            <article
              key={c.id}
              className={`campaign-card ${isFullyFunded ? 'fully-funded' : ''}`}
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <div className="campaign-card-header">
                <h4 className="campaign-card-name">{c.name}</h4>
                <span className="campaign-region-tag">
                  <MapPin size={11} aria-hidden="true" />
                  {c.region}
                </span>
              </div>

              {c.description && (
                <p className="campaign-card-desc">{c.description}</p>
              )}

              <div className="campaign-progress-section">
                <div className="progress-labels">
                  <span>
                    <strong>{c.raised.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> / {c.goal.toLocaleString('en-US')} XLM
                  </span>
                  <span>{percentage.toFixed(0)}%</span>
                </div>
                <div
                  className="progress-container"
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Campaign ${c.name}: ${percentage.toFixed(0)}% funded`}
                >
                  <div
                    className={`progress-bar-fill ${isFullyFunded ? 'progress-complete' : ''}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <button
                className="btn-campaign-donate"
                onClick={() => onSelectCampaign?.(c)}
                disabled={isFullyFunded}
                id={`btn-campaign-${c.id}`}
              >
                {isFullyFunded ? (
                  <><span>Fully Funded ✓</span></>
                ) : (
                  <>
                    <Heart size={14} aria-hidden="true" />
                    <span>Donate to this campaign</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </>
                )}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
