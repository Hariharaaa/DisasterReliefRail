import { getDisbursementHistory, getRecipients } from './src/stellar.js';
async function test() {
  console.log('Fetching History...');
  const h = await getDisbursementHistory();
  console.log('History:', JSON.stringify(h, null, 2));
  const r = await getRecipients();
  console.log('Recipients:', JSON.stringify(r, null, 2));
}
test();
