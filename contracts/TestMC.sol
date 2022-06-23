// SPDX-License-Identifier: MIT

pragma solidity ^0.8.14;


import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract TestMC is ERC721A, Ownable  {

        using Strings for uint;
        using SafeMath for uint256;

        address public stakingContract;
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


        constructor( string memory _baseURI) ERC721A("TestMC", "TESTMC") {
            baseURI = _baseURI;
            categories[1].maxSupply = 299;
            categories[2].maxSupply = 199;
            categories[3].maxSupply = 99;
            categories[1].whitelistSupply = 30;
            categories[2].whitelistSupply = 20;
            categories[3].whitelistSupply = 4;
            categories[1].NFTPrice = 11 ether;
            categories[2].NFTPrice = 32 ether;
            categories[3].NFTPrice = 98 ether;
        }

          modifier isStakingContract {
            require(msg.sender == stakingContract);
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

        // Function to change the supply of the selected categories
        function changeSupply( uint256[] calldata newSupplies) external onlyOwner{
            for (uint256 i = 0; i < 3 ; i++){
                if(newSupplies[i] != 0){
                    require(newSupplies[i] > categories[i + 1].counterSupply, "new supply is inferior to actual minted supply");
                    categories[i + 1].maxSupply = newSupplies[i];
                }
            }
        }

           // Function to change the price of the selected categories
        function changePrice( uint256[] calldata newPrices ) external onlyOwner{
            for (uint256 i = 0; i < 3 ; i++){
                if(newPrices[i] != 0){
                    categories[i + 1].NFTPrice = newPrices[i];
                }
            }
        }
 
    /*
     * Function to mint NFTs for giveaway and partnerships
     */
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

    /*
     * Function to mint all NFTs for giveaway and partnerships
     */
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
    ) external payable {

        require(isActive, "Contract is not active");
        require(isPresaleActive, "Presale is not opened yet");
        require(
            verify(_proof, bytes32(uint256(uint160(msg.sender)))),
            "Not whitelisted"
        );
        require(
            categories[1].NFTPrice.mul(_numOfTokens[0]).add(categories[2].NFTPrice.mul(_numOfTokens[1])).add(categories[3].NFTPrice.mul(_numOfTokens[2])) <= msg.value,
            "Ether value sent is not correct"
        );

        for (uint256 i = 0; i < 3 ; i++){
            require((categories[i + 1].whitelistSupply > categories[i + 1].counterWhitelistSupply +_numOfTokens[i]), "the presale max is reached for this nft tier");
        }

        for (uint256 i = 1; i < 4 ; i++){
        for(uint256 j = 0; j <  _numOfTokens[i-1]; j++){
            categories[i].counterWhitelistSupply ++;
            NFTcategory[totalSupply()] = i;
            _safeMint(msg.sender, 1);
            }
        
        }
    }

    // function for regular mint
   function mintNFT(uint256[] calldata _numOfTokens ) public payable {
        require(isActive, "Contract is not active");
        require(!isPresaleActive, "Presale is still active");
        require(
            categories[1].NFTPrice.mul(_numOfTokens[0]).add(categories[2].NFTPrice.mul(_numOfTokens[1])).add(categories[3].NFTPrice.mul(_numOfTokens[2])) <= msg.value,
            "Ether value sent is not correct"
        );

        for (uint256 i = 0; i < 3 ; i++){
            require((categories[i + 1].maxSupply > categories[i + 1].counterSupply + categories[i + 1].counterWhitelistSupply +_numOfTokens[i]), "the sale max is reached for this nft tier" );
        }

        for (uint256 i = 1; i < 4; i++){
            for(uint256 j = 0; j <  _numOfTokens[i-1]; j++){
                   require(
            categories[i].counterSupply + 1 <= categories[i].maxSupply,
            "Tokens number to mint cannot exceed number of MAX tokens category 3"
        );
            categories[i].counterSupply ++;
            NFTcategory[totalSupply()] = i;
                   _safeMint(msg.sender, 1);
             }
        }
    }

     // Verify MerkleProof
    function verify(bytes32[] memory proof, bytes32 leaf)
        public
        view
        returns (bool)
    {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash <= proofElement) {
                // Hash(current computed hash + current element of the proof)
                computedHash = sha256(
                    abi.encodePacked(computedHash, proofElement)
                );
            } else {
                // Hash(current element of the proof + current computed hash)
                computedHash = sha256(
                    abi.encodePacked(proofElement, computedHash)
                );
            }
        }

        // Check if the computed hash (root) is equal to the provided root
        return computedHash == _root;
    }


    // Stake function, to stake ur function
    function stakeNFT(uint256 tokenId) external isStakingContract {
        isStaked[tokenId] = true;
    }

    // Unstake funtion, to unstake ur function
    function unstakeNFT(uint256 tokenId) external isStakingContract {
        isStaked[tokenId] = false;
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