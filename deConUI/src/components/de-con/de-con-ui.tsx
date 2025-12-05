'use client'

import { Keypair, PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useDeConProgram, useDeConProgramAccount } from './de-con-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as anchor from '@coral-xyz/anchor'

import { useWallet } from '@solana/wallet-adapter-react'

import { useState } from 'react';



export function DeConCreate() {
  const { askQuestion } = useDeConProgram()
  const { wallet } = useWallet()

  const [open, setOpen] = useState(false);

  const [questionText, setQuestionText] = useState("");
  const [description, setDescription] = useState("");
  const [funds, setFunds] = useState("");

  const [questionKeypair, setQuestionKeypair] = useState<Keypair | null>(null);

  const resetForm = () => {
    setQuestionText("");
    setDescription("");
    setFunds("");
    setQuestionKeypair(null);
  };

  const handleSubmit = async () => {
    if (!questionText || !description || !funds) {
      alert("All fields are required");
      return;
    }
    const guestionKeypair = questionKeypair ?? Keypair.generate();

    const payload = {
      wallet: wallet!,
      questionKeypair: guestionKeypair,
      questionText,
      description: description,
      fund: new anchor.BN(parseFloat(funds)),
      dateResolved: new anchor.BN(0),
      imgUrl: "",
      taskId: 0,
    };

    await askQuestion.mutateAsync(payload);

    setOpen(false);
    resetForm();
  };

  return (
    <div className="mb-4">
      
      <Button
        onClick={() => {
          setQuestionKeypair(Keypair.generate());
          setOpen(true);
        }}
        disabled={askQuestion.isPending}
      >
        Create {askQuestion.isPending && "..."}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Question</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Question</Label>
              <Input
                placeholder="What will BTC price be on Jan 1?"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                placeholder="Longer description or context"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Label>Funding Amount (SOL)</Label>
              <Input
                type="number"
                placeholder="0.1"
                value={funds}
                onChange={(e) => setFunds(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={askQuestion.isPending}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function DeConList() {
  const { accounts, getProgramAccount } = useDeConProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <DeConCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  )
}

function DeConCard({ account }: { account: PublicKey }) {
  const { wallet } = useWallet()
  const { accountQuery, placeBetMutation, payoutMutation } = useDeConProgramAccount({
    account,
  })
  const questionText = useMemo(() => accountQuery.data?.question ?? 0, [accountQuery.data?.question])
  const questionDescription = useMemo(() => accountQuery.data?.description ?? '', [accountQuery.data?.description])

  const [placeOpen, setPlaceOpen] = useState(false)
  const [placeAmount, setPlaceAmount] = useState('')
  const [placeAnswer, setPlaceAnswer] = useState<'yes' | 'no'>('yes')

  const [payoutOpen, setPayoutOpen] = useState(false)
  const [payoutBetPubkey, setPayoutBetPubkey] = useState('')

  const onSubmitPlaceBet = async () => {
    const amount = parseFloat(placeAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Enter a valid amount')
      return
    }
    const answer = placeAnswer === 'yes'
    const betKeypair = Keypair.generate()
    const payload = {
      wallet: wallet!,
      betKeypair: betKeypair,
      answer: answer,
      amount: amount
    };

    await placeBetMutation.mutateAsync(payload)
    setPlaceOpen(false)
    setPlaceAmount('')
    setPlaceAnswer('yes')
  }

  const onSubmitPayout = async () => {
    if (!payoutBetPubkey) {
      alert('Enter bet account public key')
      return
    }
    try {
      const betPub = new PublicKey(payoutBetPubkey)
      // mutation only needs the publicKey for the account in this codepath
      const fakeKeypair = { publicKey: betPub } as unknown as Keypair
      await payoutMutation.mutateAsync({ betKeypair: fakeKeypair })
      setPayoutOpen(false)
      setPayoutBetPubkey('')
    } catch (err) {
      alert('Invalid public key')
    }
  }

  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{questionText}</CardTitle>
          <CardDescription>
            {questionDescription}
            Account: <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">

            <Button
              variant="outline"
              onClick={() => setPlaceOpen(true)}
              disabled={placeBetMutation.isPending}
            >
              Place Bet
            </Button>

            <Button
              variant="outline"
              onClick={() => setPayoutOpen(true)}
              disabled={payoutMutation.isPending}
            >
              Payout
            </Button>

          </div>
        </CardContent>
      </Card>

      {/* Place Bet Dialog */}
      <Dialog open={placeOpen} onOpenChange={setPlaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Bet</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Answer</Label>
              <div className="flex gap-2 mt-2">
                <button
                  className={`btn ${placeAnswer === 'yes' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPlaceAnswer('yes')}
                >
                  Yes
                </button>
                <button
                  className={`btn ${placeAnswer === 'no' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPlaceAnswer('no')}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <Label>Amount (SOL)</Label>
              <Input
                type="number"
                placeholder="0.1"
                value={placeAmount}
                onChange={(e) => setPlaceAmount(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onSubmitPlaceBet} disabled={placeBetMutation.isPending}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Dialog */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payout</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Bet Account Public Key</Label>
              <Input
                placeholder="Enter bet account public key"
                value={payoutBetPubkey}
                onChange={(e) => setPayoutBetPubkey(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onSubmitPayout} disabled={payoutMutation.isPending}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
