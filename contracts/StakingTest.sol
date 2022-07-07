// SPDX-License-Identifier: MIT

pragma solidity ^0.8.14;

contract StakingTestMC {

    address NFTContract;

    interface ITestMC{
        function stakeNFT(uint256 tokenId) external;
        function unstakeNFT(uint256 tokenId) external;
        function ownerOf(uint256 tokenId) external;
    }

    constructor (address _NFTcontract){
        NFTContract = _NFTcontract;
    }

    function staking(uint256 tokenId) external {
        require(ITestMC(NFTContract).ownerOf(tokenId) == msg.sender, "Not owner of NFT");
        ITestMC(NFTContract).stakeNFT(tokenId);
    }

     function batchStake(uint256[] memory _tokenIds) public  {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            stake(_tokenIds[i]);
        }
    }

        function unstaking(uint256 tokenId) external {
        require(ITestMC(NFTContract).ownerOf(tokenId) == msg.sender, "Not owner of NFT");
        ITestMC(NFTContract).unstakeNFT(tokenId);
    }

     function batchUnstake(uint256[] memory _tokenIds) public {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            unstake(_tokenIds[i]);
        }
    }

}