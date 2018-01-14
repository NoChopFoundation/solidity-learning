pragma solidity ^0.4.0;

contract RockPaperScissorsGame {
    
    struct Player {
        address addr;
        bool hasSubmitted;
        bytes32 hashedHand;
        bool hasRevealed;
        bytes5 hand;
    }

    bytes32 public channelName;
    Player[] public players;
    address public creator;
    
    bool gameOver;
    uint gameTimeout;
    uint defuncTimeout;
    uint freeMoneyTimeout;
    
    mapping(address => uint) winnings;
    
    function RockPaperScissorsGame(bytes32 _channelName, address _playerOne, address _playerTwo) public payable {
        channelName = _channelName;
        creator = msg.sender;
        gameOver = false;
        players.push(Player(_playerOne, false, 0, false, 0));
        players.push(Player(_playerTwo, false, 0, false, 0));
        updateTimeouts();
    }
    
    function getMyHasSubmitted() public view 
    returns (bool) {
        var (found, me) = getMe();
        require(found);
        
        return players[me].hasSubmitted;
    }
    
    function getMyHashedHand() public view 
    returns (bytes32) {
        var (found, me) = getMe();
        require(found);
        
        return players[me].hashedHand;
    }
        bytes5 hand;
    
    function getMyHasRevealed() public view 
    returns (bool) {
        var (found, me) = getMe();
        require(found);
        
        return players[me].hasRevealed;
    }
    
    function getMyHand() public view 
    returns (bytes5) {
        var (found, me) = getMe();
        require(found);
        
        return players[me].hand;
    }
    
    function getMe() private view
    returns (bool found, uint idx) {
        if (players[0].addr == msg.sender) {
            found = true;
            idx = 0;
        } else if (players[1].addr == msg.sender) {
            found = true;
            idx = 1;
        } else {
            found = false;
        }
    }
    
    function updateTimeouts() private {
        gameTimeout = now + (1 hours);
        defuncTimeout = gameTimeout + (1 weeks);
        freeMoneyTimeout = gameTimeout + (4 weeks);
    }
    
    event AllHandsSubmitted();
    event GameCompletedNormal(address p1, uint p1Bal, bytes5 p1Hand, address p2, uint p2Bal, bytes5 p2Hand);
    
    ///  keccak256(bytes5, bytes32 secretSalt)
    ///  where byte5 = rock(R), paper(P), scissor(S) role 'RRPSR', 'SRRSS', etc 
    function submitHashedHand(bytes32 _hashedHand) 
        onlyByPlayers 
        onlyBefore(gameTimeout) 
        gameNotOver
    public {
        var (current, opponent) = getPlayers();
        
        require(players[current].hasSubmitted == false);
        
        players[current].hashedHand = _hashedHand;
        players[current].hasSubmitted = true;
        
        if (players[opponent].hasSubmitted) {
            updateTimeouts(); // Avoid one player not giving the other player time to reveal near gameTimeout
            AllHandsSubmitted();
        }
    }
    
    modifier gameNotOver() {
        require(gameOver == false);
        _;
    }
    
    /// Should be able to execute this in local js
    function createBidUtility(bytes5 _hand, bytes32 _secretSalt) public 
    returns (bytes32) {
    	//x = _hand;
    	//x.push(_hand[0]);
        //x[0] = _hand[0];
        //x[1] = _hand[1];
        //x[1] = _hand[1];
        //x[2] = _hand[2];
        //x[3] = _hand[3];
        //x[4] = _hand[4];
        return keccak256(_hand, _secretSalt);
    }
    
    function revealHand(bytes5 _hand, bytes32 _secretSalt)
        onlyByPlayers
        onlyBefore(gameTimeout)
        gameNotOver
    public {
        var (current, opponent) = getPlayers();
        
        // Verify submitted hand and revealed hands match
        require(players[current].hasSubmitted);
        require(players[current].hasRevealed == false);
        require(keccak256(_hand, _secretSalt) == players[current].hashedHand);
        
        players[current].hand = _hand;
        players[current].hasRevealed = true;
        
        if (players[opponent].hasRevealed) {
            // Game on
            gameOver = true;
            setResultBalances();
        }
    }
    
    function setResultBalances() private {
        assert(gameOver);
        
        bool isDecided = false;
        uint i;
        uint length = players[0].hand.length;
        for (i = 0; i < length && isDecided == false; i++) {
            byte one = players[0].hand[i];
            byte two = players[1].hand[i];
            
            bool oneValid = isValidHand(one);
            bool twoValid = isValidHand(two);
            if (oneValid && twoValid) {
                if (one == 'R') {
                    if (two == 'P') {
                        isDecided = setWinner(1, this.balance);
                    } else if (two == 'S') {
                        isDecided = setWinner(0, this.balance);
                    }
                } else if (one == 'P') {
                    if (two == 'R') {
                        isDecided = setWinner(0, this.balance);
                    } else if (two == 'S') {
                        isDecided = setWinner(1, this.balance);
                    }
                } else {
                    // one -> 'S'
                    if (two == 'R') {
                        isDecided = setWinner(1, this.balance);
                    } else if (two == 'P') {
                        isDecided = setWinner(0, this.balance);
                    }
                }
            } else {
                if (oneValid) {
                    isDecided = setWinner(0, this.balance);
                } else {
                    isDecided = setWinner(1, this.balance);
                }
            }
        }
        if (isDecided == false) {
            isDecided = setWinner(0, this.balance / 2);
            isDecided = setWinner(1, this.balance / 2);
        }
        
        GameCompletedNormal(players[0].addr, winnings[players[0].addr], players[0].hand,
                            players[1].addr, winnings[players[1].addr], players[1].hand);
    }
    
    function setWinner(uint idx, uint amt) private returns (bool) {
        winnings[players[idx].addr] = amt;
        return true;
    }
    
    function withdraw() public {
        uint amt = winnings[msg.sender];
        if (amt > 0) {
            winnings[msg.sender] = 0;
            msg.sender.transfer(amt);
        }
    }
    
    function isValidHand(byte b) private pure returns (bool) {
        if (b == 'R' || b == 'P' || b == 'S') {
            return true;
        } else {
            return false;
        }
    }
    
    function getPlayers() private view returns (uint current, uint opponent) {
        if (msg.sender == players[0].addr) {
            return (0, 1);
        } else if (msg.sender == players[1].addr) {
            return (1, 0);
        } else {
            assert(false);
        }
    }
    
    modifier onlyBy(address _account) {
        require(msg.sender == _account);
        _;
    }
    
    modifier onlyAfter(uint _time) { 
        require (now > _time);
        _;
    }
    
    modifier onlyBefore(uint _time) {
        require (now <= _time);
        _;
    }
    
    modifier byAnyOneInvolved() {
        require(msg.sender == players[0].addr || msg.sender == players[1].addr || msg.sender == creator);
        _;
    }
    
    modifier onlyByPlayers() {
        require(msg.sender == players[0].addr || msg.sender == players[1].addr);
        _;
    }
    
    function withdrawlDueToTimeout() 
        onlyAfter(gameTimeout) 
        onlyByPlayers
        gameNotOver 
    public {
        // Must decide which player isn't following the rules and submitting on time
        var (current, opponent) = getPlayers();
        
        require(players[current].hasSubmitted);
        if (players[opponent].hasSubmitted == false) {
            // opponent at fault - give out money
            gameOver = true;
            transferEntireBalanceToSender();
        } else {
            require(players[current].hasRevealed);
            if (players[opponent].hasRevealed == false) {
                // opponent at fault - give out money
                gameOver = true;
                transferEntireBalanceToSender();
            }
        }
    }
    
    function transferEntireBalanceToSender() private {
        if (this.balance > 0) {
            msg.sender.transfer(this.balance);
        }
    }
    
    /// We have given enough time for the players to collect.
    /// Let anyone involve collect in a reasonable time frame
    function withdrawlDueToDefunc() onlyAfter(defuncTimeout) byAnyOneInvolved public {
        if (this.balance > 0) {
            msg.sender.transfer(this.balance);
        }
    }
    
    /// No one gives a shit - free money available to anyone (maybe keys lost?)
    function withdrawlDueToLostPlayers() onlyAfter(freeMoneyTimeout) public {
        if (this.balance > 0) {
            msg.sender.transfer(this.balance);
        }
    }
}

