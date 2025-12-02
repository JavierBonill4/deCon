import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, Connection, Keypair } from "@solana/web3.js";
// import clockwork sdk / client (the exact import depends on the Clockwork SDK version)
// import { ThreadProgram } from "@clockwork-xyz/sdk"; // verify SDK package and API in Clockwork docs
import { ClockworkProvider } from "@clockwork-xyz/sdk";
import { BN } from "bn.js";
// import { DeCon } from "../../target/types/de_con.ts";



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

// wrap in an async function to use await
(async () => {

    // creat a connection
    const connection = provider.connection;
    const payer = (provider.wallet as anchor.Wallet).payer;

    // 1) call askQuestion
    await program.methods
        .askQuestion(questionText, description, new BN(fundLamports), new BN(dateResolvedUnix), imgUrl)
        .accounts({
            question: questionKeypair.publicKey,
            escrow: escrowPda,
            user: provider.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .signers([questionKeypair])
        .rpc();
    console.log("Question asked with escrow PDA:", escrowPda.toBase58());
    console.log("Funds deposited:", fundLamports, "lamports");
    console.log("Question PublicKey:", questionKeypair.publicKey.toBase58());

    // 2) build the resolve instruction (not send it yet)
    const resolveIx = await program.methods
        .resolve() // your resolve instruction; adjust any args if needed
        .accounts({
            question: questionKeypair.publicKey,
            escrow: escrowPda,
            resolver: provider.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .instruction(); // returns an Instruction object

    // 3) register a Clockwork thread that will invoke resolveIx at `dateResolvedUnix`.
    // The exact API depends on the installed Clockwork SDK/CLI. General idea:

    const clockworkProvider = ClockworkProvider.fromAnchorProvider(provider);

    // Prepare source
    const threadId = "spljs" + new Date().getTime();
    const [thread] = clockworkProvider.getThreadPDA(
      provider.wallet.publicKey,  // thread authority
      threadId                    // thread id
    );
    console.log(`Thread id: ${threadId}, address: ${thread}`);

    // We will use the thread pda as the source and fund it with some tokens
    const source = thread;
    const [sourceAta] = await fundSource(connection, payer, source);
    console.log(`source: ${source}, sourceAta: ${sourceAta}`);

    // 1️⃣ Build the SPL Transfer Instruction
    //   const targetIx = createTransferInstruction(sourceAta, destAta, source, amount);

    // 2️⃣  Define a trigger condition for the thread.
    const trigger = {
        timestamp: {
            unix_ts: new BN(dateResolvedUnix),
        },
    };

    // 3️⃣  Create the thread.
    const ix = await clockworkProvider.threadCreate(
        provider.wallet.publicKey,    // authority
        threadId,                     // id
        [resolveIx],                   // instructions to execute
        trigger,                      // trigger condition
        LAMPORTS_PER_SOL              // amount to fund the thread with for execution fees
    );
    const tx = new Transaction().add(ix);
    const sig = await clockworkProvider.anchorProvider.sendAndConfirm(tx);
    console.log(`Thread created: ${sig}`);


    console.log("Clockwork thread created to resolve question at", dateResolvedUnix);
})();


// transfers lamports to the source PDA to fund the thread from they users wallet
async function fundSource(
    connection: Connection,
    payer: Keypair,
    source: PublicKey
): Promise<[PublicKey, PublicKey]> {
    const lamports = LAMPORTS_PER_SOL / 10; // amount to fund the source PDA, e.g., 0.1 SOL

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: source,
            lamports,
        })
    );

    const signature = await connection.sendTransaction(transaction, [payer]);
    await connection.confirmTransaction(signature, "confirmed");
    console.log(`Funded source PDA ${source.toBase58()} with ${lamports} lamports. Tx: ${signature}`);

    return [source, source]; // returning source as both for simplicity; adjust if using an associated token account
}       
// Note: The above code is a template and may require adjustments based on the actual program structure, Clockwork SDK version, and specific requirements.
  