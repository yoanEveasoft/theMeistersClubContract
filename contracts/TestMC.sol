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


contract TestMC is ERC721A, Ownable  {

    using Strings for uint;
    using SafeMath for uint256;

    event Staked(address owner, uint256 tokenId, uint256 timeframe);
    event Unstaked(address owner, uint256 tokenId, uint256 timeframe);

    address public stakingContract;
    address public poolContract;
    bytes32 public _root;
    bool public isActive;
    bool public isPresaleActive;
    string public baseURI;
    bool private isRevealed = false;

    struct Category {
    uint256 maxSupply;
    uint256 whitelistSupply;
    uint256 counterSupply;
    uint256 counterWhitelistSupply;
    uint256 NFTPrice;
}

    // Mapping category/info
    mapping(uint256 => Category) public categories;

    // Mapping id/category
    mapping(uint256 => uint256) public NFTcategory;

    // Is staked?
    mapping(uint256 => bool) public isStaked;


    constructor( string memory _baseURI, address _poolContract ) ERC721A("TestMC", "TESTMC") {
        baseURI = _baseURI;
        poolContract = _poolContract;
        categories[1].maxSupply = 299;
        categories[2].maxSupply = 199;
        categories[3].maxSupply = 99;
        categories[1].whitelistSupply = 20;
        categories[2].whitelistSupply = 20;
        categories[3].whitelistSupply = 20;
        categories[1].NFTPrice = 8000 * 10**6; // 8.000 USDC
        categories[2].NFTPrice = 18000 * 10**6; // 18.000 USDC
        categories[3].NFTPrice = 100000 * 10**6; // 100.000 USDC
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

    function getPrice() public view  returns (uint256) {
        StructLib.Slot memory slot = IUniswapPrice(poolContract).slot0();
        uint256 sqrtPriceX96 = uint256(slot.sqrtPriceX96);
        return sqrtPriceX96;
    } 

    // Function to change the supply of the selected categories
    function changeSupply( uint256[] calldata newSupplies) external onlyOwner{
        for (uint256 i = 0; i < 3 ; i++){
            if(newSupplies[i] != 0){
                require(newSupplies[i] > categories[i + 1].counterSupply, "new supply is inferior to actual minted supply");
                categories[i + 1].maxSupply = newSupplies[i];
            }
        }
    }

      // Function to change the supply of the selected categories
    function changeWhitelistSupply( uint256[] calldata newWhitelistSupplies) external onlyOwner{
        for (uint256 i = 0; i < 3 ; i++){
            if(newWhitelistSupplies[i] != 0){
                require(newWhitelistSupplies[i] > categories[i + 1].counterWhitelistSupply, "new whitelist supply is inferior to actual minted supply");
                categories[i + 1].whitelistSupply = newWhitelistSupplies[i];
            }
        }
    }

    // Function to change the price of the selected categories
    function changePrice( uint128[] calldata newPrices ) external onlyOwner{
            for (uint256 i = 0; i < 3 ; i++){
                if(newPrices[i] != 0){
                    categories[i + 1].NFTPrice = newPrices[i] * 10**6;
                }
            }
    }

    // Function to mint NFTs for giveaway and partnerships
    function mintByOwner(address _to, uint NFTtier) public onlyOwner {
        require(NFTtier < 4 && 0 < NFTtier, "Category is wrong");   
        require(
            categories[NFTtier].counterSupply + 1 <= categories[NFTtier].maxSupply,
            "Tokens number to mint cannot exceed number of MAX tokens category 1"
        );
        categories[NFTtier].counterSupply  ++;
        NFTcategory[totalSupply() ] = NFTtier;
        _safeMint(_to, 1);
    }

    // Function to mint all NFTs for giveaway and partnerships
    function mintMultipleByOwner(address[] memory _to, uint256[] calldata NFTtier) public onlyOwner {
        for (uint256 i = 0; i < _to.length; i++) {
            require(NFTtier[i] < 4 && 0 < NFTtier[i], "Category is wrong");
            require(
            categories[NFTtier[i]].counterSupply + 1 <= categories[NFTtier[i]].maxSupply,
            "Tokens number to mint cannot exceed number of MAX tokens category 1"
        );
            categories[NFTtier[i]].counterSupply  ++;
            NFTcategory[totalSupply()] = NFTtier[i];
            _safeMint(_to[i], 1);
                      
        }
    }

    // function for presale mint (whitelist)
    function presaleMint(
       uint256[] calldata _numOfTokens,
       bytes32[] calldata _proof
    ) external payable  isContractPresale {
       require(MerkleProof.verify(_proof, _root, keccak256(abi.encode(msg.sender))), "Not whitelisted");
        uint256 totalPrice = categories[1].NFTPrice * _numOfTokens[0] + categories[2].NFTPrice * _numOfTokens[1] + categories[3].NFTPrice * _numOfTokens[2];
        uint256 ethInUSDC = ((10 ** 12) * (2 ** 192)) / (getPrice() ** 2);
         require(
            totalPrice <= msg.value * ethInUSDC,
            "Ether value sent is not correct"
        ); 
       
        for (uint256 i = 0; i < 3 ; i++){
            require((categories[i + 1].whitelistSupply > categories[i + 1].counterWhitelistSupply +_numOfTokens[i]), "the presale max is reached for this nft tier");
        }

        for (uint256 i = 1; i < 4 ; i++){
            if(_numOfTokens[i-1] != 0){
            for(uint256 j = 0; j <  _numOfTokens[i-1]; j++){
            categories[i].counterWhitelistSupply ++;
            NFTcategory[totalSupply()] = i;
            }
            _safeMint(msg.sender, _numOfTokens[i-1]);
            }
        }
    }

    // function for regular mint
   function mintNFT(uint256[] calldata _numOfTokens ) public payable isContractPublicSale {
        uint256 totalPrice = categories[1].NFTPrice * _numOfTokens[0] + categories[2].NFTPrice * _numOfTokens[1] + categories[3].NFTPrice * _numOfTokens[2];
        uint256 ethInUSDC = ((10 ** 12) * (2 ** 192)) / (getPrice() ** 2);
            require(
            totalPrice <= msg.value * ethInUSDC,
            "Ether value sent is not correct"
        ); 
        
       for (uint256 i = 0; i < 3 ; i++){
            require((categories[i + 1].maxSupply > categories[i + 1].counterSupply + categories[i + 1].counterWhitelistSupply +_numOfTokens[i]), "the sale max is reached for this nft tier" );
        }

        for (uint256 i = 1; i < 4; i++){
            if(_numOfTokens[i-1] != 0){
                for(uint256 j = 0; j <  _numOfTokens[i-1]; j++){
                    categories[i].counterSupply ++;
                    NFTcategory[totalSupply()] = i;
                }
             _safeMint(msg.sender, _numOfTokens[i-1]);
        }
    }
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
        require(NFTcategory[_tokenId] > 0, "URI query for nonexistent token");
        if(isRevealed == true) {
            return string(abi.encodePacked(baseURI, _tokenId.toString(), ".json"));
        }
        else {
            return string(abi.encodePacked(baseURI, "hidden", NFTcategory[_tokenId].toString(), ".json"));
        }
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success, "!transfer");
    }
}