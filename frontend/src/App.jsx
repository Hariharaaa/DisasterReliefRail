import { useState, useEffect, useCallback } from 'react'
import { useWallet } from './context/WalletContext'
import {
  getWalletBalance,
  getFundBalance,
  getRecipients,
  getDisbursementHistory,
  donate,
  registerRecipient,
  disburse,
  formatXlm
} from './stellar'
import { ADMIN_ADDRESS, STELLAR_EXPERT_URL } from './config'
import {
  Heart,
  History,
  UserPlus,
  ArrowRight,
  ExternalLink,
  Lock,
  RefreshCw,
  LogOut,
  Wallet,
  Coins,
  CheckCircle,
  AlertTriangle,
  Users
} from 'lucide-react'

export default function App() {
  const {
    address,
    connecting,
    walletError,
    setWalletError,
    connect,
    disconnect,
    signTransaction
  } = useWallet()

  // Tab views: 'donor' or 'admin'
  const [activeTab, setActiveTab] = useState('donor')

  // Balances
  const [walletBalance, setWalletBalance] = useState('0.00')
  const [fundBalance, setFundBalance] = useState('0.00')

  // Lists
  const [recipients, setRecipients] = useState([])
  const [history, setHistory] = useState([])

  // Form Inputs
  const [donateAmount, setDonateAmount] = useState('')
  const [newRecipientAddr, setNewRecipientAddr] = useState('')
  const [newRecipientName, setNewRecipientName] = useState('')
  const [disburseRecipient, setDisburseRecipient] = useState('')
  const [disburseAmount, setDisburseAmount] = useState('')

  // Tx Status State
  const [txStage, setTxStage] = useState(null) // 'Preparing' | 'Signing' | 'Submitting' | 'Pending' | 'Success' | 'Failed'
  const [txHash, setTxHash] = useState(null)
  const [txError, setTxError] = useState(null)

  // Fetch all on-chain data
  const refreshData = useCallback(async () => {
    // 1. Contract Balance
    const fBalance = await getFundBalance()
    setFundBalance(formatXlm(fBalance, 4))

    // 2. Recipients
    const rList = await getRecipients()
    setRecipients(rList)

    // 3. Disbursement History
    const hList = await getDisbursementHistory()
    setHistory(hList)

    // 4. Wallet Balance (if connected)
    if (address) {
      const wBalance = await getWalletBalance(address)
      setWalletBalance(Number(wBalance).toFixed(4))
    }
  }, [address])

  // Polling every 5 seconds
  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 5000)
    return () => clearInterval(interval)
  }, [refreshData])

  // Clear inputs helper
  const clearInputs = () => {
    setDonateAmount('')
    setNewRecipientAddr('')
    setNewRecipientName('')
    setDisburseRecipient('')
    setDisburseAmount('')
  }

  // Handle donation
  const handleDonate = async (e) => {
    e.preventDefault()
    if (!address) return
    setWalletError(null)
    setTxError(null)
    setTxHash(null)
    setTxStage('Preparing')

    try {
      // 1. Gas/Balance pre-check: Check if donor's wallet has enough XLM
      const wBal = await getWalletBalance(address)
      if (Number(wBal) < Number(donateAmount)) {
        throw Object.assign(new Error('Your wallet has insufficient balance to cover this donation.'), { code: 'INSUFFICIENT_BALANCE' })
      }

      await donate({
        donorAddress: address,
        amountXlm: donateAmount,
        signTransaction,
        onStatus: ({ stage, hash }) => {
          setTxStage(stage)
          if (hash) setTxHash(hash)
        }
      })
      
      setTxStage('Success')
      clearInputs()
      refreshData()
    } catch (err) {
      console.error('Donate error:', err)
      setTxStage('Failed')
      setTxError(err.message || String(err))
    }
  }

  // Handle register recipient
  const handleRegisterRecipient = async (e) => {
    e.preventDefault()
    if (!address) return
    setWalletError(null)
    setTxError(null)
    setTxHash(null)
    setTxStage('Preparing')

    try {
      await registerRecipient({
        adminAddress: address,
        recipientAddress: newRecipientAddr,
        nameOrId: newRecipientName,
        signTransaction,
        onStatus: ({ stage, hash }) => {
          setTxStage(stage)
          if (hash) setTxHash(hash)
        }
      })

      setTxStage('Success')
      clearInputs()
      refreshData()
    } catch (err) {
      console.error('Register recipient error:', err)
      setTxStage('Failed')
      setTxError(err.message || String(err))
    }
  }

  // Handle disburse aid
  const handleDisburse = async (e) => {
    e.preventDefault()
    if (!address) return
    setWalletError(null)
    setTxError(null)
    setTxHash(null)
    setTxStage('Preparing')

    try {
      // 1. Pre-check: Ensure Relief Fund has sufficient balance to disburse
      const fBalance = await getFundBalance()
      const fBalanceXlm = Number(fBalance) / 10_000_000
      if (fBalanceXlm < Number(disburseAmount)) {
        throw Object.assign(new Error('The Relief Fund does not have enough balance to fulfill this disbursement.'), { code: 'INSUFFICIENT_FUND_BALANCE' })
      }

      await disburse({
        adminAddress: address,
        recipientAddress: disburseRecipient,
        amountXlm: disburseAmount,
        signTransaction,
        onStatus: ({ stage, hash }) => {
          setTxStage(stage)
          if (hash) setTxHash(hash)
        }
      })

      setTxStage('Success')
      clearInputs()
      refreshData()
    } catch (err) {
      console.error('Disburse error:', err)
      setTxStage('Failed')
      setTxError(err.message || String(err))
    }
  }

  // Check if current connected user is the registered admin/org
  const isAdmin = address === ADMIN_ADDRESS

  // Steps tracker UI stages
  const getStepClass = (stepStage) => {
    const stages = ['Preparing', 'Signing', 'Submitting', 'Pending', 'Success']
    const currentIdx = stages.indexOf(txStage)
    const stepIdx = stages.indexOf(stepStage)

    if (txStage === 'Failed') return 'tx-step' // default
    if (currentIdx === stepIdx) return 'tx-step active'
    if (currentIdx > stepIdx) return 'tx-step completed'
    return 'tx-step'
  }

  return (
    <div className="container">
      {/* HEADER SECTION */}
      <header className="header">
        <div className="brand">
          <Coins className="brand-icon" />
          <div>
            <h1 className="brand-title">Disaster Relief Rail</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Direct, Transparent Aid Disbursement</p>
          </div>
        </div>

        <div>
          {address ? (
            <button className="btn-wallet connected" onClick={disconnect}>
              <Wallet size={16} />
              <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
              <LogOut size={14} style={{ marginLeft: '4px' }} />
            </button>
          ) : (
            <button className="btn-wallet" onClick={connect} disabled={connecting}>
              <Wallet size={16} />
              <span>{connecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ERROR MESSAGE NOTIFICATION */}
      {walletError && (
        <div className="alert alert-error">
          <AlertTriangle className="alert-icon" />
          <div>
            <p style={{ fontWeight: 600 }}>Wallet Error</p>
            <p>{walletError}</p>
          </div>
        </div>
      )}

      {/* DASHBOARD GRID */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: INTERACTION PANELS */}
        <main className="left-column" style={{ display: 'flex', flex2: 1.2, flexDirection: 'column', gap: '2rem' }}>
          
          {/* AVAILABLE FUNDS DISPLAY */}
          <section className="card funds-display">
            <h2 className="funds-title">Active Relief Fund Balance</h2>
            <p className="funds-amount">
              {fundBalance} <span className="funds-symbol">XLM</span>
            </p>
            <div className="funds-info">
              <RefreshCw size={14} className="spin-on-update" />
              <span>Synced live with Soroban Testnet ReliefFund Contract</span>
            </div>
            {address && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Available Relief Funds (Your Wallet Balance):</span>
                <strong style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.1rem' }}>{walletBalance} XLM</strong>
              </div>
            )}
          </section>

          {/* VIEW SWITCHING TABS */}
          <nav className="tabs-nav">
            <button 
              className={`tab-btn ${activeTab === 'donor' ? 'active' : ''}`}
              onClick={() => setActiveTab('donor')}
            >
              <Heart size={16} />
              <span>Donor Portal</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Lock size={16} />
              <span>Admin Organization Portal</span>
            </button>
          </nav>

          {/* DONOR TAB VIEW */}
          {activeTab === 'donor' && (
            <section className="card">
              <h3 className="card-title"><Heart size={20} className="accent-color" style={{ color: 'var(--primary)' }} /> Make a Direct Donation</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Donated funds flow securely into the transparent Soroban contract, ready to be disbursed directly to registered aid recipients without middlemen.
              </p>

              {!address ? (
                <div className="empty-placeholder">
                  <Wallet className="empty-icon" />
                  <p>Please connect your wallet to make a donation.</p>
                  <button className="btn btn-primary" onClick={connect} style={{ maxWidth: '200px', marginTop: '0.5rem' }}>Connect Wallet</button>
                </div>
              ) : (
                <form onSubmit={handleDonate}>
                  <div className="form-group">
                    <label className="form-label">Donation Amount (XLM)</label>
                    <input 
                      type="number" 
                      step="0.0001" 
                      min="0.0001" 
                      required
                      placeholder="e.g. 50" 
                      className="form-input"
                      value={donateAmount}
                      onChange={(e) => setDonateAmount(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <span>Donate to Relief Fund</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </section>
          )}

          {/* ADMIN/ORGANIZATION TAB VIEW */}
          {activeTab === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* ADMIN LOCK NOTICE */}
              {address && !isAdmin && (
                <div className="alert alert-info">
                  <Lock className="alert-icon" />
                  <div>
                    <p style={{ fontWeight: 600 }}>Viewing Mode Only</p>
                    <p>Your connected wallet is not the authorized Admin Organization. Admin tools will fail simulation.</p>
                  </div>
                </div>
              )}

              {/* REGISTER RECIPIENT */}
              <section className="card">
                <h3 className="card-title"><UserPlus size={20} style={{ color: 'var(--primary)' }} /> Register Verified Recipient</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Register verified recipient wallet addresses to make them eligible for relief payouts. Only the Admin can invoke this.
                </p>

                {!address ? (
                  <div className="empty-placeholder">
                    <Wallet className="empty-icon" />
                    <p>Connect your admin wallet to register recipients.</p>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterRecipient}>
                    <div className="form-group">
                      <label className="form-label">Recipient Wallet Address (G...)</label>
                      <input 
                        type="text" 
                        required
                        pattern="G[A-Z0-9]{55}"
                        placeholder="G..." 
                        className="form-input"
                        value={newRecipientAddr}
                        onChange={(e) => setNewRecipientAddr(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Recipient ID or Name (Publicly Auditable)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Recipient-087 / Alice" 
                        className="form-input"
                        value={newRecipientName}
                        onChange={(e) => setNewRecipientName(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={!isAdmin}>
                      <span>Register Recipient</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}
              </section>

              {/* DISBURSE AID */}
              <section className="card">
                <h3 className="card-title"><Coins size={20} style={{ color: 'var(--primary)' }} /> Disburse Aid to Recipient</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Distribute funds directly from the smart contract to a registered recipient. Requires sufficient contract balance.
                </p>

                {!address ? (
                  <div className="empty-placeholder">
                    <Wallet className="empty-icon" />
                    <p>Connect your admin wallet to disburse aid.</p>
                  </div>
                ) : (
                  <form onSubmit={handleDisburse}>
                    <div className="form-group">
                      <label className="form-label">Select Verified Recipient</label>
                      <select 
                        required
                        className="form-input"
                        value={disburseRecipient}
                        onChange={(e) => setDisburseRecipient(e.target.value)}
                        style={{ background: 'rgba(0, 0, 0, 0.4)', cursor: 'pointer' }}
                      >
                        <option value="" disabled>-- Select a registered recipient --</option>
                        {recipients.map((r, i) => (
                          <option key={i} value={r.recipient}>
                            {r.nameOrId} ({r.recipient.slice(0, 6)}...{r.recipient.slice(-4)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Disbursement Amount (XLM)</label>
                      <input 
                        type="number" 
                        step="0.0001" 
                        min="0.0001" 
                        required
                        placeholder="e.g. 100" 
                        className="form-input"
                        value={disburseAmount}
                        onChange={(e) => setDisburseAmount(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={!isAdmin || recipients.length === 0}>
                      <span>Send Direct Aid Payment</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}
              </section>
            </div>
          )}
        </main>

        {/* RIGHT COLUMN: HISTORY FEED & AUDIT TRAIL */}
        <aside className="right-column" style={{ display: 'flex', flex2: 0.8, flexDirection: 'column', gap: '2rem' }}>
          
          {/* VERIFIED RECIPIENTS PANEL */}
          <section className="card">
            <h3 className="card-title"><Users size={18} style={{ color: 'var(--primary)' }} /> Verified Recipients</h3>
            {recipients.length === 0 ? (
              <div className="empty-placeholder" style={{ padding: '2rem 1rem' }}>
                <Users className="empty-icon" style={{ width: '2rem', height: '2rem' }} />
                <p style={{ fontSize: '0.85rem' }}>No recipients registered yet.</p>
              </div>
            ) : (
              <div className="recipients-list">
                {recipients.map((r, i) => (
                  <div key={i} className="recipient-item">
                    <div className="item-left">
                      <span className="item-title">{r.nameOrId}</span>
                      <span className="item-subtitle">{r.recipient}</span>
                    </div>
                    <div className="item-right">
                      <span className="brand-tag" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* DISBURSEMENT HISTORY FEED */}
          <section className="card">
            <h3 className="card-title"><History size={18} style={{ color: 'var(--primary)' }} /> Disbursement History Feed</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              Public ledger records of all direct payments made from this Relief Fund. Click a recipient to audit on Stellar Expert.
            </p>

            {history.length === 0 ? (
              <div className="empty-placeholder">
                <History className="empty-icon" />
                <p>No disbursements recorded yet.</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((h, i) => {
                  const recipientInfo = recipients.find(r => r.recipient === h.recipient)
                  const displayName = recipientInfo ? recipientInfo.nameOrId : 'Registered Recipient'
                  return (
                    <a 
                      key={i} 
                      href={`${STELLAR_EXPERT_URL}/contract/${h.recipient}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="history-item"
                    >
                      <div className="item-left">
                        <span className="item-title">{displayName}</span>
                        <span className="item-subtitle">{h.recipient.slice(0, 10)}...{h.recipient.slice(-10)}</span>
                      </div>
                      <div className="item-right">
                        <span className="amount-display negative">
                          -{formatXlm(h.amount, 2)} XLM
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          Audit Trail <ExternalLink size={8} />
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* TRANSACTION PROGRESS MODAL */}
      {txStage && (
        <div className="tx-modal-overlay">
          <div className="tx-modal">
            {txStage === 'Success' ? (
              <CheckCircle size={48} style={{ color: 'var(--success)', margin: '0 auto 1.5rem' }} />
            ) : txStage === 'Failed' ? (
              <AlertTriangle size={48} style={{ color: 'var(--error)', margin: '0 auto 1.5rem' }} />
            ) : (
              <div className="tx-spinner" />
            )}

            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              {txStage === 'Success' 
                ? 'Transaction Success!' 
                : txStage === 'Failed' 
                  ? 'Transaction Failed' 
                  : 'Processing Transaction'}
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {txStage === 'Preparing' && 'Generating and simulating contract operation...'}
              {txStage === 'Signing' && 'Awaiting transaction signature in your wallet...'}
              {txStage === 'Submitting' && 'Broadcasting transaction to Stellar nodes...'}
              {txStage === 'Pending' && 'Waiting for ledger consensus and validation...'}
              {txStage === 'Success' && 'The operation confirmed successfully on-chain!'}
              {txStage === 'Failed' && (txError || 'An unexpected error occurred during execution.')}
            </p>

            {/* Stages steps tracker */}
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
                >
                  <span>Tx Hash: {txHash.slice(0, 8)}...{txHash.slice(-8)}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {(txStage === 'Success' || txStage === 'Failed') && (
              <button 
                className="btn" 
                onClick={() => { setTxStage(null); setTxError(null); setTxHash(null); }}
                style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid var(--border-muted)', marginTop: '2rem' }}
              >
                Close Panel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
