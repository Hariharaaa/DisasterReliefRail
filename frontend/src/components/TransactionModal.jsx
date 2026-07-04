import { CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { STELLAR_EXPERT_URL } from '../config'

export default function TransactionModal({ txStage, txError, txHash, onClose }) {
  if (!txStage) return null

  const getStepClass = (stepStage) => {
    const stages = ['Preparing', 'Signing', 'Submitting', 'Pending', 'Success']
    const currentIdx = stages.indexOf(txStage)
    const stepIdx = stages.indexOf(stepStage)

    if (txStage === 'Failed') return 'tx-step'
    if (currentIdx === stepIdx) return 'tx-step active'
    if (currentIdx > stepIdx) return 'tx-step completed'
    return 'tx-step'
  }

  return (
    <div className="tx-modal-overlay">
      <div className="tx-modal">
        {txStage === 'Success' ? (
          <CheckCircle size={48} style={{ color: 'var(--success)', margin: '0 auto 1.5rem' }} data-testid="success-icon" />
        ) : txStage === 'Failed' ? (
          <AlertTriangle size={48} style={{ color: 'var(--error)', margin: '0 auto 1.5rem' }} data-testid="error-icon" />
        ) : (
          <div className="tx-spinner" data-testid="spinner" />
        )}

        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} id="tx-modal-title">
          {txStage === 'Success' 
            ? 'Transaction Success!' 
            : txStage === 'Failed' 
              ? 'Transaction Failed' 
              : 'Processing Transaction'}
        </h3>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }} id="tx-modal-description">
          {txStage === 'Preparing' && 'Generating and simulating contract operation...'}
          {txStage === 'Signing' && 'Awaiting transaction signature in your wallet...'}
          {txStage === 'Submitting' && 'Broadcasting transaction to Stellar nodes...'}
          {txStage === 'Pending' && 'Waiting for ledger consensus and validation...'}
          {txStage === 'Success' && 'The operation confirmed successfully on-chain!'}
          {txStage === 'Failed' && (txError || 'An unexpected error occurred during execution.')}
        </p>

        {txStage !== 'Failed' && (
          <div className="tx-status-steps">
            <div className={getStepClass('Preparing')}>
              1
              <span className="tx-step-label">Prep</span>
            </div>
            <div className={getStepClass('Signing')}>
              2
              <span className="tx-step-label">Sign</span>
            </div>
            <div className={getStepClass('Submitting')}>
              3
              <span className="tx-step-label">Submit</span>
            </div>
            <div className={getStepClass('Pending')}>
              4
              <span className="tx-step-label">Pending</span>
            </div>
            <div className={getStepClass('Success')}>
              5
              <span className="tx-step-label">Done</span>
            </div>
          </div>
        )}

        {txHash && (
          <div style={{ marginTop: '2rem' }}>
            <a 
              href={`${STELLAR_EXPERT_URL}/tx/${txHash}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="tx-hash-link"
              data-testid="tx-link"
            >
              <span>Tx Hash: {txHash.slice(0, 8)}...{txHash.slice(-8)}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {(txStage === 'Success' || txStage === 'Failed') && (
          <button 
            className="btn" 
            id="btn-close-modal"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid var(--border-muted)', marginTop: '2rem' }}
          >
            Close Panel
          </button>
        )}
      </div>
    </div>
  )
}
