use anchor_lang::prelude::*;

declare_id!("61oxCTFdcrLTPFjEhjSQkthjpaCvukRBvVGG342sxfMa");



#[program]
pub mod de_con {
    use super::*;

    pub fn ask_question(ctx: Context<AskQuestion>, question: String, description: String, fund: u64, date_resolved: String, img_url: String) -> Result<()> {
        let new_question = &mut ctx.accounts.question;
        new_question.question = question;
        new_question.description = description;
        new_question.fund = fund;
        new_question.date_resolved = date_resolved;
        new_question.img_url = img_url;
        new_question.yes_votes = 0;
        new_question.no_votes = 0;
        new_question.bets = Vec::new();
        new_question.owner_wallet = *ctx.accounts.user.to_account_info().key;
        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, answer: bool, amount: u64) -> Result<()> {
        let question_account = &mut ctx.accounts.question;
        let new_bet = &mut ctx.accounts.bet;
        new_bet.question_addr = *question_account.to_account_info().key;
        new_bet.answer = answer;
        
        //calculate payout based on amount and question parameters
        new_bet.payout = amount;
        // new_bet.payout = calculate_payout(amount, question_account); // You need to define this function based on your payout logic

        new_bet.owner_wallet = *ctx.accounts.user.to_account_info().key;

        // Update vote counts on the question
        if answer {
            question_account.yes_votes += new_bet.payout;
        } else {
            question_account.no_votes += new_bet.payout;
        }

        // Add the new bet to the question's bets vector
        question_account.bets.push(new_bet.key());

        Ok(())
    }

}


// Accounts Structs
// These define the accounts involved in each instruction

#[derive(Accounts)]
pub struct AskQuestion<'info> {
    #[account(init, payer = user, space = 9000)]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(init, payer = user, space = 9000)]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}


// Data Structs
// These define the data stored in each account


#[account]
pub struct Question {
    pub question: String,
    pub fund: u64,
    pub date_resolved: String,
    pub img_url: String,
    pub description: String,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub bets: Vec<Pubkey>,
    pub owner_wallet: Pubkey,
}


#[account]
pub struct Bet {
    pub question_addr: Pubkey,
    pub answer: bool,
    pub payout: u64,
    pub owner_wallet: Pubkey,
    // The question ID bet is answering
    // - A bet ID
    // - (Amount of yes, reward if yes)
    // - (Amount of no, reward if no)
    // - owners wallet address
}


// pub fn calculate_payout(amount: u64, question_account: &Question) -> u64 {
//     // Implement your payout calculation logic here
//     return amount; // Placeholder
// }