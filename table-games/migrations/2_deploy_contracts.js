var LiarsPokerRegistry = artifacts.require("LiarsPokerRegistry.sol");
var RockPaperScissorsGame = artifacts.require("RockPaperScissorsGame.sol");

module.exports = function(deployer) {
  deployer.deploy(LiarsPokerRegistry);
  deployer.deploy(RockPaperScissorsGame);
};
