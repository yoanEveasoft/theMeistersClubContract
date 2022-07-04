const { expect } = require("chai");
const { waffle, ethers } = require("hardhat");
const provider = waffle.provider;
const { defaultAbiCoder, keccak256, parseEther } = require("ethers/lib/utils");
const { MerkleTree } = require("merkletreejs");
const ethAddressList = require("../data/addressList");

//paramètres
/* const is721a = true; */
const isRaffle = false;
const isPresale = true;
const isFreeMint = false;
const isPublicSale = true;
const maxSupply = 10000;

const pool = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
//USDC
const token0 = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const decimals0 = 6n;
//WETH
const token1 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const decimals1 = 18n;

describe("TestMC", function () {
  let Contract;
  let owner;
  let accounts;

  beforeEach(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    const UniswapV3 = await ethers.getContractFactory("Twap");
    const twap = await UniswapV3.deploy(token0, token1, pool);
    const contract = await ethers.getContractFactory("TestMC");
    Contract = await contract.deploy("/test", twap.address);
    price1 = await (
      await (
        await Contract.categories(1)
      )["NFTPrice"]
    ).toString();
    price2 = await (
      await (
        await Contract.categories(2)
      )["NFTPrice"]
    ).toString();
    price3 = await (
      await (
        await Contract.categories(3)
      )["NFTPrice"]
    ).toString();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await Contract.owner()).to.equal(owner.address);
    });
  });

  describe("Giveaways", function () {
    it("Should mint 99 giveaways", async function () {
      await Contract.mintMultipleByOwner(
        ethAddressList,
        [1, 2, 1, 1, 1, 1, 3, 2, 2]
      );
      expect(await (await Contract.totalSupply()).toString()).to.equal("9");
      expect(await (await Contract.categories(1))["counterSupply"]).to.equal(5);
      expect(await (await Contract.categories(2))["counterSupply"]).to.equal(3);
      expect(await (await Contract.categories(3))["counterSupply"]).to.equal(1);
      expect(await Contract.NFTcategory(0)).to.equal(1);
      expect(await Contract.NFTcategory(6)).to.equal(3);
    });

    it("Should be the right owner", async function () {
      await Contract.mintMultipleByOwner(
        ethAddressList,
        [1, 2, 1, 1, 1, 1, 3, 2, 2]
      );
      expect(await Contract.ownerOf(0)).to.equal(ethAddressList[0]);
      expect(await Contract.ownerOf(5)).to.equal(ethAddressList[5]);
      expect(await Contract.ownerOf(8)).to.equal(ethAddressList[8]);
    });
  });

  isPresale &&
    describe("Presale", function () {
      let merkleTree;
      let leaves;
      let proof;
      const getProof = (i) => merkleTree.getHexProof(keccak256(leaves[i]));

      beforeEach(async function () {
        leaves = accounts.map((addr) =>
          defaultAbiCoder.encode(["address"], [addr.address])
        );

        merkleTree = new MerkleTree(leaves, keccak256, {
          hashLeaves: true,
          sortPairs: true,
        });
        await Contract.setMerkleRoot(merkleTree.getHexRoot());
        proof = merkleTree.getHexProof(keccak256(leaves[1]));
        await Contract.setIsActive();
      });

      it("Should fail if Presale is not active", async function () {
        expect(
          Contract.connect(accounts[0]).presaleMint([1, 0, 0], proof, {
            value: await (price1 * 2).toString(),
          })
        ).to.be.revertedWith("Presale is not opened yet");
      });

      it("Should fail if not Whitelisted", async function () {
        await Contract.setPresaleActive();
        await expect(
          Contract.connect(accounts[1]).presaleMint([1, 0, 0], proof, {
            value: await (price1 * 1).toString(),
          })
        ).to.be.revertedWith("Not whitelisted");
      });

      it("Should mint if Whitelisted", async function () {
        await Contract.setPresaleActive();
        expect(
          await Contract.connect(accounts[1]).presaleMint([2, 0, 0], proof, {
            value: await (price1 * 2).toString(),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(accounts[1].address);
        expect(await Contract.totalSupply()).to.equal(2);
      });

      it("Should mint multiple differents NFT", async function () {
        await Contract.setPresaleActive();
        expect(
          await Contract.connect(accounts[1]).presaleMint([2, 1, 1], proof, {
            value: await (price1 * 2 + price2 * 1 + price3 * 1).toString(),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(accounts[1].address);
        expect(await Contract.totalSupply()).to.equal(4);
        expect(
          await (
            await Contract.categories(1)
          )["counterWhitelistSupply"]
        ).to.equal(2);
        expect(
          await (
            await Contract.categories(2)
          )["counterWhitelistSupply"]
        ).to.equal(1);
        expect(
          await (
            await Contract.categories(3)
          )["counterWhitelistSupply"]
        ).to.equal(1);
        expect(await Contract.NFTcategory(0)).to.equal(1);
        expect(await Contract.NFTcategory(3)).to.equal(3);
      });

      it("Should fail if Whitelist supply is reached", async function () {
        await Contract.setPresaleActive();
        expect(
          await Contract.connect(accounts[1]).presaleMint([0, 0, 5], proof, {
            value: price3 * 5,
          })
        ).to.be.revertedWith("the presale max is reached for this nft tier");
      });
    });

  isPublicSale &&
    describe("Public Sale", async function () {
      beforeEach(async function () {
        await Contract.setIsActive();
      });

      it("Should fail if Presale is active", async function () {
        await Contract.setPresaleActive();
        await expect(
          Contract.connect(accounts[1]).mintNFT([1, 0, 0], {
            value: await (price1 * 1).toString(),
          })
        ).to.be.revertedWith("Presale is still active");
      });

      it("Should fail if Ether value sent is not correct", async function () {
        await expect(
          Contract.connect(accounts[1]).mintNFT([4, 0, 0], {
            value: await (price1 * 1).toString(),
          })
        ).to.be.revertedWith("Ether value sent is not correct");
      });

      it("Should mint 2 NFT", async function () {
        expect(
          await Contract.connect(accounts[1]).mintNFT([2, 0, 0], {
            value: await (price1 * 2).toString(),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(accounts[1].address);
        expect(await Contract.ownerOf(1)).to.equal(accounts[1].address);
        expect(await Contract.totalSupply()).to.equal(2);
      });

      it("Should mint multiple differents NFT", async function () {
        expect(
          await Contract.connect(accounts[0]).mintNFT([2, 1, 1], {
            value: await (price1 * 2 + price2 * 1 + price3 * 1).toString(),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(accounts[0].address);
        expect(await Contract.totalSupply()).to.equal(4);
        expect(await (await Contract.categories(1))["counterSupply"]).to.equal(
          2
        );
        expect(await (await Contract.categories(2))["counterSupply"]).to.equal(
          1
        );
        expect(await (await Contract.categories(3))["counterSupply"]).to.equal(
          1
        );
        expect(await Contract.NFTcategory(0)).to.equal(1);
        expect(await Contract.NFTcategory(3)).to.equal(3);
      });

      it("Should fail if supply is reached", async function () {
        await Contract.changeSupply([10, 0, 0]);
        expect(
          await Contract.connect(accounts[0]).mintNFT([11, 0, 0], {
            value: await (price1 * 11).toString(),
          })
        ).to.be.revertedWith("the sale max is reached for this nft tier");
      });

      it("Should withdraw the money", async function () {
        expect(
          await Contract.connect(accounts[1]).mintNFT([1, 0, 0], {
            value: await (price1 * 1).toString(),
          })
        );
        expect(
          await Contract.connect(accounts[2]).mintNFT([0, 1, 1], {
            value: await (price2 * 1 + price3 * 1).toString(),
          })
        );
        expect(
          await Contract.connect(accounts[3]).mintNFT([0, 2, 0], {
            value: await (price2 * 2).toString(),
          })
        );
        expect(
          await Contract.connect(accounts[4]).mintNFT([1, 0, 0], {
            value: await (price1 * 1).toString(),
          })
        );
        expect(
          await Contract.connect(accounts[5]).mintNFT([1, 0, 0], {
            value: await (price1 * 1).toString(),
          })
        );
        expect(
          await Contract.connect(accounts[6]).mintNFT([2, 1, 1], {
            value: await (price1 * 2 + price2 * 1 + price3 * 1).toString(),
          })
        );

        await expect(await Contract.totalSupply()).to.equal(11);

        let ownerBalance =
          (await provider.getBalance(owner.address)).toString() /
          1000000000000000000;
        console.log("owner balance before withdraw:", ownerBalance);
        await expect(
          (await (await provider.getBalance(Contract.address)).toString()) /
            1000000
        ).to.equal(312000);

        await Contract.connect(owner).withdraw();

        ownerBalance =
          (await provider.getBalance(owner.address)).toString() /
          1000000000000000000;
        console.log("owner balance after withdraw:", ownerBalance);
        await expect(
          (await (await provider.getBalance(Contract.address)).toString()) /
            1000000000000000000
        ).to.equal(0);
      });
    });

  describe("change supply", function () {
    it("Should change the NFT supply", async function () {
      expect(await (await Contract.categories(1))["maxSupply"]).to.equal(299);
      await Contract.changeSupply([499, 0, 0]);
      expect(await (await Contract.categories(1))["maxSupply"]).to.equal(499);
    });

    it("Should change multiple NFT supplies", async function () {
      expect(await (await Contract.categories(1))["maxSupply"]).to.equal(299);
      expect(await (await Contract.categories(3))["maxSupply"]).to.equal(99);
      await Contract.changeSupply([499, 0, 299]);
      expect(await (await Contract.categories(1))["maxSupply"]).to.equal(499);
      expect(await (await Contract.categories(3))["maxSupply"]).to.equal(299);
    });
  });

  describe("change price", function () {
    it("Should change the NFT price", async function () {
      expect(await (await Contract.categories(1))["NFTPrice"]).to.equal(
        ethers.utils.parseEther("11")
      );
      await Contract.changePrice([ethers.utils.parseEther("1"), 0, 0]);
      expect(await (await Contract.categories(1))["NFTPrice"]).to.equal(
        ethers.utils.parseEther("1")
      );
    });

    it("Should change multiple NFT supplies", async function () {
      expect(await (await Contract.categories(1))["NFTPrice"]).to.equal(
        ethers.utils.parseEther("11")
      );
      expect(await (await Contract.categories(3))["NFTPrice"]).to.equal(
        ethers.utils.parseEther("98")
      );
      await Contract.changePrice([
        ethers.utils.parseEther("1"),
        0,
        ethers.utils.parseEther("50"),
      ]);
      expect(await (await Contract.categories(1))["NFTPrice"]).to.equal(
        ethers.utils.parseEther("1")
      );
      expect(await (await Contract.categories(3))["NFTPrice"]).to.equal(
        ethers.utils.parseEther("50")
      );
    });
  });

  describe("Token URI", function () {
    it("Should set the right URI", async function () {
      await Contract.setIsActive();
      await expect(
        await Contract.connect(accounts[1]).mintNFT([1, 0, 0], {
          value: await (price1 * 1).toString(),
        })
      );
      await expect(
        await Contract.connect(accounts[1]).mintNFT([0, 1, 1], {
          value: await (price2 * 1 + price3 * 1).toString(),
        })
      );
      await Contract.setBaseUri("https://test");
      expect(await Contract.tokenURI(0)).to.equal("https://testhidden1.json");
      expect(await Contract.tokenURI(1)).to.equal("https://testhidden2.json");
      expect(await Contract.tokenURI(2)).to.equal("https://testhidden3.json");
      await Contract.setRevealCollection();
      expect(await Contract.tokenURI(0)).to.equal("https://test0.json");
      expect(await Contract.tokenURI(1)).to.equal("https://test1.json");
      expect(await Contract.tokenURI(2)).to.equal("https://test2.json");
    });

    it("Should fail for non existing token", async function () {
      await expect(Contract.tokenURI(0)).to.be.revertedWith(
        "URI query for nonexistent token"
      );
    });
  });
});
