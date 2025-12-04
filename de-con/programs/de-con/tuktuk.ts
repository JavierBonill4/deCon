import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, Connection, Keypair } from "@solana/web3.js";
// import clockwork sdk / client (the exact import depends on the Clockwork SDK version)
// import { ThreadProgram } from "@clockwork-xyz/sdk"; // verify SDK package and API in Clockwork docs
import { BN } from "bn.js";
// import { DeCon } from "../../target/types/de_con.ts";
// import { tuktukConfigKey, taskQueueKey,  } from "@helium/tuktuk-sdk"


// 
const taskQueueAuthorityKey = (taskQueue : PublicKey, queueAuthority : PublicKey, programId = PROGRAM_ID) => {
    return PublicKey.findProgramAddressSync([Buffer.from("task_queue_authority"), taskQueue.toBuffer(), queueAuthority.toBuffer()], programId);
};

export const tuktukConfigKey = (programId = PROGRAM_ID) => {
    return PublicKey.findProgramAddressSync([Buffer.from("tuktuk_config")], programId);
};

export const taskQueueKey = (tuktukConfig : PublicKey, id : number, programId = PROGRAM_ID) => {
    const buf = Buffer.alloc(4);
    buf.writeUint32LE(id);
    return PublicKey.findProgramAddressSync([Buffer.from("task_queue"), tuktukConfig.toBuffer(), buf], programId);
};

const taskKeyFunc = (
  taskQueue: PublicKey,
  id: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] => {
  const buf = Buffer.alloc(2);
  buf.writeUint16LE(id);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("task"), taskQueue.toBuffer(), buf],
    programId
  );
};

const TASK_ID: number = 0; // The unique ID for the task we are scheduling
// 1. YOUR PROGRAM ID (from declare_id! in your Rust code)
const PROGRAM_ID = new PublicKey("EKX73CGvyv8vdYvvzarCAZvrV8xtbjC8zWrb8Zm8fK55");

// 2. THE TUKTUK PROGRAM ID (The target of the CPI call)
// NOTE: You MUST replace this with the actual Tuktuk program ID for your network
const TUKTUK_PROGRAM_ID = new PublicKey("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA");

// 3. TASK QUEUE SETUP (Mock accounts - replace with real ones)
// This is the specific Task Queue account you want to use (e.g., 'deCon')
const tuktukConfig = tuktukConfigKey()[0];


// const TASK_QUEUE_KEY = taskQueueKey(tuktukConfig, 42)[0];//new PublicKey("Det9gdPXmtuAKdhtX1G3SX2RaeaKHdT42yztrVrzNLuF");

const TASK_QUEUE_KEY = new PublicKey("4Yu6dH3pTzCH8ewRkw2MAJDbrmiHjT6wNVJpETU1zKum");

console.log("Task Queue key", TASK_QUEUE_KEY.toBase58());

// const config = await program.account.tuktukConfigV0.fetch(tuktukConfig);
// const nextTaskQueueId = config.nextTaskQueueId;
// const taskQueue = taskQueueKey(tuktukConfig, 0)[0];
// console.log("Derived Task Queue PDA: ", taskQueue.toBase58());

// The authority of the specific Task Queue (e.g., the key that ran 'tuktuk task-queue create')
// const TASK_QUEUE_AUTHORITY_KEY = new PublicKey("EJSCBa4TNR9aY3WLCnynQbntmDznfJKNmeyUKvjyxxxA");

// from solscan 
const TASK_QUEUE_AUTHORITY_KEY = new PublicKey("6ces48ZeV7JYmccwdTkspayKMWAh5LpCvdfXH8K575AD");


const [taskKey] = PublicKey.findProgramAddressSync(
    [
        Buffer.from("task"),
        TASK_QUEUE_KEY.toBuffer(),
        // Task ID as a 2 byte little-endian buffer
        Buffer.from(new Uint8Array(new Uint16Array([TASK_ID]).buffer)),
    ],
    TUKTUK_PROGRAM_ID // The Tuktuk Program is the owner of the Task account
);
// from error message when running, was comparing derived address we passed to this address
// const taskKey = new PublicKey("8fhtMu3spxwNpenjShS8kU6fEeRZNJWWQdFMCECnkfKR");


console.log(`Derived Task Account PDA: ${taskKey.toBase58()}`);


// 1. Derive the 'queue_authority' PDA (as defined in your Schedule Context)
const [queueAuthorityKey, queueAuthorityBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("queue_authority")],
    PROGRAM_ID
);
// const queueAuthorityKey = new PublicKey("CuELr9EEr38wBoe3NSLMN8hSe6oDnFJLyijGtp9gnnUW");
console.log(`Derived Queue Authority PDA: ${queueAuthorityKey.toBase58()}`);



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

const taskKeypair = anchor.web3.Keypair.generate();

// wrap in an async function to use await
(async () => {

    // creat a connection
    const connection = provider.connection;
    const payer = (provider.wallet as anchor.Wallet).payer;

    console.log("Derived task queue athority: ", taskQueueAuthorityKey(TASK_QUEUE_KEY, queueAuthorityKey)[0].toBase58());

    // 1) call askQuestion
    await program.methods
        .askQuestion(questionText, description, new BN(fundLamports), new BN(dateResolvedUnix), imgUrl)
        .accounts({
            question: questionKeypair.publicKey,
            escrow: escrowPda,
            user: provider.publicKey,
            systemProgram: SystemProgram.programId,
            taskQueue: TASK_QUEUE_KEY,
            taskQueueAuthority: TASK_QUEUE_AUTHORITY_KEY, // your queue authority
            // taskQueueAuthority: taskQueueAuthorityKey(TASK_QUEUE_KEY, queueAuthorityKey)[0], // your queue authority
            task: taskKey,
            queueAuthority: queueAuthorityKey,
            tuktukProgram: TUKTUK_PROGRAM_ID,
        })
        .signers([questionKeypair])
        .rpc();
    console.log("Question asked with escrow PDA:", escrowPda.toBase58());
    console.log("Funds deposited:", fundLamports, "lamports");
    console.log("Question PublicKey:", questionKeypair.publicKey.toBase58());


})();
// export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com 
//  tuktuk -u https://api.devnet.solana.com task-queue create --name deConV2 --capacity 10 --funding-amount 100000000 --queue-authority EKX73CGvyv8vdYvvzarCAZvrV8xtbjC8zWrb8Zm8fK55 --min-crank-reward 1000000 --stale-task-age 1000
// {
//     "pubkey": "Det9gdPXmtuAKdhtX1G3SX2RaeaKHdT42yztrVrzNLuF",
//     "id": 135,
//     "capacity": 10,
//     "update_authority": "EJSCBa4TNR9aY3WLCnynQbntmDznfJKNmeyUKvjyxxxA",
//     "name": "deCon",
//     "min_crank_reward": 1000000,
//     "balance": 1100000000,
//     "stale_task_age": 1000
//   }

// {
//   "pubkey": "4Yu6dH3pTzCH8ewRkw2MAJDbrmiHjT6wNVJpETU1zKum",
//   "id": 137,
//   "capacity": 10,
//   "update_authority": "EJSCBa4TNR9aY3WLCnynQbntmDznfJKNmeyUKvjyxxxA",
//   "name": "deConV2",
//   "min_crank_reward": 1000000,
//   "balance": 1100000000,
//   "stale_task_age": 1000
// }


// tuktuk -u https://api.devnet.solana.com tuktuk-config

//tuktuk -u https://api.devnet.solana.com task list --task-queue-name deCon


// tuktuk -u https://api.devnet.solana.com task-queue remove-queue-authority --task-queue-name deCon --queue-authority EKX73CGvyv8vdYvvzarCAZvrV8xtbjC8zWrb8Zm8fK55

// tuktuk -u https://api.devnet.solana.com task-queue close --task-queue-name deCon 


// tuktuk -u https://api.devnet.solana.com task-queue add-queue-authority --task-queue-name deCon --queue-authority EKX73CGvyv8vdYvvzarCAZvrV8xtbjC8zWrb8Zm8fK55
// 9T6ixDodZxJjEV3pLNzUDrQ72pGpTGTJaHY2yREBmmaz

// tuktuk -u https://api.devnet.solana.com task-queue show --task-queue-name deCon