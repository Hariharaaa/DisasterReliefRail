import { rpc, scValToNative } from '@stellar/stellar-sdk';

const FUND_CONTRACT_ID = 'CBRXCUSDHECQWR3VWWNIOJ3NJXLGIJAXXXBFDKEOUSVUXAVJHHKKRGQQ';
const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');

async function testEvents() {
  try {
    const latestLedger = await rpcServer.getLatestLedger();
    console.log('Latest ledger:', latestLedger.sequence);
    
    const startLedger = latestLedger.sequence - 1000;
    
    const response = await rpcServer.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [FUND_CONTRACT_ID]
        }
      ],
      limit: 10
    });
    
    console.log('Events found:', response.events.length);
    response.events.forEach(e => {
      console.log('Event topic 1 (name):', e.topic[0] ? scValToNative(e.topic[0]) : null);
      console.log('Event data:', e.value ? scValToNative(e.value) : null);
    });
  } catch (err) {
    console.error('Error fetching events:', err);
  }
}

testEvents();
