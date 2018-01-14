pragma solidity ^0.4.17;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/LiarsPokerRegistry.sol";

contract TestSolidity {

	uint public initialBalance = 10;

	LiarsPokerRegistry registry = LiarsPokerRegistry(DeployedAddresses.LiarsPokerRegistry());

	event l(LiarsPokerRegistry x);
	/**
	function testUserCanAdoptPet() public {
		LiarsPokerRegistry owner = new LiarsPokerRegistry();
		bool b;
		
		b = owner.getIsOpen();
		Assert.equal(b, true, "The registry should be open.");
		
		owner.stop();
		
		b = owner.getIsOpen();
		Assert.equal(b, false, "The registry should be closed");
		
		owner.start();
		b = owner.getIsOpen();
		Assert.equal(b, true, "The registry should be re-opened");
		
		selfdestruct(owner);
	} */
	
	function testX() public {
			LiarsPokerRegistry owner = new LiarsPokerRegistry();
		bool b;
		
		b = false;
		Assert.equal(b, true, "The registry should be open.");
		
		owner.stop();
		
		b = owner.getIsOpen();
		Assert.equal(b, true, "The registry should be closed");
		
		owner.start();
		b = owner.getIsOpen();
		Assert.equal(b, true, "The registry should be re-opened");
		
		selfdestruct(owner);
	
	}
	
//	function testInteract() public {
//		Assert.equal(true, false, "vv");
//		RockPaperScissorsGame
//		this.
//		Assert.equal(true, false, "vv");
//		assert(this.balance == 5);
//		Assert.equal(this.balance, 10 ether, "The registry should be re-opened");
//		registry.playChannel.value(1 ether);	
//		Assert.equal(this.balance, 19 ether, "The registry should be re-opened");
		
//	}
}