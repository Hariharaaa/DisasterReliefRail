import { simulateContractCall, xlmToStroops } from './src/stellar.js'
import { FUND_CONTRACT_ID, ADMIN_ADDRESS } from './src/config.js'
import * as StellarSdk from '@stellar/stellar-sdk'

const { nativeToScVal } = StellarSdk

async function test() {
  try {
    const adminAddress = ADMIN_ADDRESS;
    const recipientAddress = ADMIN_ADDRESS; // We know this recipient is registered
    const amountStroops = xlmToStroops("10"); // Try 10 XLM
    
    console.log('Simulating disburse...');
    const sim = await simulateContractCall(FUND_CONTRACT_ID, 'disburse', [
      nativeToScVal(adminAddress, { type: 'address' }),
      nativeToScVal(recipientAddress, { type: 'address' }),
      nativeToScVal(amountStroops, { type: 'i128' })
    ]);
    console.log('Simulation success:', sim.result);
  } catch (err) {
    console.error('Simulation failed:', err);
  }
}
test();
