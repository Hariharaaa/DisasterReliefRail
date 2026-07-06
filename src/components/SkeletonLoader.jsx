/**
 * SkeletonLoader — animated placeholder for loading states.
 * Usage: <SkeletonLoader type="card" /> or <SkeletonLoader type="row" lines={3} />
 */
export function SkeletonCard({ height = '120px' }) {
  return (
    <div className="skeleton-card" style={{ height }} aria-hidden="true">
      <div className="skeleton skeleton-line" style={{ width: '40%', height: '14px', marginBottom: '16px' }} />
      <div className="skeleton skeleton-line" style={{ width: '80%', height: '48px', marginBottom: '12px' }} />
      <div className="skeleton skeleton-line" style={{ width: '60%', height: '12px' }} />
    </div>
  )
}

export function SkeletonRow({ lines = 2 }) {
  return (
    <div className="skeleton-row" aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="skeleton skeleton-line"
              style={{ width: i === 0 ? '55%' : '35%', height: i === 0 ? '16px' : '12px' }}
            />
          ))}
        </div>
        <div className="skeleton skeleton-line" style={{ width: '80px', height: '20px', flexShrink: 0 }} />
      </div>
    </div>
  )
}

export function SkeletonBalance() {
  return (
    <div className="skeleton-balance" aria-hidden="true">
      <div className="skeleton skeleton-line" style={{ width: '50%', height: '12px', marginBottom: '16px' }} />
      <div className="skeleton skeleton-line" style={{ width: '75%', height: '64px', marginBottom: '12px' }} />
      <div className="skeleton skeleton-line" style={{ width: '45%', height: '12px' }} />
    </div>
  )
}
