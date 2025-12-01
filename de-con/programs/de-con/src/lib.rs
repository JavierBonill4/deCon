use anchor_lang::prelude::*;

declare_id!("61oxCTFdcrLTPFjEhjSQkthjpaCvukRBvVGG342sxfMa");

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
