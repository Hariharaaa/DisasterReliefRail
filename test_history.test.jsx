import { describe, it } from 'vitest'
import { getDisbursementHistory, getRecipients } from './src/stellar.js'

describe('History Fetching', () => {
  it('fetches history successfully', async () => {
    const h = await getDisbursementHistory()
    console.log('HISTORY DUMP:', h)
  })
})
