// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import CounterIDL from '../target/idl/counter.json'
import DeConIDL from '../../../de-con/target/idl/de_con.json'
import type { DeCon } from '../../../de-con/target/types/de_con'
import type { Counter } from '../target/types/counter'

// Re-export the generated IDL and type
export { Counter, CounterIDL }

// The programId is imported from the program IDL.
export const COUNTER_PROGRAM_ID = new PublicKey(CounterIDL.address)
export const DECON_PROGRAM_ID = new PublicKey(DeConIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getCounterProgram(provider: AnchorProvider, address?: PublicKey): Program<Counter> {
  return new Program({ ...CounterIDL, address: address ? address.toBase58() : CounterIDL.address } as Counter, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getCounterProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('Count3AcZucFDPSFBAeHkQ6AvttieKUkyJ8HiQGhQwe')
    case 'mainnet-beta':
    default:
      return COUNTER_PROGRAM_ID
  }
}

// This is a helper function to get the Counter Anchor program.
export function getDeConProgram(provider: AnchorProvider, address?: PublicKey): Program<DeCon> {
  return new Program({ ...DeConIDL, address: address ? address.toBase58() : DeConIDL.address } as DeCon, provider)
}

// This is a helper function to get the program ID for the DeCon program depending on the cluster.
export function getDeConProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the DeCon program on devnet and testnet.
      return DECON_PROGRAM_ID
    case 'mainnet-beta':
    default:
      return DECON_PROGRAM_ID
  }
}
