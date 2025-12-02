// take a commnand line argument for the question public key and ckeck if resolved
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"; 

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.de_con; // your program

const questionPubkeyStr = process.argv[2];
if (!questionPubkeyStr) {
    console.error("Please provide the question public key as a command line argument.");
    process.exit(1);
}
const questionPubkey = new PublicKey(questionPubkeyStr);

(async () => {
    // Fetch the question account
    const questionAccount = await program.account.question.fetch(questionPubkey);
    console.log("Question Account:", questionAccount);

    // Check if resolved
    if (questionAccount.resolved) {
        console.log("The question has been resolved.");
    } else {
        console.log("The question is still unresolved.");
    }
})();