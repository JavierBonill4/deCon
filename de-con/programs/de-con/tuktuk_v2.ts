// tuktuk.ts
import * as anchor from "@coral-xyz/anchor";
// ... other existing imports
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, Connection, Keypair } from "@solana/web3.js";
import { BN } from "bn.js";

// 👇 1. IMPORT THE HELPER FUNCTION from the Tuktuk SDK
import { taskQueueAuthorityKey } from "@helium/tuktuk-sdk"; // Assuming you have the @helium/tuktuk-sdk installed and its structure is similar

// 1. YOUR PROGRAM ID (from declare_id! in your Rust code)
const PROGRAM_ID = new PublicKey("EKX73CGvyv8vdYvvzarCAZvrV8xtbjC8zWrb8Zm8fK55");

// 2. THE TUKTUK PROGRAM ID (The target of the CPI call)
const TUKTUK_PROGRAM_ID = new PublicKey("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA");

// 3. TASK QUEUE SETUP
const TASK_QUEUE_KEY = new (PublicKey"Det9gdPXmtuAKdhtX1G3SX2RaeaKHdT42yztrVrzNLuF");

// The key that *signed* the 'tuktuk task-queue add-queue-authority' command, 
// which is your own program's PDA:
// Derived Queue Authority PDA: CuELr9EEr38wBoe3NSLMN8hSe6oDnFJLyijGtp9gnnUW
const [QUEUE_AUTHORITY_SIGNER_KEY] = PublicKey.findProgramAddressSync(
    [Buffer.from("queue_authority")],
    PROGRAM_ID
);

// 👇 4. DERIVE THE TUKTUK-OWNED PDA using the helper function
const TASK_QUEUE_AUTHORITY_KEY = taskQueueAuthorityKey(
    TASK_QUEUE_KEY, 
    QUEUE_AUTHORITY_SIGNER_KEY
)[0];

console.log(`Derived Task Queue Authority PDA (Tuktuk-owned): ${TASK_QUEUE_AUTHORITY_KEY.toBase58()}`);

const TASK_ID: number = 42; // The unique ID for the task we are scheduling

const [taskKey] = PublicKey.findProgramAddressSync(
    [
        Buffer.from("task"),
        TASK_QUEUE_KEY.toBuffer(),
        Buffer.from([TASK_ID]) // Task ID as a Buffer
    ],
    TUKTUK_PROGRAM_ID
);
// ... existing log
console.log(`Derived Queue Authority PDA (Your Program-owned): ${QUEUE_AUTHORITY_SIGNER_KEY.toBase58()}`); // Renamed console log



const provider = anchor.AnchorProvider.env(); // uses env vars or default localnet
anchor.setProvider(provider);
const program = anchor.workspace.de_con; // your program

// Parameters for the question
const questionKeypair = anchor.web3.Keypair.generate();
const questionText = "Will Javier and Cole win the 2025 MBC Hackathon?";
const description = "Hackathon prediction";
const fundLamports = 10000000; // e.g., 0.01 SOL
// set a dateResolved in the 4 minutes from now for testing
const now = Math.floor(Date.now() / 1000);
const dateResolvedUnix = now + 240; // 4 minutes from now
const imgUrl = "https://example.com/image.png";

// Derive the escrow PDA (adjust seeds as per your program)
const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), questionKeypair.publicKey.toBuffer()],
    program.programId
);

// ... inside the IIFE, replace TASK_QUEUE_AUTHORITY_KEY with the new derived key:

(async () => {
// 1) call askQuestion
await program.methods
    .askQuestion(questionText, description, new BN(fundLamports), new BN(dateResolvedUnix), imgUrl)
    .accounts({
        question: questionKeypair.publicKey,
        escrow: escrowPda,
        user: provider.publicKey,
        systemProgram: SystemProgram.programId,
        taskQueue: TASK_QUEUE_KEY,
        // 👇 USE THE DERIVED TUKTUK-OWNED PDA HERE
        taskQueueAuthority: TASK_QUEUE_AUTHORITY_KEY, 
        task: taskKey,
        queueAuthority: QUEUE_AUTHORITY_SIGNER_KEY, // The PDA your program uses to sign the CPI
        tuktukProgram: TUKTUK_PROGRAM_ID,
    })
    .signers([questionKeypair])
    .rpc();


     console.log("Question asked with escrow PDA:", escrowPda.toBase58());
    console.log("Funds deposited:", fundLamports, "lamports");
    console.log("Question PublicKey:", questionKeypair.publicKey.toBase58());


})();
