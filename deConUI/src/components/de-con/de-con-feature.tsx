'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useDeConProgram } from './de-con-data-access'
import { DeConCreate, DeConList } from './de-con-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'

export default function DeConFeature() {
  const { publicKey } = useWallet()
  const { programId } = useDeConProgram()

  return publicKey ? (
    <div>
      <AppHero
        title="DeCon"
        subtitle={
          'Create a new account by clicking the "Create" button. The state of a account is stored on-chain and can be manipulated by calling the program\'s methods (increment, decrement, set, and close).'
        }
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        <DeConCreate />
      </AppHero>
      <DeConList />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}
