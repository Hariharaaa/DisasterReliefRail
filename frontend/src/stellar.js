import * as StellarSdk from '@stellar/stellar-sdk'
import { NETWORK, FUND_CONTRACT_ID, REGISTRY_CONTRACT_ID } from './config'

const { rpc, Contract, TransactionBuilder, nativeToScVal, scValToNative } = StellarSdk

const rpcServer = new rpc.Server(NETWORK.rpcUrl, { allowHttp: false })

/**
 * Fetch native XLM balance of a wallet from Horizon.
 */
export async function getWalletBalance(address) {
  try {
    const res = await fetch(`${NETWORK.horizonUrl}/accounts/${address}`)
    if (!res.ok) {
      if (res.status === 404) return '0.0000'
      throw new Error(`Horizon error: ${res.statusText}`)
    }
    const data = await res.json()
    const native = data.balances.find(b => b.asset_type === 'native')
    return native ? native.balance : '0.0000'
  } catch (e) {
    console.error('Error fetching wallet balance:', e)
    return '0.0000'
  }
}

/**
 * Simulate a contract call and return the result value.
 */
export async function simulateContractCall(contractId, method, args = []) {
  const dummyAddress = 'GDYY6I6B64HD6JSK2SB72LQOL26ILWDPS4GAW66KE6TGJUUYDHCODGH5'
  const account = await rpcServer.getAccount(dummyAddress)
    .catch(() => ({
      accountId: () => dummyAddress,
      sequenceNumber: () => '0',
      incrementSequenceNumber: () => {}
    }))

  const contract = new Contract(contractId)
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const simResult = await rpcServer.simulateTransaction(tx)
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`)
  }
  return simResult
}

/**
 * Build, simulate, sign, and submit a contract invocation.
 */
export async function invokeContract({ contractId, method, args = [], sourceAddress, signTransaction, onStatus }) {
  onStatus?.({ stage: 'Preparing' })

  // Get source account
  let account
  try {
    account = await rpcServer.getAccount(sourceAddress)
  } catch (e) {
    if (e.message?.includes('404') || e.message?.includes('not found')) {
      throw Object.assign(new Error('Account not found on testnet. Fund it via Friendbot first.'), { code: 'ACCOUNT_NOT_FOUND' })
    }
    throw Object.assign(new Error('Network error: ' + e.message), { code: 'NETWORK_ERROR' })
  }

  const contract = new Contract(contractId)
  const tx = new TransactionBuilder(account, {
    fee: '1000',
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build()

  // Simulate to get footprint + resource estimates
  let simResult
  try {
    simResult = await rpcServer.simulateTransaction(tx)
  } catch (e) {
    throw Object.assign(new Error('Simulation failed: ' + e.message), { code: 'SIMULATION_FAILED' })
  }

  if (rpc.Api.isSimulationError(simResult)) {
    const errMsg = simResult.error || 'Contract execution reverted'
    
    // Parse contract custom panics
    if (errMsg.includes('recipient already registered')) {
      throw Object.assign(new Error('Registration failed: Recipient is already registered.'), { code: 'ALREADY_REGISTERED' })
    }
    if (errMsg.includes('not authorized: not the admin')) {
      throw Object.assign(new Error('Authorization failed: Only the Admin organization can perform this action.'), { code: 'NOT_AUTHORIZED' })
    }
    if (errMsg.includes('recipient is not registered') || errMsg.includes('recipient is not eligible')) {
      throw Object.assign(new Error('Disbursement failed: Recipient is not eligible or not registered.'), { code: 'NOT_ELIGIBLE' })
    }
    if (errMsg.includes('disbursement cap exceeded')) {
      throw Object.assign(new Error('Disbursement failed: Cumulative payout exceeds the maximum cap per recipient.'), { code: 'CAP_EXCEEDED' })
    }
    if (errMsg.includes('insufficient fund balance')) {
      throw Object.assign(new Error('Disbursement failed: Insufficient Relief Fund contract balance.'), { code: 'INSUFFICIENT_FUND_BALANCE' })
    }
    if (errMsg.includes('donation amount must be positive') || errMsg.includes('disbursement amount must be positive')) {
      throw Object.assign(new Error('Amount must be greater than zero.'), { code: 'INVALID_AMOUNT' })
    }
    
    throw Object.assign(new Error('Contract error: ' + errMsg), { code: 'CONTRACT_ERROR' })
  }

  // Assemble transaction with simulation data (adds auth + footprint)
  const preparedTx = rpc.assembleTransaction(tx, simResult).build()

  // Sign
  onStatus?.({ stage: 'Signing' })
  let signedXdr
  try {
    signedXdr = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase: NETWORK.networkPassphrase,
      network: NETWORK.name.toUpperCase(),
      address: sourceAddress,
    })
  } catch (e) {
    if (e.message?.includes('rejected') || e.message?.includes('cancel') || e.message?.includes('denied') || e.code === 'USER_REJECTED') {
      throw Object.assign(new Error('Action cancelled — you rejected the request in your wallet'), { code: 'USER_REJECTED' })
    }
    throw Object.assign(new Error('Signing error: ' + e.message), { code: 'SIGNING_ERROR' })
  }

  // Submit
  onStatus?.({ stage: 'Submitting' })
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK.networkPassphrase)
  let sendResult
  try {
    sendResult = await rpcServer.sendTransaction(signedTx)
  } catch (e) {
    throw Object.assign(new Error('Network submission failed: ' + e.message), { code: 'SUBMISSION_FAILED' })
  }

  if (sendResult.status === 'ERROR') {
    throw Object.assign(new Error('Transaction rejected by network: ' + JSON.stringify(sendResult.errorResult)), { code: 'TX_ERROR' })
  }

  // Poll for confirmation
  onStatus?.({ stage: 'Pending', hash: sendResult.hash })
  const confirmedTx = await pollTransaction(sendResult.hash, onStatus)

  onStatus?.({ stage: 'Success', hash: sendResult.hash })
  return { hash: sendResult.hash, result: confirmedTx }
}

async function pollTransaction(hash, onStatus, maxAttempts = 30, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    const result = await rpcServer.getTransaction(hash)
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return result
    }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw Object.assign(new Error('Transaction failed on-chain'), { code: 'TX_FAILED_ON_CHAIN' })
    }
    onStatus?.({ stage: 'Pending', hash, attempt: i + 1 })
  }
  throw Object.assign(new Error('Transaction confirmation timed out after ' + maxAttempts + ' attempts'), { code: 'TIMEOUT' })
}

// ── Recipient Registry Read Operations ────────────────────────────────────────

/**
 * Get recipient list from Registry
 */
export async function getRecipientList() {
  try {
    const sim = await simulateContractCall(REGISTRY_CONTRACT_ID, 'get_recipient_list', [])
    const val = sim.result?.retval
    if (!val) return []
    return scValToNative(val)
  } catch (e) {
    console.error('getRecipientList error:', e)
    return []
  }
}

/**
 * Get recipient info from Registry
 */
export async function getRecipientInfo(recipientAddress) {
  try {
    const args = [nativeToScVal(recipientAddress, { type: 'address' })]
    const sim = await simulateContractCall(REGISTRY_CONTRACT_ID, 'get_recipient_info', args)
    const val = sim.result?.retval
    if (!val) return null
    const raw = scValToNative(val)
    return {
      region: raw.region,
      verificationId: raw.verification_id,
      totalReceived: BigInt(raw.total_received),
      verified: raw.verified
    }
  } catch (e) {
    console.error('getRecipientInfo error:', e)
    return null
  }
}

/**
 * Aggregated helper to fetch all recipients with details in a single RPC call
 */
export async function getRecipients() {
  try {
    const sim = await simulateContractCall(REGISTRY_CONTRACT_ID, 'get_all_recipients', [])
    const val = sim.result?.retval
    if (!val) return []
    return scValToNative(val).map(r => ({
      recipient: r.address,
      region: r.region,
      verificationId: r.verification_id,
      totalReceived: BigInt(r.total_received),
      verified: r.verified
    }))
  } catch (e) {
    console.error('getRecipients error:', e)
    return []
  }
}

// ── Relief Fund Read Operations ──────────────────────────────────────────────

/**
 * Fetch total fund balance (in stroops, as BigInt)
 */
export async function getFundBalance() {
  try {
    const sim = await simulateContractCall(FUND_CONTRACT_ID, 'get_fund_balance', [])
    const val = sim.result?.retval
    if (!val) return 0n
    return BigInt(scValToNative(val))
  } catch (e) {
    console.error('getFundBalance error:', e)
    return 0n
  }
}

/**
 * Fetch disbursement history from Fund
 */
export async function getDisbursementHistory() {
  try {
    const sim = await simulateContractCall(FUND_CONTRACT_ID, 'get_disbursement_history', [])
    const val = sim.result?.retval
    if (!val) return []
    return scValToNative(val).map(d => ({
      recipient: d.recipient,
      amount: BigInt(d.amount)
    }))
  } catch (e) {
    console.error('getDisbursementHistory error:', e)
    return []
  }
}

// ── Contract Write Operations ─────────────────────────────────────────────────

/**
 * Donate XLM to the Relief Fund
 */
export async function donate({ donorAddress, amountXlm, signTransaction, onStatus }) {
  const amountStroops = xlmToStroops(amountXlm)
  return invokeContract({
    contractId: FUND_CONTRACT_ID,
    method: 'donate',
    args: [
      nativeToScVal(donorAddress, { type: 'address' }),
      nativeToScVal(amountStroops, { type: 'i128' }),
    ],
    sourceAddress: donorAddress,
    signTransaction,
    onStatus
  })
}

/**
 * Register a verified recipient in Registry
 */
export async function registerRecipient({ adminAddress, recipientAddress, region, verificationId, signTransaction, onStatus }) {
  return invokeContract({
    contractId: REGISTRY_CONTRACT_ID,
    method: 'register_recipient',
    args: [
      nativeToScVal(adminAddress, { type: 'address' }),
      nativeToScVal(recipientAddress, { type: 'address' }),
      nativeToScVal(region, { type: 'string' }),
      nativeToScVal(verificationId, { type: 'string' }),
    ],
    sourceAddress: adminAddress,
    signTransaction,
    onStatus
  })
}

/**
 * Disburse funds from Relief Fund (Contract A will cross-call Contract B)
 */
export async function disburse({ adminAddress, recipientAddress, amountXlm, signTransaction, onStatus }) {
  const amountStroops = xlmToStroops(amountXlm)
  return invokeContract({
    contractId: FUND_CONTRACT_ID,
    method: 'disburse',
    args: [
      nativeToScVal(adminAddress, { type: 'address' }),
      nativeToScVal(recipientAddress, { type: 'address' }),
      nativeToScVal(amountStroops, { type: 'i128' }),
    ],
    sourceAddress: adminAddress,
    signTransaction,
    onStatus
  })
}

// ── Unit conversion helpers ────────────────────────────────────────────────────

export function stroopsToXlm(stroops) {
  return Number(stroops) / 10_000_000
}

export function xlmToStroops(xlm) {
  return BigInt(Math.round(Number(xlm) * 10_000_000))
}

export function formatXlm(stroops, decimals = 2) {
  return stroopsToXlm(BigInt(stroops)).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
