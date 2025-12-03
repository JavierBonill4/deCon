import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { CpiExample } from "./target/types/cpi_example"; // Replace with your actual IDL type

// --- CONFIGURATION ---

// 1. YOUR PROGRAM ID (from declare_id! in your Rust code)
const PROGRAM_ID = new PublicKey("EKX73CGvyv8vdYvvzarCAZvrV8xtbjC8zWrb8Zm8fK55");

// 2. THE TUKTUK PROGRAM ID (The target of the CPI call)
// NOTE: You MUST replace this with the actual Tuktuk program ID for your network
const TUKTUK_PROGRAM_ID = new PublicKey("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA"); 

// 3. TASK QUEUE SETUP (Mock accounts - replace with real ones)
// This is the specific Task Queue account you want to use (e.g., 'deCon')
const TASK_QUEUE_KEY = new PublicKey("QeueuC2rP6E12tJ3q5mK4f7W8yW2dG9X5g8H4L7K6D4F"); 

// The authority of the specific Task Queue (e.g., the key that ran 'tuktuk task-queue create')
const TASK_QUEUE_AUTHORITY_KEY = new PublicKey("EJSCBa4TNR9aY3WLCnynQbntmDznfJKNmeyUKvjyxxxA"); 

// 4. TASK ID
const TASK_ID: number = 101; // The unique ID for the task you are scheduling

// 5. RPC & Payer Setup
const RPC_URL = "https://api.devnet.solana.com"; // Change to 'https://api.devnet.solana.com' for devnet
const connection = new Connection(RPC_URL, "confirmed");
// Use a local keypair for the Payer (Signer)
const payer = Keypair.generate(); 

// --- HELPER FUNCTION ---

/**
 * Calls the 'schedule' instruction on the cpi_example program.
 */
async function scheduleTask() {
    console.log(`Connecting to RPC: ${RPC_URL}`);

    // Anchor provider setup
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
        preflightCommitment: "confirmed",
    });
    anchor.setProvider(provider);

    // Load your Anchor program
    // NOTE: You must have generated the IDL and types in './target/types/cpi_example.ts'
    const program = anchor.workspace.CpiExample as Program<CpiExample>;

    // 1. Derive the 'queue_authority' PDA (as defined in your Schedule Context)
    const [queueAuthorityKey, queueAuthorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("queue_authority")],
        PROGRAM_ID
    );
    console.log(`Derived Queue Authority PDA: ${queueAuthorityKey.toBase58()}`);

    // 2. Derive the 'task' PDA.
    // Tuktuk task accounts are generally derived from the queue key and the task ID.
    // For this example, we'll derive a deterministic task PDA using standard Tuktuk seeds:
    // This is the *new* account the CPI will create and initialize.
    const [taskKey] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("task"),
            TASK_QUEUE_KEY.toBuffer(),
            Buffer.from([TASK_ID]) // Task ID as a Buffer
        ],
        TUKTUK_PROGRAM_ID // The Tuktuk Program is the owner of the Task account
    );
    console.log(`Derived Task Account PDA: ${taskKey.toBase58()}`);

    // WARNING: This example uses Keypair.generate() for the payer, which means it
    // doesn't have SOL. In a real scenario, you must airdrop SOL to this keypair
    // before running the transaction, or use a keypair that already has SOL.

    try {
        // Build the transaction
        const tx = await program.methods
            .schedule(TASK_ID)
            .accounts({
                taskQueue: TASK_QUEUE_KEY,
                taskQueueAuthority: TASK_QUEUE_AUTHORITY_KEY,
                task: taskKey,
                queueAuthority: queueAuthorityKey,
                systemProgram: SystemProgram.programId,
                tuktukProgram: TUKTUK_PROGRAM_ID,
            })
            .transaction();

        // Sign and send the transaction
        const signature = await provider.sendAndConfirm(tx, [payer], {
            commitment: "confirmed",
        });

        console.log("-----------------------------------------");
        console.log(`✅ Schedule Instruction Successful!`);
        console.log(`Transaction Signature: ${signature}`);
        console.log(`Task ID Scheduled: ${TASK_ID}`);
        console.log(`Task Account Created: ${taskKey.toBase58()}`);
        console.log("-----------------------------------------");

    } catch (error) {
        console.error("❌ Transaction Failed:");
        console.error(error);
    }
}

// Run the main function
scheduleTask();