import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TransactionModal from './TransactionModal'

// Mock Lucide icons to prevent SVG rendering warnings in clean environments
vi.mock('lucide-react', () => ({
  CheckCircle: ({ size, style }) => <div data-testid="success-icon" style={style}>CheckCircle ({size})</div>,
  AlertTriangle: ({ size, style }) => <div data-testid="error-icon" style={style}>AlertTriangle ({size})</div>,
  ExternalLink: ({ size }) => <span data-testid="external-link">ExternalLink ({size})</span>,
}))

describe('TransactionModal Component', () => {
  it('renders nothing when txStage is null', () => {
    const { container } = render(<TransactionModal txStage={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders spinner and steps tracker when processing', () => {
    render(<TransactionModal txStage="Preparing" />)

    expect(screen.getByText('Processing Transaction')).toBeInTheDocument()
    expect(screen.getByText('Generating and simulating contract operation...')).toBeInTheDocument()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('success-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('error-icon')).not.toBeInTheDocument()

    // Steps tracker steps
    expect(screen.getByText('Prep')).toBeInTheDocument()
    expect(screen.getByText('Sign')).toBeInTheDocument()
    expect(screen.getByText('Submit')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('renders error icon and custom error message when failed', () => {
    const errorMsg = 'Disbursement failed: Cumulative payout exceeds the maximum cap per recipient.'
    render(<TransactionModal txStage="Failed" txError={errorMsg} />)

    expect(screen.getByText('Transaction Failed')).toBeInTheDocument()
    expect(screen.getByText(errorMsg)).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()

    // Steps tracker should NOT render when failed
    expect(screen.queryByText('Prep')).not.toBeInTheDocument()
  })

  it('renders success icon, tx hash link, and triggers onClose', () => {
    const handleClose = vi.fn()
    const txHash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    render(
      <TransactionModal 
        txStage="Success" 
        txHash={txHash} 
        onClose={handleClose} 
      />
    )

    expect(screen.getByText('Transaction Success!')).toBeInTheDocument()
    expect(screen.getByTestId('success-icon')).toBeInTheDocument()

    // Links to Stellar Expert correctly
    const link = screen.getByTestId('tx-link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', `https://stellar.expert/explorer/testnet/tx/${txHash}`)
    expect(screen.getByText(`Tx Hash: ${txHash.slice(0, 8)}...${txHash.slice(-8)}`)).toBeInTheDocument()

    // Test close button
    const closeBtn = screen.getByRole('button', { name: 'Close Panel' })
    expect(closeBtn).toBeInTheDocument()
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
