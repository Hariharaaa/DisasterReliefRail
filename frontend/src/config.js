export const NETWORK = {
  name: 'testnet',
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  friendbotUrl: 'https://friendbot.stellar.org',
}

// RecipientRegistry contract ID (Contract B)
export const REGISTRY_CONTRACT_ID = 'CASCLD3F7MDSFWYKE55G7ELYWTCHE5PR3PUUWSNFBYE24I2ZVL3EQQ7Z'

// ReliefFund contract ID (Contract A)
export const FUND_CONTRACT_ID = 'CCOVECQML366A4MIAFAWDMO6XAMJRDWIYMHFUOAQFH57CPSYODFNX3T4'

// Native XLM SAC contract address on Testnet
export const XLM_CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'

// Admin/Org address (must match the address that initialized the contract)
export const ADMIN_ADDRESS = 'GAGQNYTIAVTZP6U3GOW3TUZ344UFOEKNZGRC6E2TWZ22PGAPL56Y3WRT'

export const STELLAR_EXPERT_URL = 'https://stellar.expert/explorer/testnet'

// Recipient Max Disbursement Cap in XLM
export const MAX_DISBURSEMENT_CAP = 500
export const MAX_DISBURSEMENT_CAP_STROOPS = 5_000_000_000n
