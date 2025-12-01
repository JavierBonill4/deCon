import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DeCon } from "../target/types/de_con";

describe("de-con", () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.myfirstproject as Program<DeCon>;

  it("Is initialized!", async () => {
    const baseAccount = anchor.web3.Keypair.generate();

    // Initialize the account
    await program.methods
      .initialize(new anchor.BN(42), String("What is the answer to life, the universe and everything?"))
      .accounts({
        init: baseAccount.publicKey,
        user: program.provider.publicKey!
      })
      .signers([baseAccount])
      .rpc();

    // Fetch the account and check its value
    const account = await program.account.init.fetch(baseAccount.publicKey);
    console.log("Account value:", account.value.toString());
    if (account.value.toNumber() !== 42) {
      throw new Error("Account not initialized to 42");
    }
    console.log("Account question:", account.question);
    if (account.question !== "What is the answer to life, the universe and everything?") {
      throw new Error("Account question not initialized correctly");
    }
  });

  it("Can update!", async () => {
    const baseAccount = anchor.web3.Keypair.generate();

    // Initialize the account
    await program.methods
      .initialize(new anchor.BN(42), String("What is the answer to life, the universe and everything?"))
      .accounts({
        init: baseAccount.publicKey,
        user: program.provider.publicKey!
      })
      .signers([baseAccount])
      .rpc();

    // Update the account
    await program.methods
      .update(new anchor.BN(12), String("New question after update"))
      .accounts({
        init: baseAccount.publicKey,
      })
      .rpc();
    // Fetch the account and check its value
    const account = await program.account.init.fetch(baseAccount.publicKey);
    console.log("Account value:", account.value.toString());
    if (account.value.toNumber() !== 12) {
      throw new Error("Account value was not updated correctly");
    }
    console.log("Account question:", account.question);
    if (account.question !== "New question after update") {
      throw new Error("Account question was not updated correctly");
    }
  });

});
