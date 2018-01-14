var LiarsPokerRegistry = artifacts.require("LiarsPokerRegistry.sol");

// Getting bytes32 in format 0xHEXHEX
function solidityHexToStr(str1) {
	var hex  = str1.toString();
	var str = '';
	for (var n = 2; n < hex.length; n += 2) {
		if (hex.substr(n, 2) == '00')
			return str;
		
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	return str;
}

contract('LiarsPokerRegistry', function(accounts) {
	var meta;
	it("should be open when it first is deployed", function() {
		LiarsPokerRegistry.deployed().then(function(instance) {
			meta = instance;
			return meta.isOpen.call();
		}).then(function(isOpen) {
			assert.equal(isOpen, true, "should be open upon start");
			console.log("stopping" + (new Date()).getMilliseconds() );
			return meta.stop();
		}).then(function() {
			console.log("stopping rt");
			return meta.isOpen.call();
		}).then(function(isOpen) {
			assert.equal(isOpen, false, "should be closed when we close it");
			console.log("starting");
			return meta.start();
		}).then(function() {
			console.log("starting rt");
			return meta.isOpen.call();
		}).then(function(isOpen) {
			assert.equal(isOpen, true, "should be open after restarting");
		});
	});
});

contract('LiarsPokerRegistry', function(accounts) {
	
	var meta;
	
	it("must not allow outsiders into backdoor functions", function() {
		LiarsPokerRegistry.deployed().then(function(instance) {
			meta = instance;
			{
				meta.stop({from: accounts[2]}).then(function() {
					assert.equal(true, false, "Only owner can call method");
				}).catch(function(e) {
				});
			}
			{
				meta.dumpInternals({from: accounts[2]}).then(function() {
					assert.equal(true, false, "Only owner can call method");
				}).catch(function(e) {
				});
			}
			{
				meta.start({from: accounts[2]}).then(function() {
					assert.equal(true, false, "Only owner can call method");
				}).catch(function(e) {
				});
			}
		});
	});
	
	
	var MAX_TABLES = 10;
	var i;

	it("has limited tables", function() {	
		LiarsPokerRegistry.deployed().then(function(instance) {
			meta = instance;
			
			for (i = 0; i < MAX_TABLES; i++) {
				meta.trufflePokerTableChannelName.call(i).then(function(results) {
					assert.equal(solidityHexToStr(results), "EMPTY", "should all be empty");
				}).catch(function(e) {
					assert.equal(true, false, "exception test empty");
				});
			}
			return ;
		});
	});
	
	it("should have " + MAX_TABLES + " tables available", function() {
		LiarsPokerRegistry.deployed().then(function(instance) {
			meta = instance;
			return meta.trufflePokerTableChannelName();
		}).then(function(val) {
			assert.equal(val, MAX_TABLES, "should be " + MAX_TABLES);
		});
	});
	
	
	//console.log(accounts[0]);
	
	
	it("should be open still", function() {
		LiarsPokerRegistry.deployed().then(function(instance) {
			meta = instance;
			console.log("xxx " + (new Date()).getMilliseconds());
			return meta.isOpen.call();
		}).then(function(isOpen) {
			console.log("yyy ");
			assert.equal(true, false, "should be");
		});
	});


	it("requires enough money to fund game", function() {
		LiarsPokerRegistry.deployed().then(function(instance) {
			meta = instance;
			//console.log(web3.eth.getBalance(accounts[0]).toNumber() );
			return meta.playChannel("freds", 10, {from: accounts[2], value: 10})
			.catch(function(e) {
				console.log(e);
			});
		});
			
	});
	
			
	
	
	/**
	LiarsPokerRegistry.deployed().then(function(instance) {
		//return instance.truffleMyBalance();
	}).then(function(val) {
		console.log(val.toNumber() );		
	});*/
	
	
	/**
	var meta;
	LiarsPokerRegistry.deployed().then(function(instance) {
		meta = instance;
		return meta.start();
	}).then(function() {
		console.log("called stop");
	}).then(function() {
		return meta.isOpen.call();
	}).then(function(isOpen) {
		console.log("linked=" + isOpen);
	}).catch(function(e) {
		console.log(e);
	});
	**/
	
	/**
	var meta;
	MetaCoin.deployed().then(function(instance) {
	  meta = instance;
	  return meta.sendCoin(account_two, 10, {from: account_one});
	}).then(function(result) {
	  // If this callback is called, the transaction was successfully processed.
	  alert("Transaction successful!")
	}).catch(function(e) {
	  // There was an error! Handle it.
	})
	
	
	///////////
	
	it("should put 10000 MetaCoin in the first account", function() {
		return LiarsPokerRegistry.deployed().then(function(instance) {
			return instance.dumpInternals.call();
		}).then(function(balance) {
			console.log(balance);
			assert.equal(balance, false,
					"10000 wasn't in the first account");
		});
	});
	*/
	
});