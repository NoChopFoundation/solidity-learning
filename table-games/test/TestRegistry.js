var LiarsPokerRegistry = artifacts.require("LiarsPokerRegistry.sol");
var RockPaperScissorsGame = artifacts.require("RockPaperScissorsGame.sol");

//var x = LiarsPokerRegistry.new();

//console.log(LiarsPokerRegistry.isDeployed());


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


// I'm new to js
var signal = {};
function spinWait(name, timeout) {
	//console.log("signal=" + signal);
	if (signal[name]) {
		//console.log("def");
		return new Promise(function(resolve,reject) {
			resolve();
		});
	} else {
		//console.log("not def");
		var expiresAt = (new Date()).getTime() + timeout;
		return new Promise(function(resolve,reject) {
			var cancel = setInterval(function(){
				//console.log("in set interval");
				if (expiresAt < (new Date()).getTime()) {
					clearInterval(cancel);
					reject("waiting for signal '" + name + "' expired");
				} else {
					if (signal[name]) {
						clearInterval(cancel);
						resolve();
					}
				}
			}, 50);
		});
	}
}

function spinSignal(name) {
	signal[name]={};
}

var nextIndex = 0;
function getNextAccount() {
	return nextIndex ++;
}


contract('LiarsPokerRegistry', function(accounts) {
	var meta;
	it("should be open when it first is deployed", async function() {
		var isOpen;
		var meta = await LiarsPokerRegistry.deployed();
		
		isOpen = (await meta.isOpen.call());
		assert.equal(isOpen, true, "o");
		
		await meta.stop();
		isOpen = (await meta.isOpen.call());
		assert.equal(isOpen, false, "o");

		await meta.start();
		isOpen = (await meta.isOpen.call());
		assert.equal(isOpen, true, "o");
		
		var MAX_TABLES = 10;
		var i;
		for (i = 0; i < MAX_TABLES; i++) {
			var name = await meta.trufflePokerTableChannelName.call(i);
			assert.equal(solidityHexToStr(name), "EMPTY", "should all be empty");
		}
		
		var val = await meta.trufflePokerTableOpenSeats();
		assert.equal(val, MAX_TABLES, "should be " + MAX_TABLES);
		
		spinSignal('staticTests');
	});
	
	it("should be wait", async function() {
		await spinWait('staticTests', 30*1000);
	});
	
	it("must not allow outsiders into backdoor functions", function() {
		var CURRENT = getNextAccount();
		LiarsPokerRegistry.deployed().then(function(instance) {
			meta = instance;
			{
				meta.stop({from: accounts[CURRENT]}).then(function() {
					assert.equal(true, false, "Only owner can call method");
				}).catch(function(e) {
				});
			}
			{
				meta.dumpInternals({from: accounts[CURRENT]}).then(function() {
					assert.equal(true, false, "Only owner can call method");
				}).catch(function(e) {
				});
			}
			{
				meta.start({from: accounts[CURRENT]}).then(function() {
					assert.equal(true, false, "Only owner can call method");
				}).catch(function(e) {
				});
			}
		});
	});
	

	it("starts a game", async function() {
		var CURRENT = getNextAccount();
		await spinWait('staticTests', 30*1000);
		var meta = await LiarsPokerRegistry.deployed();
		
		await meta.playChannel("freds", 11, {from: accounts[CURRENT], value: 10})
		.then(function() {
			assert.equal(true, false, "can't start game without funding");
		})
		.catch(function (e) {
			// Expected, not 100% due to expected condition as it could of reverted for another reason
		});
		
		var call = await meta.playChannel("freds", 10, {from: accounts[CURRENT], value: 10});
		assert.equal(call.logs.length, 1, "event size");
		assert.equal(call.logs[0].event, "GameAvailable", "event ga");
		assertPokerTable(call.logs[0].args, "freds", accounts[CURRENT], 10, "freds create event");
		
		await meta.playChannel("freds", 5, {from: accounts[CURRENT], value: 5})
		.then(function() {
			assert.equal(true, false, "can't start multiple games");
		}).catch(function (e) {
			// Expected, not 100% due to expected condition as it could of reverted for another reason
		});
		
		await meta.cancelMyChannel({from: accounts[CURRENT]});
	});

	
	it("cancels a game", async function() {
		var CURRENT = getNextAccount();
		await spinWait('staticTests', 30*1000);
		var meta = await LiarsPokerRegistry.deployed();
		
		//var startingBalance = await web3.eth.getBalance(accounts[CURRENT]);

		var call = await meta.playChannel("jim", 20, {from: accounts[CURRENT], value: 20});
		var gasUsed = call.receipt.gasUsed;
		
		assert.equal(call.logs[0].event, "GameAvailable", "event ga");
		assertPokerTable(call.logs[0].args, "jim", accounts[CURRENT], 20, "jim create event");

		assert.equal(await meta.isMyChannelOpen.call({from: accounts[CURRENT]}), true, "checking channel open after create");

		await meta.cancelMyChannel({from: accounts[CURRENT]});
		assert.equal(await meta.isMyChannelOpen.call({from: accounts[CURRENT]}), false, "checking channel open after create");
		
		meta.cancelMyChannel({from: accounts[CURRENT]})
		.then(function() {
			assert.equal(true, false, "shouldn't be allowed to ")
		}).catch(function (e) {
		});
		
		meta.playChannel("EMPTY", 20, {from: accounts[CURRENT], value: 20})
		.then(function() {
			assert.equal(true, false, "shouldn't be allowed to to use name EMPTY ")
		}).catch(function (e) {
		});
	});
	
	it("kicks off a game", async function() {
		var PLAYER1 = getNextAccount();
		var PLAYER2 = getNextAccount();
		await spinWait('staticTests', 30*1000);
		var meta = await LiarsPokerRegistry.deployed();
		
		
		var call1 = await meta.playChannel("tim's game", 20, {from: accounts[PLAYER1], value: 20});
		assert.equal(call1.logs[0].event, "GameAvailable", "event ga");
		assertPokerTable(call1.logs[0].args, "tim's game", accounts[PLAYER1], 20, "tim's create event");
		
		
		var call2 = await meta.playChannel("tim's game", 20, {from: accounts[PLAYER2], value: 20});
		assert.equal(call2.logs[0].event, "GameCreated", "should created game");
		
		// Order is randomized
		var playerA = call2.logs[0].args.playerA;
		var playerB = call2.logs[0].args.playerB;
		
		if (playerA == accounts[PLAYER1]) {
			assert.equal(playerB, accounts[PLAYER2], "players must match event");
		} else if (playerA == accounts[PLAYER2]) {
			assert.equal(playerB, accounts[PLAYER1], "players must match event");
		} else {
			assert.equal(true, false, "players must match event");
		}
		
		assert.equal(await meta.isMyChannelOpen.call({from: accounts[PLAYER1]}), false, "checking channel open after launch");
		assert.equal(await meta.isMyChannelOpen.call({from: accounts[PLAYER2]}), false, "checking channel open after launch");
	});
	
	it("tests game rules", async function() {
		var PLAYER1 = getNextAccount();
		var PLAYER2 = getNextAccount();
		await spinWait('staticTests', 30*1000);
		var meta = await LiarsPokerRegistry.deployed();
		
		
		await assertGameExecution(meta, "rich", 300, "game variation 1",
				accounts[PLAYER1], "RRRRR", 0, accounts[PLAYER2], "PPPPP", 600);
		
		await assertGameExecution(meta, "rich", 1, "game variation 2",
				accounts[PLAYER1], "PPPPP", 2, accounts[PLAYER2], "RRRRR", 0);
		
		await assertGameExecution(meta, "rich", 300, "game variation 3",
				accounts[PLAYER1], "RRRRR", 600, accounts[PLAYER2], "SSSSS", 0);
		
		await assertGameExecution(meta, "rich", 300, "game variation 4",
				accounts[PLAYER1], "SSSSS", 0, accounts[PLAYER2], "RRRRR", 600);
		
		await assertGameExecution(meta, "rich", 300, "game variation 5",
				accounts[PLAYER1], "PPPPP", 0, accounts[PLAYER2], "SSSSS", 600);
		
		await assertGameExecution(meta, "rich", 300, "game variation 6",
				accounts[PLAYER1], "SSSSS", 300, accounts[PLAYER2], "SSSSS", 300);
		
		await assertGameExecution(meta, "rich", 300, "game variation 7",
				accounts[PLAYER1], "RRRRR", 0, accounts[PLAYER2], "RPPPP", 600);
		
		await assertGameExecution(meta, "rich", 300, "game variation 8",
				accounts[PLAYER1], "RRRRR", 0, accounts[PLAYER2], "RRPPP", 600);
		
		await assertGameExecution(meta, "rich", 300, "game variation 9",
				accounts[PLAYER1], "RRRPP", 600, accounts[PLAYER2], "RRRRR", 0);
		
		await assertGameExecution(meta, "rich", 300, "game variation A",
				accounts[PLAYER1], "RRRRR", 0, accounts[PLAYER2], "RRRRP", 600);
		
		await assertGameExecution(meta, "rich", 300, "game variation B",
				accounts[PLAYER1], "RRRRR", 300, accounts[PLAYER2], "RRRRR", 300);
		
		await assertGameExecution(meta, "rich", 300, "game variation C",
				accounts[PLAYER1], "PPPPR", 600, accounts[PLAYER2], "PPPPS", 0);
		
		await assertGameExecution(meta, "rich", 300, "game variation D",
				accounts[PLAYER1], "PPRPP", 600, accounts[PLAYER2], "PPSPP", 0);

	}); 
	
	//TODO  test switch start order?
});

async function assertGameExecution(
		registryMeta,
		gameName,
		gameAmt,
		msgIfErr,
		player1Addr, player1Hand, player1ExpectedResult,
		player2Addr, player2Hand, player2ExpectedResult
	) {
	
	console.log(registryMeta);
	
	var gameAddr = await launchGame(registryMeta, player1Addr, player2Addr, gameName, gameAmt);	
	var metaGame = await RockPaperScissorsGame.at(gameAddr);
	
	await assertPlayer(metaGame, player1Addr, false, false, msgIfErr + " initial player");
	await assertPlayer(metaGame, player2Addr, false, false, msgIfErr + " initial player");
	
	assert.equal((await metaGame.getGameBalance.call({from: player1Addr})).toNumber(), gameAmt*2, "properly funded");
	
	var salt1 = hexInput(random32());
	var salt2 = hexInput(random32());
	var hand1 = hexInput(player1Hand);
	var hand2 = hexInput(player2Hand);
	var bid1 = await metaGame.createBidUtility.call(hand1, salt1);
	var bid2 = await metaGame.createBidUtility.call(hand2, salt2);
	
	await metaGame.submitHashedHand(bid1, {from: player1Addr});
	await metaGame.submitHashedHand(bid2, {from: player2Addr});
	
	assert.equal(bid1, await metaGame.getMyHashedHand.call({from: player1Addr}), msgIfErr + " bid1 computed");
	assert.equal(bid2, await metaGame.getMyHashedHand.call({from: player2Addr}), msgIfErr + " bid2 computed");

	await assertPlayer(metaGame, player1Addr, true, false, msgIfErr + " initial player");
	await assertPlayer(metaGame, player2Addr, true, false, msgIfErr + " initial player");
	
	var final1 =  await metaGame.revealHand(hand1, salt1,  {from: player1Addr})
	var final2 =  await metaGame.revealHand(hand2, salt2,  {from: player2Addr})
	
	assert.equal(final1.logs.length, 0, msgIfErr + " no events expected");
	assert.equal(final2.logs.length, 1, msgIfErr + " 1 event expected");
	
	assertGameCompletedNormal(final2.logs[0].args, 
			player1Addr, player1ExpectedResult, hand1, 
			player2Addr, player2ExpectedResult, hand2, 
			msgIfErr + " end to end" );
	
	if (player1ExpectedResult > 0) {
		var startingBalance = (await web3.eth.getBalance(player1Addr)).toNumber();
		var tx = await metaGame.withdraw({from: player1Addr});
		var endingBalance = (await web3.eth.getBalance(player1Addr)).toNumber();
		
		//console.log("player1ExpectedResult = "+player1ExpectedResult + "," + (endingBalance - startingBalance) );
		//console.log(tx);
		//console.log("blockNumber=" + web3.eth.blockNumber);
	}
	if (player2ExpectedResult > 0) {
		var startingBalance = (await web3.eth.getBalance(player2Addr)).toNumber();
		var tx = await metaGame.withdraw({from: player2Addr});
		var endingBalance = (await web3.eth.getBalance(player2Addr)).toNumber();
	}
	
	
	assert.equal((await metaGame.getGameBalance.call({from: player1Addr})).toNumber(), 0, "drain funds");
	
	
	
}

function random32() {
	var result="", i;
	for (i = 0; i < 32; i++) {
		var r = getRandomInt(0,10);
		result += "" + r;
	}
	return result;
}

function assertGameCompletedNormal(args, p1, p1Bal, p1Hand, p2, p2Bal, p2Hand, msg) {
	// The order of player is random
	var tmpP1, tmpP1Hand, tmpP1Bal;
	if (args.p1 != p1) {
		tmpP1 = p1;
		tmpP1Hand = p1Hand;
		tmpP1Bal = p1Bal;
		p1 = p2;
		p1Bal = p2Bal;
		p1Hand = p2Hand;
		p2 = tmpP1;
		p2Bal = tmpP1Bal;
		p2Hand = tmpP1Hand;
	}
	assert.equal(args.p1, p1, msg + " p1");
	assert.equal(args.p2, p2, msg + " p2");
	assert.equal(args.p1Bal.toNumber(), p1Bal, msg + " p1Bal");
	assert.equal(args.p2Bal.toNumber(), p2Bal, msg + " p2Bal");
	assert.equal(args.p1Hand, p1Hand, msg + " p1Hand");
	assert.equal(args.p2Hand, p2Hand, msg + " p2Hand");
}

function hexInput(str) {
	var i, result="0x";
	for (i = 0; i < str.length; i++) {
		result += hexStr(str.substr(i, 1));
	}
	return result;
}

function hexStr(s) {
	return "" + s.charCodeAt(0).toString(16);
}

async function assertPlayer(metaGame, playerAddr, hasSubmitted, hasRevealed, msg) {
	assert.equal(await metaGame.getMyHasSubmitted.call({from: playerAddr}), hasSubmitted, msg);
	assert.equal(await metaGame.getMyHasRevealed.call({from: playerAddr}), hasRevealed, msg);
}


async function launchGame(meta, addr1, addr2, channelName, amt) {	
	var call1 = await meta.playChannel(channelName, amt, {from: addr1, value: amt});
	
	assert.equal(call1.logs[0].event, "GameAvailable", "event ga");
	assertPokerTable(call1.logs[0].args, channelName, addr1, amt, channelName + " create event");
		
	var call2 = await meta.playChannel(channelName, amt, {from: addr2, value: amt});
	assert.equal(call2.logs[0].event, "GameCreated", "should created game");
	
	// Order is randomized
	var playerA = call2.logs[0].args.playerA;
	var playerB = call2.logs[0].args.playerB;
	
	if (playerA == addr1) {
		assert.equal(playerB, addr2, "players must match event");
	} else if (playerA == addr2) {
		assert.equal(playerB, addr1, "players must match event");
	} else {
		assert.equal(true, false, "players must match event");
	}
	
	assert.equal(await meta.isMyChannelOpen.call({from: addr1}), false, "checking channel open after launch");
	assert.equal(await meta.isMyChannelOpen.call({from: addr2}), false, "checking channel open after launch");
	
	return call2.logs[0].args.gameContract;
}

function assertPokerTable(pokerTable, channelName, creator, amt, errMsg) {
	assert.equal(solidityHexToStr(pokerTable.channelName), channelName, errMsg + " event");
	assert.equal(pokerTable.creator, creator, errMsg + " creator");
	assert.equal(pokerTable.tableStakes.toNumber(), amt, errMsg + " tableStakes");	
}


function getRandomArbitary (min, max) {
    return Math.random() * (max - min) + min;
}
function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


//var event = meta.allEvents();
//event.watch(function (error, result) {
//    if (error) {
//        console.err(error);
//    } else {
//    	console.log("event -> " + result.event);
//        // now we'll check that the events are correct
//
//        //assert.equal(result.event, "Deposit");
//        //assert.equal(web3.fromWei(result.args.amount.valueOf(), "ether"), 1);
//        //assert.equal(result.args._sender.valueOf(), web3.eth.accounts[0]);
//
//        //event.stopWatching();
//    }
//});
//
//	var MAX_TABLES = 10;
//	var i;
//
//	it("has limited tables", function() {
//
//		LiarsPokerRegistry.deployed().then(function(instance) {
//			meta = instance;
//			
//			for (i = 0; i < MAX_TABLES; i++) {
//				meta.trufflePokerTableChannelName.call(i).then(function(results) {
//					assert.equal(solidityHexToStr(results), "EMPTY", "should all be empty");
//				}).catch(function(e) {
//					assert.equal(true, false, "exception test empty");
//				});
//			}
//			return ;
//		});
//
//	});
//	
//	it("should have " + MAX_TABLES + " tables available", function() {
//		LiarsPokerRegistry.deployed().then(function(instance) {
//			meta = instance;
//			return meta.trufflePokerTableChannelName();
//		}).then(function(val) {
//			assert.equal(val, MAX_TABLES, "should be " + MAX_TABLES);
//		});
//	});
//	
//	
//	//console.log(accounts[0]);
//	
//	
//	it("should be open still", function() {
//		LiarsPokerRegistry.deployed().then(function(instance) {
//			meta = instance;
//			return meta.isOpen.call();
//		}).then(function(isOpen) {
//			assert.equal(true, isOpen, "should be");
//		});
//	});
//
//
//	it("requires enough money to fund game", function() {
//		LiarsPokerRegistry.deployed().then(function(instance) {
//			meta = instance;
//			//console.log(web3.eth.getBalance(accounts[0]).toNumber() );
//			return meta.playChannel("freds", 10, {from: accounts[2], value: 10})
//			.catch(function(e) {
//				console.log(e);
//			});
//		});
//			
//	});
	
			
	
	
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
	
//});
