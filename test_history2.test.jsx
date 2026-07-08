import { describe, it } from 'vitest'
import { getRecipients } from './src/stellar.js'

describe('History Fetching', () => {
  it('fetches recipients successfully', async () => {
    const r = await getRecipients()
    console.log('RECIPIENTS DUMP:', r)
  })
})
