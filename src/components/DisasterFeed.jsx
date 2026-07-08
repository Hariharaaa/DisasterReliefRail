import { useState, useEffect, useRef } from 'react'
import { fetchDisasters, getDisasterIcon, getDisasterLabel, formatDisasterDate } from '../services/disasterFeed'
import { AlertTriangle, MapPin, Calendar, ArrowRight, RefreshCw, Zap } from 'lucide-react'

/**
 * DisasterFeed — Live disaster headline cards with "Fund this crisis" buttons.
 * Shown at the top of the Donor Portal as a horizontal scrollable feed.
 */
export default function DisasterFeed({ onFundCrisis }) {
  const [disasters, setDisasters] = useState([])
  const [source, setSource] = useState('')
  const [isCached, setIsCached] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  const loadFeed = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchDisasters()
      setDisasters(result.disasters)
      setSource(result.source)
      setIsCached(result.isCached)
    } catch (e) {
      console.error('[DisasterFeed] Failed to load:', e)
      setError('Unable to load disaster feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadFeed, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })
  }
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })
  }

  // Severity color mapping
  const severityClass = (severity) => {
    if (severity === 'critical') return 'severity-critical'
    if (severity === 'alert') return 'severity-alert'
    return 'severity-warning'
  }

  if (loading) {
    return (
      <section className="disaster-feed-section" aria-label="Active Disasters Feed">
        <div className="disaster-feed-header">
          <h3 className="card-title">
            <Zap size={20} aria-hidden="true" /> Active Disasters
          </h3>
        </div>
        <div className="disaster-feed-scroll">
          {[0, 1, 2].map(i => (
            <div key={i} className="disaster-card disaster-card-skeleton" aria-hidden="true">
              <div className="skeleton skeleton-line" style={{ height: '1.5rem', width: '80%', marginBottom: '0.75rem' }} />
              <div className="skeleton skeleton-line" style={{ height: '1rem', width: '60%', marginBottom: '0.5rem' }} />
              <div className="skeleton skeleton-line" style={{ height: '1rem', width: '40%' }} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error && disasters.length === 0) {
    return (
      <section className="disaster-feed-section" aria-label="Active Disasters Feed">
        <div className="disaster-feed-header">
          <h3 className="card-title">
            <Zap size={20} aria-hidden="true" /> Active Disasters
          </h3>
        </div>
        <div className="disaster-feed-fallback">
          <AlertTriangle size={24} aria-hidden="true" />
          <p>Unable to load live disaster data right now.</p>
          <button className="btn-feed-retry" onClick={loadFeed}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="disaster-feed-section" aria-label="Active Disasters Feed">
      <div className="disaster-feed-header">
        <h3 className="card-title">
          <Zap size={20} aria-hidden="true" /> Active Disasters
        </h3>
        <div className="disaster-feed-meta">
          {isCached && (
            <span className="feed-source-badge cached">Cached</span>
          )}
          <span className="feed-source-badge">
            via {source}
          </span>
          <div className="feed-scroll-controls">
            <button className="feed-scroll-btn" onClick={scrollLeft} aria-label="Scroll left">←</button>
            <button className="feed-scroll-btn" onClick={scrollRight} aria-label="Scroll right">→</button>
          </div>
        </div>
      </div>

      <div className="disaster-feed-scroll" ref={scrollRef}>
        {disasters.map((d, i) => (
          <article
            key={d.id}
            className="disaster-card"
            style={{ animationDelay: `${0.1 + i * 0.08}s` }}
          >
            <div className="disaster-card-top">
              <span className={`disaster-type-badge ${d.type}`}>
                {getDisasterIcon(d.type)} {getDisasterLabel(d.type)}
              </span>
              <span className={`disaster-severity ${severityClass(d.severity)}`}>
                {d.severity === 'critical' ? '●' : d.severity === 'alert' ? '●' : '●'}
              </span>
            </div>

            <h4 className="disaster-card-title">{d.title}</h4>

            <div className="disaster-card-details">
              <span className="disaster-detail">
                <MapPin size={12} aria-hidden="true" />
                {d.country}
              </span>
              <span className="disaster-detail">
                <Calendar size={12} aria-hidden="true" />
                {formatDisasterDate(d.date)}
              </span>
            </div>

            <button
              className="btn-fund-crisis"
              onClick={() => onFundCrisis?.(d)}
              id={`btn-fund-${d.id}`}
            >
              <span>Fund this crisis</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
