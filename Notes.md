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

# Project description
DeCon, by Javier Bonilla and Cole Abbott
The goal of our hackathon project on the solana track is the idea of decentralized consulting through the means of prediction markets. Prediction markets are historically accurate on predicting outcomes because of the dispersment of many users putting their own money on the line based on many factors that differ for each user. Our goal is to accumulate users looking for intel whether it is business or personal and connect them with users throughout the world who may have information or predictions on the intel. DeCon lets users interact with a straight forward webapp on the front end to both pose a question alongside with funding for the question (to incentivise initial betting) and bet on various questions and their outcomes. DeCon runs on the Solana blockchain as a dapp, and is capable of handlig question objects and bet objects to organize users money and what bets are connected with what questions. We used the LMSR algorithm to determine user payout to ensure all users can recieve their promised rewards if they win and a question will never promise rewards past funds that it has in stock. Our project is still very rootimental and lacks 3 aspects: efficient checking to ensure a questions validity when a question deadline hase been reached, decision making on the result for after an outcome has occured(OO UMA voting with a bridge/ or we would build our own version of this as Solana lacks one), and legal aspects for questions being posed.


export function DeConCreate() {
  const { askQuestion } = useDeConProgram()

  const [open, setOpen] = useState(false)

  const [choice, setChoice] = useState<string>("yes")
  const [amount, setAmount] = useState("")

  const resetForm = () => {
    setChoice("yes")
    setAmount("")
  }

  const handleSubmit = async () => {
    if (!amount) {
      alert("Amount is required")
      return
    }

    const payload = {
      keypair: Keypair.generate(),
      choice: choice === "yes",         // boolean true/false
      amount: new anchor.BN(parseFloat(amount)),
    }

    await askQuestion.mutateAsync(payload)

    setOpen(false)
    resetForm()
  }

  return (
    <div className="mb-4">
      <Button
        onClick={() => setOpen(true)}
        disabled={askQuestion.isPending}
      >
        Bet {askQuestion.isPending && "..."}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place a Bet</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            <div>
              <Label>Choose Yes or No</Label>
              <Select value={choice} onValueChange={(v) => setChoice(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount (SOL)</Label>
              <Input
                type="number"
                placeholder="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={askQuestion.isPending}>
              Submit Bet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}