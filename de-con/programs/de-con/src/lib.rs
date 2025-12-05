use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::system_program;
use anchor_lang::solana_program::program::{
    invoke,
    invoke_signed,
};

use anchor_lang::{solana_program::instruction::Instruction, InstructionData};
use tuktuk_program::tuktuk::program::Tuktuk;
use tuktuk_program::{
        compile_transaction,
        tuktuk::{
            cpi::{accounts::QueueTaskV0, queue_task_v0},
            types::TriggerV0,
        },
        types::QueueTaskArgsV0,
        // write_return_tasks::{
        //     write_return_tasks, AccountWithSeeds, PayerInfo, WriteReturnTasksArgs,
        // },
        // RunTaskReturnV0, TaskReturnV0, TransactionSourceV0,
        TransactionSourceV0,
    };


// declare_id!("EKX73CGvyv8vdYvvzarCAZvrV8xtbjC8zWrb8Zm8fK55");
declare_id!("61oxCTFdcrLTPFjEhjSQkthjpaCvukRBvVGG342sxfMa");


#[program]
pub mod de_con {
    use super::*;

    pub fn ask_question(ctx: Context<AskQuestion>, question: String, description: String, fund: u64, date_resolved: i64, img_url: String, task_id: u16) -> Result<()> {
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
        new_question.resolved = false;
        new_question.resolver_reward = 0; // setable via client if you want to pay resolver
        new_question.result = false; // default to false (no)

        // escrow PDA is present because we used Anchor `init` with seeds.
        let escrow_key = ctx.accounts.escrow.key();
        new_question.escrow = escrow_key;

        // We need to capture the bump used by Anchor so later resolve can sign.
        // Anchor exposes the bump via `Pubkey::find_program_address` here:
        let (_pda, bump) = Pubkey::find_program_address(&[b"escrow", new_question.key().as_ref()], ctx.program_id);
        new_question.escrow_bump = bump;

        // Transfer the fund lamports from user to escrow.
        // Note: Anchor already created the escrow account with rent-exempt lamports (minimum),
        // but we still need to transfer the market 'fund' amount into escrow.
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &escrow_key,
            fund,
        );

        // Invoke transfer (user is signer so no invoke_signed needed)
        invoke(
            &transfer_ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Schedule resolution task via Tuktuk CPI
        // let context = Context::<Schedule>::new(
        //     ctx.accounts.tuktuk_program.to_account_info().key,
        //     &mut Schedule {
        //         task_queue: ctx.accounts.task_queue,
        //         task_queue_authority: ctx.accounts.task_queue_authority,
        //         task: ctx.accounts.task.to_account_info(),
        //         queue_authority: ctx.accounts.queue_authority.to_account_info(),
        //         system_program: ctx.accounts.system_program,
        //         tuktuk_program: ctx.accounts.tuktuk_program,
        //         question: ctx.accounts.question,
        //     },
        //     ctx.remaining_accounts,
        //     &[&["queue_authority".as_bytes(), &[ctx.bumps.queue_authority]]],
        // );
        schedule(&ctx, task_id)?;

        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, answer: bool, amount: f64) -> Result<()> {
        let question_account = &mut ctx.accounts.question;
        let new_bet = &mut ctx.accounts.bet;
        new_bet.question_addr = *question_account.to_account_info().key;
        new_bet.answer = answer;

        // Transfer the fund lamports from user to escrow.
        // Note: Anchor already created the escrow account with rent-exempt lamports (minimum),
        // but we still need to transfer the market 'fund' amount into escrow.
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &question_account.escrow,
            amount as u64,
        );

        // Invoke transfer (user is signer so no invoke_signed needed)
        invoke(
            &transfer_ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let b = question_account.fund as f64 / std::f64::consts::LN_2;

        new_bet.owner_wallet = *ctx.accounts.user.to_account_info().key;

        // Update vote counts on the question
        if answer {
            // use fewer iterations and a slightly looser tolerance to save compute on-chain
            let delta_qy = buy_yes_delta(question_account.yes_votes as f64, question_account.no_votes as f64, b, amount as f64, 15, 1e-6);
            question_account.yes_votes += delta_qy as u64;
            new_bet.payout = delta_qy;
        } else {
            let delta_qn = buy_no_delta(question_account.yes_votes as f64, question_account.no_votes as f64, b, amount as f64, 15, 1e-6);
            question_account.no_votes += delta_qn as u64;
            new_bet.payout = delta_qn;
        }

        // Add the new bet's pubkey to the question's bets vector
        question_account.bets.push(*new_bet.to_account_info().key);


        Ok(())
    }

    pub fn resolve(ctx: Context<Resolve>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let q = &mut ctx.accounts.question;

        // require!(q.resolved == false, ErrorCode::AlreadyResolved);
        require!(now >= q.date_resolved, ErrorCode::TooEarlyToResolve);

        // perform settlement logic here (determine winner, transfer lamports, etc.)
        // e.g. transfer from question's escrow or move funds to winners

        // close question account
        
        // submit request to oracle for final answer 
        
        // mark resolved
        q.resolved = true;

        q.result = true; // placeholder, set based on oracle response

        Ok(())
    }

    pub fn payout(ctx: Context<Payout>) -> Result<()> {
        // implement payout logic here
        let q = &mut ctx.accounts.question;
        let bet = &ctx.accounts.bet;

        // let accounts = &ctx.remaining_accounts;

        require!(q.resolved == true, ErrorCode::TooEarlyToPayout);
        require!(bet.owner_wallet == *ctx.accounts.user.to_account_info().key, ErrorCode::WrongOwner);
        require!(bet.answer == q.result, ErrorCode::NotAWinner);

        // load bet account
        // user won
        let transfer_ix = system_instruction::transfer(
            &q.escrow,
            &ctx.accounts.user.key(),
            bet.payout as u64,
        );

        // Invoke transfer (user is signer so no invoke_signed needed)
        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[b"escrow", q.key().as_ref(), &[q.escrow_bump]]],
        )?;
        
        // close bet account

        Ok(())
    }
} 


pub fn schedule(ctx: &Context<AskQuestion>, task_id: u16) -> Result<()> {
        msg!("Scheduling with a PDA queue authority");
        let (compiled_tx, _) = compile_transaction(
            vec![Instruction {
                program_id: crate::ID,
                accounts: crate::__cpi_client_accounts_resolve::Resolve {
                    system_program: ctx.accounts.system_program.to_account_info(),
                    question: ctx.accounts.question.to_account_info(),
                    // resolver: ctx.accounts.queue_authority.to_account_info(),
                }
                .to_account_metas(None)
                .to_vec(),
                data: crate::instruction::Resolve.data(),
            }],
            vec![],
        )
        .unwrap();

        queue_task_v0(
            CpiContext::new_with_signer(
                ctx.accounts.tuktuk_program.to_account_info(),
                QueueTaskV0 {
                    payer: ctx.accounts.queue_authority.to_account_info(),
                    queue_authority: ctx.accounts.queue_authority.to_account_info(),
                    task_queue: ctx.accounts.task_queue.to_account_info(),
                    task_queue_authority: ctx.accounts.task_queue_authority.to_account_info(),
                    task: ctx.accounts.task.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                &[&["queue_authority".as_bytes(), &[ctx.bumps.queue_authority]]],
            ),
            QueueTaskArgsV0 {
                // trigger: TriggerV0::Timestamp(date_resolved),
                trigger: TriggerV0::Timestamp(Clock::get()?.unix_timestamp + 120), // schedule for 1 minute later
                transaction: TransactionSourceV0::CompiledV0(compiled_tx),
                crank_reward: None,
                free_tasks: 1,
                id: task_id,
                description: "test".to_string(),
            },
        )?;

        Ok(())
    }


// Accounts Structs
// These define the accounts involved in each instruction

#[derive(Accounts)]
#[instruction(fund: u64, date_resolved: i64)]
pub struct AskQuestion<'info> {
    // question account (client provides a keypair for this)
    #[account(init, payer = user, space = 9000)]
    pub question: Account<'info, Question>,

    // Escrow PDA that will hold lamports for this question.
    // Anchor will create this account before the handler runs (seeds use the question pubkey).
    // We use UncheckedAccount because the PDA doesn't store structured data here (only lamports).
    #[account(
        init,
        payer = user,
        seeds = [b"escrow", question.key().as_ref()],
        bump,
        space = 0,
        // make this a system-owned account with zero data so it can be used as a lamport-only escrow
        owner = system_program::ID,
    )]
    /// CHECK: No checks are necessary because the PDA doesn't store structured data here (only lamports).
    pub escrow: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
    // pub rent: Sysvar<'info, Rent>,
    // pub clock: Sysvar<'info, Clock>,

    #[account(mut)]
    /// CHECK: Don't need to parse this account, just using it in CPI
    pub task_queue: UncheckedAccount<'info>,
    /// CHECK: Don't need to parse this account, just using it in CPI
    pub task_queue_authority: UncheckedAccount<'info>,
    /// CHECK: Initialized in CPI
    #[account(mut)]
    pub task: AccountInfo<'info>,
    /// CHECK: Via seeds
    #[account(
        mut,
        seeds = [b"queue_authority"],
        bump
    )]
    pub queue_authority: AccountInfo<'info>,
    pub tuktuk_program: Program<'info, Tuktuk>,
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

    /// CHECK: Escrow PDA holding lamports. Must be mutable so we can transfer into it.
    #[account(
        mut,
        seeds = [b"escrow", question.key().as_ref()],
        bump = question.escrow_bump,
    )]
    pub escrow: UncheckedAccount<'info>,

}

#[derive(Accounts)]
pub struct Resolve<'info> {
  #[account(mut)]
  pub question: Account<'info, Question>,
  // optional: account to receive resolver reward
//   #[account(mut)]
//   pub resolver: Signer<'info>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Payout<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: No checks are necessary because the PDA doesn't store structured data here (only lamports).
    #[account(
        mut,
        seeds = [b"escrow", question.key().as_ref()],
        bump = question.escrow_bump,
    )]
    pub escrow: UncheckedAccount<'info>,
}

// Data Structs
// These define the data stored in each account



#[account]
pub struct Question {
    pub question: String,
    pub description: String,
    // store fund as lamports (u64)
    pub fund: u64,
    // store resolve timestamp as unix seconds
    pub date_resolved: i64,
    pub img_url: String,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub bets: Vec<Pubkey>,
    pub owner_wallet: Pubkey,

    // escrow PDA info so we can sign (invoke_signed) later when resolving
    pub escrow: Pubkey,
    pub escrow_bump: u8,

    pub resolved: bool,
    pub resolver_reward: u64,

    pub result: bool, // true = yes, false = no, only valid if resolved is true
}


#[account]
pub struct Bet {
    pub question_addr: Pubkey,
    pub answer: bool,
    pub payout: f64,
    pub owner_wallet: Pubkey,
    // The question ID bet is answering
    // - A bet ID
    // - (Amount of yes, reward if yes)
    // - (Amount of no, reward if no)
    // - owners wallet address
}

// Error Codes
#[error_code]
pub enum ErrorCode {
    #[msg("Question has already been resolved.")]
    AlreadyResolved,
    #[msg("It's too early to resolve this question.")]
    TooEarlyToResolve,
    #[msg("It's too early to payout for this question.")]
    TooEarlyToPayout,
    #[msg("You are not the owner of this bet.")]
    WrongOwner,
    #[msg("You are not a winner on this bet.")]
    NotAWinner,
}



// pub fn calculate_payout(amount: u64, question_account: &Question) -> u64 {
//     // Implement your payout calculation logic here
//     return amount; // Placeholder
// }
/// LMSR cost function:
/// C(qY, qN) = b * ln( exp(qY/b) + exp(qN/b) )
fn cost(q_y: f64, q_n: f64, b: f64) -> f64 {
    b * ((q_y / b).exp() + (q_n / b).exp()).ln()
}

/// Given:
///   qY, qN = current shares
///   b      = liquidity parameter
///   M      = amount trader wants to spend
///
/// Returns ΔqY such that:
///   cost(qY + ΔqY) - cost(qY) = M
///
/// Uses binary search to solve the nonlinear equation.
fn buy_yes_delta(
    q_y: f64,
    q_n: f64,
    b: f64,
    m: f64,
    max_iter: usize,
    tol: f64,
) -> f64 {
    // quick guard: nothing to buy
    if m <= 0.0 {
        return 0.0;
    }
    let original_cost = cost(q_y, q_n, b);

    // Lower/upper search bounds for ΔqY
    let mut low = 0.0_f64;
    let mut high = 1.0_f64;

    // Expand upper bound until cost(high) - cost(0) exceeds M
    // expand upper bound but cap growth to avoid runaway loops on-chain
    let mut expand_iters = 0usize;
    while cost(q_y + high, q_n, b) - original_cost < m {
        high *= 2.0;
        expand_iters += 1;
        if expand_iters > 50 || high > 1e12 {
            break;
        }
    }

    // Binary search for ΔqY
    for _ in 0..max_iter {
        let mid = 0.5 * (low + high);
        let test_cost = cost(q_y + mid, q_n, b) - original_cost;

        if (test_cost - m).abs() < tol {
            return mid;
        }

        if test_cost < m {
            low = mid;
        } else {
            high = mid;
        }
    }

    // If not converged return midpoint
    0.5 * (low + high)
}
fn buy_no_delta(
    q_y: f64,
    q_n: f64,
    b: f64,
    m: f64,
    max_iter: usize,
    tol: f64,
) -> f64 {
    if m <= 0.0 {
        return 0.0;
    }
    let original_cost = cost(q_y, q_n, b);

    // Lower/upper search bounds for ΔqN
    let mut low = 0.0_f64;
    let mut high = 1.0_f64;

    // Increase upper bound until cost increase exceeds M
    let mut expand_iters = 0usize;
    while cost(q_y, q_n + high, b) - original_cost < m {
        high *= 2.0;
        expand_iters += 1;
        if expand_iters > 40 || high > 1e9 {
            break;
        }
    }

    // Binary search loop
    for _ in 0..max_iter {
        let mid = 0.5 * (low + high);
        let test_cost = cost(q_y, q_n + mid, b) - original_cost;

        if (test_cost - m).abs() < tol {
            return mid;
        }

        if test_cost < m {
            low = mid;
        } else {
            high = mid;
        }
    }

    // Return midpoint if not perfectly converged
    0.5 * (low + high)
}