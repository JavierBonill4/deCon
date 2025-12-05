// solana.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import idl from "../../../target/idl/de_con.json";
import { CONFIG } from "./config";

export async function listenForOracleRequests(onEvent) {
  const connection = new Connection(CONFIG.SOLANA_RPC, "confirmed");
  const programId = new PublicKey(CONFIG.PROGRAM_ID);

  // We create a read-only dummy provider (no wallet needed)
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: PublicKey.default,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    },
    AnchorProvider.defaultOptions()
  );

  const program = new Program(
    idl as Idl,
    programId,
    provider,
  );

  program.addEventListener("OracleRequest", (event, slot) => {
    console.log("📡 OracleRequest detected on Solana:", event);
    onEvent(event);
  });

  console.log("👂 Listening for OracleRequest events...");
}
