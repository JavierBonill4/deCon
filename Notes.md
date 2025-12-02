# Clientside dynamic page
- find a template for a clientside dynamics webapp
- On login connect a wallet compatable with solana
- home page will be page of bets with the options of adding a bet or placing a bet
- adding a question will let you add an image, write text and then place bounty on question, and then will make you confirm your ecision on adding a question
- adding a bet will let you enter the amount to bet and will show you your returns on if you are correct, and then make you confirm your decision to add a bet
- Session cookies will be used for remembering users
## Connecting wallet
- When first opening webapp, take user to homepage, If the user is connected to a wallet put in their credentials in the corner. If not have a button in top right corner to connect wallet which will give a popup for connecting your wallet
## Posing a question
- Have an add question button, on click first check if user has a wallet connected, if not prompt to connect a wallet. If wallet is connected give a textbox for question, a place to add an image, and a bounty amount, explain to the user that the bounty is the max losses the user can take however unclaimed funds are returned to the user. Check if wallet has sufficient SOL for bounty then confirm with user and take the new question. This action should trigger a connection with the blockchain
- Questions will be stored in a dictionary with questionID as the keys and question objects as the values
### Question created
- We will take the users SOL in a wallet created for holding user SOL.
- Creat a question object that will contain:
    - a question ID
    - Fund
    - Split for initial line(deafualts to (%50, %50))
    - img url
    - text
    - owners wallet address
    - date resolved
    - Line (%yes, %no)
    - dictionary of bets, with the betID as the key and bet object as the values. This is for when a bet is resolved we know what address we have to payout along with the calculated quantity
- Creating the question will not be clientside but serverside supported
- Once question object is created we will use that object to update our homepage to include the question
## Placing a bet
- On existing questions we will have an option for betting yes or no. On selecting one of these we will verify if user has a waller connected, then we will prompt for the amount to bet and display the reward for if the user is correct. We will then make the user verify before submitting bet and check if there are sufficient funds in wallet.
### Once bet is placed
- We will take the users SOL in a wallet created for holding user SOL.
- Create a bet object that will contain:
    - The question ID bet is answering
    - A bet ID
    - (Amount of yes, reward if yes)
    - (Amount of no, reward if no)
    - owners wallet address
- Creating the bet will be clientside
- Once bet object is created we will use that object to update our line this aspect of the question object should be clientside
## Moving the line

## Launching on Solana devnet

## What the guy said to do for oracle
alchemy good free create an app get api Key and with RPC url use some sort of web3 provider, ether JS, VIEN and wagmy to access smart contract.