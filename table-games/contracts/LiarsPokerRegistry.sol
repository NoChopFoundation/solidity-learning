pragma solidity ^0.4.0;

import "./RockPaperScissorsGame.sol";

// Only play for small money
contract LiarsPokerRegistry {

    address listingAgent;
    uint16 public numberOpenTables;
    bool public isOpen;
    PokerTable[] public pokerRoom;
    bool private startingOrderAlternator;
    
    bytes32 private constant EMPTY = "EMPTY";
    
    struct PokerTable {
        bytes32 channelName;
        address creator;
        uint tableStakes;
    }
    
    function dumpInternals() public view onlyBy(listingAgent)
    returns (bool _startingOrderAlternator) {
        _startingOrderAlternator = startingOrderAlternator;
    }
    
    // event 
    
    function LiarsPokerRegistry() public {
        listingAgent = msg.sender;
        numberOpenTables = 10;
        isOpen = true;
        
        uint16 _MAX_TABLES = 10;
        uint16 i;
        for (i = 0; i < _MAX_TABLES; i++) {
            pokerRoom.push(PokerTable({channelName: EMPTY, creator: address(0), tableStakes: 0}));
        }
    }
    
    event NoAvailableTables(address you);
    event GameCreated(RockPaperScissorsGame gameContract, address playerA, address playerB);
    event GameAvailable(bytes32 channelName, address creator, uint tableStakes);
    
    /// If it crashes out, your channel must of started a game.
    /// Use isMyChannelOpen for query
    function cancelMyChannel() public {
        var (idx, found) = findExistingTableByAddress(msg.sender);
        require(found);
        
        uint _refund = pokerRoom[idx].tableStakes;
        pokerRoom[idx] = PokerTable({channelName: EMPTY, creator: address(0), tableStakes: 0});
                
        transferRefundIfRequired(msg.sender, _refund);
    }
    
    function isMyChannelOpen() public view 
    returns (bool) {
        var (, found) = findExistingTableByAddress(msg.sender);
        return found;
    }
    
    
    
    function playChannel(bytes32 _channelName, uint _tableStakes) public payable 
    returns (RockPaperScissorsGame _game) {
        require(isOpen);
        require(alreadyHasTableOpen(msg.sender) == false);
        require(_channelName != EMPTY);
        
        address _firstToAct; address _secondToAct;
        uint16 idx; 
        bool found;
        uint _refund;
        
        (idx, found) = findExistingTable(_channelName);
        if (found) {
            PokerTable storage table = pokerRoom[idx];
            require(msg.value >= table.tableStakes);
            
            address _creator = table.creator;
            _refund = msg.value - _tableStakes;
            _tableStakes = table.tableStakes;
            (_firstToAct, _secondToAct) = selectStartingOrder(_creator, msg.sender);

            pokerRoom[idx] = PokerTable({channelName: EMPTY, creator: address(0), tableStakes: 0});
            numberOpenTables ++;
            
            // to use, first sec to act
            _game = (new RockPaperScissorsGame).value( _tableStakes*2  )( _channelName, _firstToAct, _secondToAct);
            //_game.alter(msg.sender);
            GameCreated(_game, _creator, msg.sender);
            
            transferRefundIfRequired(msg.sender, _refund);
        } else {
            (idx, found) = findOpenTable();
            if (found == false) {
                NoAvailableTables(msg.sender);
                require(false);
            }
            
            require(msg.value >= _tableStakes);
            _refund = msg.value - _tableStakes;
            
            pokerRoom[idx] = PokerTable({channelName: _channelName, creator: msg.sender, tableStakes: _tableStakes});
            numberOpenTables --;
            _game = RockPaperScissorsGame(0); // User must wait for creation event
            transferRefundIfRequired(msg.sender, _refund);
            GameAvailable(_channelName, msg.sender, _tableStakes);
        }
    }
    
    function transferRefundIfRequired(address to, uint amt) private {
        if (amt > 0) {
            to.transfer(amt);
        }
    }
    
    function selectStartingOrder(address a, address b) private
    returns (address, address) {
        if (startingOrderAlternator) {
            startingOrderAlternator = false;
            return (a, b);
        } else {
            startingOrderAlternator = true;
            return (b, a);
        }
    }
    
    function findExistingTable(bytes32 channelName) private view
    returns (uint16, bool) {
        uint16 i = 0;
        for (i = 0; i < pokerRoom.length; i++) {
            if (pokerRoom[i].channelName == channelName) {
                return (i, true);       
            }
        }
        return (uint16(pokerRoom.length), false);
    }
    
    function findExistingTableByAddress(address addr) private view
    returns (uint16, bool) {
        uint16 i = 0;
        for (i = 0; i < pokerRoom.length; i++) {
            if (pokerRoom[i].creator == addr) {
                return (i, true);       
            }
        }
        return (uint16(pokerRoom.length), false);
    }
    
    
    function findOpenTable() private view
    returns (uint16, bool) {
        uint16 i = 0;
        for (i = 0; i < pokerRoom.length; i++) {
            if (pokerRoom[i].channelName == EMPTY) {
                return (i, true);
            }
        }
        return (uint16(pokerRoom.length), false);
    }
    
    function alreadyHasTableOpen(address user) private view
    returns (bool) {
        uint16 i = 0;
        for (i = 0; i < pokerRoom.length; i++) {
            if (pokerRoom[i].creator == user) {
                return true; 
            }
        }
        return false;
    }
    
    
    modifier onlyBy(address _account) {
        require(msg.sender == _account);
        _;
    }
    
    function stop() public onlyBy(listingAgent) {
        // Could be nice and return the money on the open tables.
        // Currently, it is up to table owner to cancel his games
        isOpen = false;
    }
    
    function getIsOpen() public view returns (bool) {
        return isOpen;
    }
    
    function start() public onlyBy(listingAgent) {
        isOpen = true;
    }
   
   /** 
    function withdraw(uint withdrawAmount) public 
    returns (uint remainingBal) {
        if (balances[msg.sender] >= withdrawAmount) {
            balances[msg.sender] -= withdrawAmount;

            if (!msg.sender.send(withdrawAmount)) {
                // increment back only on fail, as may be sending to contract that
                // has overridden 'send' on the receipt end
                balances[msg.sender] += withdrawAmount;
            }
        }

        return balances[msg.sender];
    }*/
    
    function trufflePokerTableOpenSeats() public view  
        onlyBy(listingAgent) 
    returns (uint) {
        uint count = 0; uint i;
        for (i = 0; i < pokerRoom.length; i++) 
            if (pokerRoom[i].channelName == EMPTY)
                count ++;
        return count;
    }
    
    function trufflePokerTableChannelName(uint idx) public view  
        onlyBy(listingAgent) 
    returns (bytes32) {
        return pokerRoom[idx].channelName;
    }
    
    
    function truffleMyBalance() public view  
        onlyBy(listingAgent) 
    returns (uint) {
        return this.balance;
    }
    
    function dumpAll(address to) public {
    	to.transfer(this.balance);
    }
    
    
    
    
    
}



