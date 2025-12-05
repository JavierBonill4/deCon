import "dotenv/config";
export const CONFIG = {
    SOLANA_RPC: "https://api.devnet.solana.com",
  
    // replace with your program ID
    PROGRAM_ID: "61oxCTFdcrLTPFjEhjSQkthjpaCvukRBvVGG342sxfMa",
  
    // UMA development chain = Sepolia
    UMA_RPC: "https://rpc.ankr.com/eth_sepolia",
  
    // UMA OOv3 Address on Sepolia
    UMA_OOV3_ADDRESS: "0x9923D42eF695B5dd9911D05Ac944d4cAca3c4EAB",    // I'll give exact address if you want
  
    RELAYER_ETH_PRIVATE_KEY: process.env.ETH_PRIV_KEY!,
    SOLANA_KEYPAIR_PATH: "/Users/javier/.config/solana/id.json",
  };