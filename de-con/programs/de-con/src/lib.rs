use anchor_lang::prelude::*;

declare_id!("Fdb4auA9NWqzJ935n6FFMv3ogLG6J1tpwaohTHSksLJD");

#[program]
pub mod de_con {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
