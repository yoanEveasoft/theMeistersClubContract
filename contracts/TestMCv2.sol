// SPDX-License-Identifier: MIT

pragma solidity ^0.8.14;


import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


import "hardhat/console.sol";

library StructLib {
    struct Slot{
        uint160 sqrtPriceX96;
        int24 tick;
        uint16 observationIndex;
        uint16 observationCardinality;
        uint16 observationCardinalityNext;
        uint8 feeProtocol;
        bool unlocked;
    }
}

interface IUniswapPrice {
    function slot0() view external returns (StructLib.Slot memory);
}


contract TestMCV2 is ERC721A, Ownable  {

    using Strings for uint;
    using SafeMath for uint256;

    event Staked(address owner, uint256 tokenId, uint256 timeframe);
    event Unstaked(address owner, uint256 tokenId, uint256 timeframe);

    address public stakingContract;
    address public poolContract;
    bytes32 public _root;
    bool public isActive;
    bool public isPresaleActive;
    string private baseURI;
    string private blindURI;
    bool private isRevealed = false;
    uint256 public maxSupply = 5000;
    uint256 public whitelistSupply = 1000;
    uint256 public nftPrice = 750 * 10 ** 6; // 750 USDC


    // Is staked?
    mapping(uint256 => bool) public isStaked;


    constructor( string memory _baseURI, address _poolContract ) ERC721A("TestMC", "TESTMC") {
        baseURI = _baseURI;
        poolContract = _poolContract;
    }

    modifier isStakingContract {
        require(msg.sender == stakingContract);
        _;
    }
    modifier isContractPublicSale {
        require(isActive == true, "Contract is not active");
        require(isPresaleActive == false, "Presale is still active");
        _;
    }
    modifier isContractPresale {
        require(isActive == true, "Contract is not active");
        require(isPresaleActive == true, "Presale is not opened yet");
        _;
    }

    function setMerkleRoot(bytes32 root) public onlyOwner {
        _root = root;
    }

    function setBaseUri(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    function setIsActive() external onlyOwner {
            isActive = !isActive;
    }

    function setPresaleActive() external onlyOwner {
        isPresaleActive = !isPresaleActive;
    }

    function setRevealCollection() external onlyOwner {
        isRevealed = true;
    }

    // Mainnet
    function getPrice() public view  returns (uint256) {
        StructLib.Slot memory slot = IUniswapPrice(poolContract).slot0();
        uint256 sqrtPriceX96 = uint256(slot.sqrtPriceX96);
        return sqrtPriceX96;
    } 

    // Test
    //   function getPrice() public pure  returns (uint256) {
    //     uint256 sqrtPriceX96 = 2301336933455729618606400047051907;
    //     return sqrtPriceX96;
    // } 

    // Function to change the supply of the selected categories
    function changeSupply( uint256  newSupply) external onlyOwner{
                require(newSupply > totalSupply(), "new supply is inferior to actual minted supply");
                maxSupply = newSupply;
    }

      // Function to change the supply of the selected categories
    function changeWhitelistSupply( uint256 newWhitelistSupply) external onlyOwner{
          require(newWhitelistSupply < maxSupply  , "new supply is inferior to actual minted supply");
                whitelistSupply = newWhitelistSupply;
    }

    // Function to change the price of the selected categories
    function changePrice( uint128 newPrice ) external onlyOwner{
        nftPrice = newPrice * 10 ** 6;
    }

    // Function to mint NFTs for giveaway and partnerships
    function mintByOwner(address _to) public onlyOwner {
        require(
            totalSupply() + 1 <= maxSupply,
            "Tokens number to mint cannot exceed number of MAX tokens category 1"
        );
        _safeMint(_to, 1);
    }

    // Function to mint all NFTs for giveaway and partnerships
    function mintMultipleByOwner(address[] memory _to) public onlyOwner {
        require(
            totalSupply() + _to.length <= maxSupply,
            "Tokens number to mint cannot exceed number of tokens"
        );
        for (uint256 i = 0; i < _to.length; i++) {
            _safeMint(_to[i], 1); 
        }
    }

    // function for presale mint (whitelist)
    function presaleMint(
       uint256  _numOfTokens,
       bytes32[] calldata _proof
    ) external payable  isContractPresale {
       require(MerkleProof.verify(_proof, _root, keccak256(abi.encode(msg.sender))), "Not whitelisted");
        require((whitelistSupply > totalSupply() + _numOfTokens), "the presale max is reached");
        uint256 totalPrice = nftPrice * _numOfTokens ;
        uint256 ethInUSDC = ((10 ** 12) * (2 ** 192)) / (getPrice() ** 2);
         require(
            (totalPrice/10**6) <= ((msg.value * ethInUSDC)/10**18),
            "Ether value sent is not correct"
        ); 
        _safeMint(msg.sender, _numOfTokens);
    }

    // function for regular mint
   function mintNFT(uint256 _numOfTokens ) public payable isContractPublicSale {
       require((maxSupply > totalSupply() + _numOfTokens), "the sale max is reached");
        uint256 totalPrice = nftPrice * _numOfTokens ;
        uint256 ethInUSDC = ((10 ** 12) * (2 ** 192)) / (getPrice() ** 2);
        require(
            (totalPrice/10**6) <= ((msg.value * ethInUSDC)/10**18),
            "Ether value sent is not correct"
        ); 
        _safeMint(msg.sender, _numOfTokens);
      
   }

    // Stake function, to stake ur function
    function stakeNFT(uint256 tokenId) external isStakingContract {
        isStaked[tokenId] = true;
        emit Staked(msg.sender, tokenId, block.timestamp);
    }

    // Unstake funtion, to unstake ur function
    function unstakeNFT(uint256 tokenId) external isStakingContract {
        isStaked[tokenId] = false;
        emit Unstaked(msg.sender, tokenId, block.timestamp);
    }


    // Set the NFT not available for transfer if it's staked
    function _beforeTokenTransfers(address from,
        address to,
        uint256 startTokenId,
        uint256 quantity) internal override { 
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
        require(isStaked[startTokenId] == false, "your NFT is not available for transfer");
    }

    // tokenURI is the link to the metadatas
    function tokenURI(uint _tokenId) public view virtual override returns (string memory) {
         require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
      if (!isRevealed) {
            return string(abi.encodePacked(blindURI));
        } else {
            return string(abi.encodePacked(baseURI, _tokenId.toString()));
        }
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success, "!transfer");
    }
}