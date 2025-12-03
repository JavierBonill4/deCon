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


})();

