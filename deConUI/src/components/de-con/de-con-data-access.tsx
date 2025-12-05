'use client'

import { getDeConProgram, getDeConProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, TransactionMessage, VersionedTransaction, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import * as anchor from '@coral-xyz/anchor';
import { Wallet } from '@solana/wallet-adapter-react';


const TUKTUK_PROGRAM_ID = new PublicKey("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA");
const TASK_QUEUE_KEY = new PublicKey("A7sPoHKnFGYdzrhhUTQfeZZPTvx9DHJVSuyHViDv1Drn");
const TASK_QUEUE_AUTHORITY_KEY = new PublicKey("2WRjX5QKDmKqVgoNeCE4x3gV2WxCExCr71jGP8KmZyZm");
let TASK_ID: number = 0; // The unique ID for the task we are scheduling

const questionText = "Will it rain tomorrow?";
const description = "Short weather prediction";
const fund = new anchor.BN(1000);
const dateResolved = new anchor.BN(Math.floor(new Date("2025-12-6T00:00:00Z").getTime() / 1000));
const imgUrl = "https://example.com/image.png";

const taskKeyFunc = (
  taskQueue: PublicKey,
  id: number,
  programId: PublicKey = TUKTUK_PROGRAM_ID
): [PublicKey, number] => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(id, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("task"), taskQueue.toBuffer(), buf],
    programId
  );
};


export function useDeConProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getDeConProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getDeConProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['DeCon', 'all', { cluster }],
    queryFn: () => program.account.question.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })


  const askQuestion = useMutation({
    mutationKey: ['DeCon', 'askQuestion', { cluster }],
    mutationFn: async (payload: {
      wallet: Wallet,
      questionKeypair: Keypair,
      questionText: string,
      description: string,
      fund: anchor.BN,
      dateResolved: anchor.BN,
      imgUrl: string,
      taskId: number,
    }) => {
  
      // --- FIX #1: Use wallet public key, not program.provider.publicKey ---
      const userPublicKey = payload.wallet.adapter.publicKey!;
      
      // Build the askQuestion instruction
      const ix = await program.methods
        .askQuestion(
          payload.questionText,
          payload.description,
          payload.fund,
          payload.dateResolved,
          payload.imgUrl,
          TASK_ID
        )
        .accounts({
          question: payload.questionKeypair.publicKey,
          user: userPublicKey,                      // <-- FIXED
          taskQueue: TASK_QUEUE_KEY,
          taskQueueAuthority: TASK_QUEUE_AUTHORITY_KEY,
          task: taskKeyFunc(TASK_QUEUE_KEY, TASK_ID)[0],
        })
        // Only NON-wallet signers go here
        .signers([payload.questionKeypair])
        .instruction();
  
      // Latest blockhash
      const latestBlockhash = await connection.getLatestBlockhash();
  
      // Build legacy transaction message
      const messageLegacy = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [ix],
      }).compileToLegacyMessage();
  
      // Convert to versioned transaction
      const tx = new VersionedTransaction(messageLegacy);
  
      // --- Wallet signs ONLY wallet keys ---
      tx.sign([payload.questionKeypair]);

      const signature = await payload.wallet.adapter.sendTransaction(tx, connection);
  
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );
  
      return signature;
    },
  
    onSuccess: async (signature) => {
      transactionToast(signature);
      await accounts.refetch();
    },
  
    onError: () => {
      toast.error("Failed to initialize account");
    },
  });
  
  const askQuestionV2 = useMutation({
    mutationKey: ['DeCon', 'askQuestion', { cluster }],
    mutationFn: async (payload: {
      wallet: Wallet,
      questionKeypair: Keypair,
      questionText: string,
      description: string,
      fund: anchor.BN,
      dateResolved: anchor.BN, // unix seconds
      imgUrl: string,
      taskId: number,
    }) => {
      // Create instructions to send, the askQuestion instruction 
      const instructions = [
        await program.methods.askQuestion(payload.questionText, payload.description, payload.fund, payload.dateResolved, payload.imgUrl, TASK_ID).accounts({
          question: payload.questionKeypair.publicKey,
          user: program.provider.publicKey,
          taskQueue: TASK_QUEUE_KEY,
          taskQueueAuthority: TASK_QUEUE_AUTHORITY_KEY,
          task: taskKeyFunc(TASK_QUEUE_KEY, TASK_ID)[0],
        }).signers([payload.questionKeypair]).instruction(),
      ]

      // Get the latest blockhash to use in our transaction
      const latestBlockhash = await connection.getLatestBlockhash()

      // Create a new TransactionMessage with version and compile it to legacy
      const messageLegacy = new TransactionMessage({
        payerKey: payload.wallet.adapter.publicKey!,
        recentBlockhash: latestBlockhash.blockhash,
        instructions,
      }).compileToLegacyMessage()

      // Create a new VersionedTransaction which supports legacy and v0
      const transaction = new VersionedTransaction(messageLegacy)

       // Send transaction and await for signature
      const signature = await payload.wallet.adapter.sendTransaction(transaction, connection)

      await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')

      return signature

    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await accounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize account')
    },

  })

  const askQuestionV3 = useMutation({
    mutationKey: ['DeCon', 'askQuestion', { cluster }],
    mutationFn: (payload: {
      // keypair: Keypair,
      questionKeypair: Keypair,
      questionText: string,
      description: string,
      fund: anchor.BN,
      dateResolved: anchor.BN, // unix seconds
      imgUrl: string,
      taskId: number,
    }) =>

      program.methods.askQuestion(payload.questionText, payload.description, payload.fund, payload.dateResolved, payload.imgUrl, TASK_ID).accounts({
        question: payload.questionKeypair.publicKey,
        user: program.provider.publicKey,
        taskQueue: TASK_QUEUE_KEY,
        taskQueueAuthority: TASK_QUEUE_AUTHORITY_KEY,
        task: taskKeyFunc(TASK_QUEUE_KEY, TASK_ID)[0],
      }).signers([payload.questionKeypair]).rpc(),
    onSuccess: async (signature) => {
      transactionToast(signature)
      await accounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize account')
    },

  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    askQuestion,
  }
}

export function useDeConProgramAccount({ account }: { account: PublicKey }) {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useDeConProgram()

  const accountQuery = useQuery({
    queryKey: ['DeCon', 'fetch', { cluster, account }],
    queryFn: () => program.account.question.fetch(account),
  })

  const placeBetMutationV2 = useMutation({
    mutationKey: ['DeCon', 'close', { cluster, account }],
    mutationFn: (payload: {
      betKeypair: Keypair,
      answer: boolean,
      amount: number,

    }) => program.methods.placeBet(payload.answer, payload.amount).accounts({
      question: account,
      bet: payload.betKeypair.publicKey,
      user: program.provider.publicKey!,
    }).rpc(),
    onSuccess: async (tx) => {
      transactionToast(tx)
      await accounts.refetch()
    },
  })
  const placeBetMutation = useMutation({
    mutationKey: ['DeCon', 'placeBet', { cluster, account }],
  
    mutationFn: async (payload: {
      wallet: Wallet,
      betKeypair: Keypair,
      answer: boolean,
      amount: number,
    }) => {
      const userPublicKey = payload.wallet.adapter.publicKey!;
      if (!userPublicKey) throw new Error("Wallet not connected");
  
      // ------------------------------
      // Build the instruction
      // ------------------------------
      const ix = await program.methods
        .placeBet(payload.answer, payload.amount)
        .accounts({
          question: account,
          bet: payload.betKeypair.publicKey,
          user: userPublicKey,     // Correct payer
        })
        .instruction();
  
      // ------------------------------
      // Get blockhash
      // ------------------------------
      const latestBlockhash = await connection.getLatestBlockhash();

  
      // ------------------------------
      // Build transaction message
      // ------------------------------
      const msg = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [ix],
      }).compileToLegacyMessage();
  
      const tx = new VersionedTransaction(msg);
  
      // ------------------------------------------------
      // REQUIRED: Sign with the bet keypair BEFORE wallet
      // ------------------------------------------------
      tx.sign([payload.betKeypair]);
  
      // ------------------------------
      // Send through wallet (wallet adds its signature)
      // ------------------------------
      const sig = await payload.wallet.adapter.sendTransaction(tx, connection);
  
      await connection.confirmTransaction(
        { signature: sig, ...latestBlockhash },
        "confirmed"
      );
  
      return sig;
    },
  
    onSuccess: async (sig) => {
      transactionToast(sig);
      await accounts.refetch();
    },
  
    onError: () => {
      toast.error("Failed to place bet");
    },
  });
  
  const payoutMutationV2 = useMutation({
    mutationKey: ['DeCon', 'payout', { cluster, account }],
  
    mutationFn: async (payload: {
      wallet: Wallet,
      betKeypair: Keypair,
    }) => {
      const userPublicKey = payload.wallet.adapter.publicKey!;
      if (!userPublicKey) throw new Error("Wallet not connected");
  
      // ------------------------------
      // Build the instruction
      // ------------------------------
      const ix = await program.methods
        .payout()
        .accounts({
          question: account,
          bet: payload.betKeypair.publicKey,
          user: userPublicKey,
        })
        .instruction();
  
      // ------------------------------
      // Get blockhash
      // ------------------------------
      const latestBlockhash = await connection.getLatestBlockhash();
  
      // ------------------------------
      // Build TransactionMessage
      // ------------------------------
      const msg = new TransactionMessage({
        payerKey: userPublicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [ix],
      }).compileToLegacyMessage();
  
      const tx = new VersionedTransaction(msg);
  
      // ------------------------------------------------
      // Sign with betKeypair BEFORE wallet adds signature
      // ------------------------------------------------
      tx.sign([payload.betKeypair]);
  
      // ------------------------------
      // Wallet signs + sends
      // ------------------------------
      const sig = await payload.wallet.adapter.sendTransaction(tx, connection);
  
      await connection.confirmTransaction(
        { signature: sig, ...latestBlockhash },
        "confirmed"
      );
  
      return sig;
    },
  
    onSuccess: async (sig) => {
      transactionToast(sig);
      await accounts.refetch();
    },
  
    onError: () => {
      toast.error("Failed to payout");
    },
  });
  
  const payoutMutation = useMutation({
    mutationKey: ['DeCon', 'payout', { cluster, account }],
  
    mutationFn: async (payload: { betKeypair: Keypair }) => {
      const questionPubkey = account;
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), questionPubkey.toBuffer()],
        program.programId
      );
  
      return await program.methods
        .payout()
        .accounts({
          question: questionPubkey,
          bet: payload.betKeypair.publicKey,
          user: program.provider.publicKey!,
          // systemProgram: SystemProgram.programId,
          // escrow: escrowPda,
        })
        .rpc();
    },
  
    onSuccess: async (tx) => {
      transactionToast(tx);
      await accounts.refetch();
    },
  });
  
  const payoutMutationV3 = useMutation({
    mutationKey: ['DeCon', 'payout', { cluster, account }],
    mutationFn: (payload: { betKeypair: Keypair }) => program.methods.payout().accounts({
      question: account,
      bet: payload.betKeypair.publicKey,
      user: program.provider.publicKey!,
    }).rpc(),
    onSuccess: async (tx) => {
      transactionToast(tx)
      await accounts.refetch()
    },
  })
  return {
    accountQuery,
    placeBetMutation,
    payoutMutation,
  }
}
