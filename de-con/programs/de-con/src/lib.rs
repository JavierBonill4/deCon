use anchor_lang::prelude::*;

declare_id!("61oxCTFdcrLTPFjEhjSQkthjpaCvukRBvVGG342sxfMa");

#[program]
pub mod myfirstproject {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, value: u64, question: String) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let init_account = &mut ctx.accounts.init;
        init_account.value = value;
        init_account.question = question;
        Ok(())
    }


    pub fn update(ctx: Context<Update>, new_value: u64, question: String) -> Result<()> {
        let init_account = &mut ctx.accounts.init;
        init_account.value = new_value;
        init_account.question = question;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 9000)]
    pub init: Account<'info, Init>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub init: Account<'info, Init>,
    pub user: Signer<'info>,
}

#[account]
pub struct Init {
    pub value: u64,
    pub question: String,
}