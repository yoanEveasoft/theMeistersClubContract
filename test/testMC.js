const { expect } = require("chai");
const { waffle, ethers } = require("hardhat");
const provider = waffle.provider;
const { defaultAbiCoder, keccak256, parseEther } = require("ethers/lib/utils");
const { MerkleTree } = require("merkletreejs");
const ethAddressList = require("../data/addressList");

//paramètres
const isPresale = true;
const isPublicSale = true;
const pool = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
//USDC
const token0 = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const decimals0 = 6n;
//WETH
const token1 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const decimals1 = 18n;

async function forkNetwork(blockNumber = 15082955) {
  /// Use mainnet fork as provider
  return network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl:
            "https://eth-mainnet.alchemyapi.io/v2/GQuvG_4t-tC23bv60y0LCF7tS9Zj3eq-",
          blockNumber: blockNumber,
        },
      },
    ],
  });
}

describe("TestMC", function () {
  let Contract;
  let accounts;
  forkNetwork();

  beforeEach(async function () {
    users = await ethers.getSigners();
    await network.provider.send("hardhat_setBalance", [
      users[0].address,
      "0x1000000000000000000000000000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      users[1].address,
      "0x1000000000000000000000000000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      users[2].address,
      "0x1000000000000000000000000000",
    ]);

    const UniswapV3 = await ethers.getContractFactory("Twap");
    const twap = await UniswapV3.deploy(token0, token1, pool);
    const contract = await ethers.getContractFactory("TestMC");
    Contract = await contract.deploy("/test", pool);
    price1 =
      (await (await (await Contract.categories(1))["NFTPrice"]).toString()) /
      10 ** 6;
    price2 =
      (await (await (await Contract.categories(2))["NFTPrice"]).toString()) /
      10 ** 6;
    price3 =
      (await (await (await Contract.categories(3))["NFTPrice"]).toString()) /
      10 ** 6;

    preMarginEthInUSDC =
      (await (await twap.getPrice(token1, 10n ** decimals1)).toString()) /
      10 ** 6;

    ethInUSDC = preMarginEthInUSDC * 0.95;
  });

  /* describe("Deployment", function () {
    it("Should set the right users[0]", async function () {
      expect(await Contract.owner()).to.equal(users[0].address);
    });
  }); */

  describe("Giveaways", function () {
    it("Should mint 99 giveaways", async function () {
      await Contract.mintMultipleByOwner(
        ethAddressList,
        [1, 2, 1, 1, 1, 1, 3, 2, 2, 1]
      );
      expect(await (await Contract.totalSupply()).toString()).to.equal("10");
      expect(await (await Contract.categories(1))["counterSupply"]).to.equal(6);
      expect(await (await Contract.categories(2))["counterSupply"]).to.equal(3);
      expect(await (await Contract.categories(3))["counterSupply"]).to.equal(1);
      expect(await Contract.NFTcategory(0)).to.equal(1);
      expect(await Contract.NFTcategory(6)).to.equal(3);
    });

    it("Should be the right users[0]", async function () {
      await Contract.mintMultipleByOwner(
        ethAddressList,
        [1, 2, 1, 1, 1, 1, 3, 2, 2, 1]
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
        leaves = ethAddressList.map((addr) =>
          defaultAbiCoder.encode(["address"], [addr])
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
          Contract.connect(users[3]).presaleMint([1, 0, 0], proof, {
            value: await (price1 * 2).toString(),
          })
        ).to.be.revertedWith("Presale is not opened yet");
      });

      it("Should fail if not Whitelisted", async function () {
        await Contract.setPresaleActive();
        expect(
          Contract.presaleMint([1, 0, 0], proof, {
            value: await (price1 * 1).toString(),
          })
        ).to.be.revertedWith("Not whitelisted");
      });

      it("Should mint if Whitelisted", async function () {
        await Contract.setPresaleActive();

        expect(
          await Contract.presaleMint([2, 0, 0], proof, {
            value: await await ethers.utils
              .parseEther("" + price1 / ethInUSDC)
              .toString(),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(users[0].address);
        expect(await Contract.totalSupply()).to.equal(2);
      });

      it("Should mint multiple differents NFT", async function () {
        await Contract.setPresaleActive();
        expect(
          await Contract.presaleMint([2, 1, 1], proof, {
            value: await await ethers.utils
              .parseEther(
                "" + (price1 * 2 + price2 * 1 + price3 * 1) / ethInUSDC
              )
              .toString(),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(users[0].address);
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
          await Contract.connect(users[0]).presaleMint([21, 0, 0], proof, {
            value: await await ethers.utils
              .parseEther("" + (price1 * 21) / ethInUSDC)
              .toString(),
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
          Contract.connect(users[1]).mintNFT([1, 0, 0], {
            value: await (price1 * 1).toString(),
          })
        ).to.be.revertedWith("Presale is still active");
      });

      it("Should fail if Ether value sent is not correct", async function () {
        await expect(
          Contract.connect(users[1]).mintNFT([4, 0, 0], {
            value: await (price1 * 1).toString(),
          })
        ).to.be.revertedWith("Ether value sent is not correct");
      });

      it("Should mint 2 NFT", async function () {
        expect(
          await Contract.connect(users[1]).mintNFT([2, 0, 0], {
            value: await await ethers.utils
              .parseEther("" + (price1 * 2) / ethInUSDC)
              .toString(),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(users[1].address);
        expect(await Contract.ownerOf(1)).to.equal(users[1].address);
        expect(await Contract.totalSupply()).to.equal(2);
      });

      it("Should mint multiple differents NFT", async function () {
        expect(
          await Contract.connect(users[0]).mintNFT([2, 1, 1], {
            value: await await ethers.utils
              .parseEther(
                "" + (price1 * 2 + price2 * 1 + price3 * 1) / ethInUSDC
              )
              .toString(),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(users[0].address);
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
        await network.provider.send("evm_increaseTime", [90]);
        await network.provider.send("evm_mine");
        expect(
          await Contract.connect(users[0]).mintNFT([11, 0, 0], {
            value: await ethers.utils.parseEther(
              "" + (price1 * 11) / ethInUSDC
            ),
          })
        ).to.be.revertedWith("the sale max is reached for this nft tier");
      });

      it("Should withdraw the money", async function () {
        expect(
          await Contract.connect(users[1]).mintNFT([1, 0, 0], {
            value: await ethers.utils.parseEther("" + (price1 * 1) / ethInUSDC),
          })
        );
        expect(
          await Contract.connect(users[2]).mintNFT([0, 1, 1], {
            value: await ethers.utils.parseEther(
              "" + (price2 * 1 + price3 * 1) / ethInUSDC
            ),
          })
        );
        expect(
          await Contract.connect(users[2]).mintNFT([0, 2, 0], {
            value: await ethers.utils.parseEther("" + (price2 * 2) / ethInUSDC),
          })
        );
        expect(
          await Contract.connect(users[1]).mintNFT([1, 0, 0], {
            value: await ethers.utils.parseEther("" + (price1 * 1) / ethInUSDC),
          })
        );
        expect(
          await Contract.connect(users[1]).mintNFT([1, 0, 0], {
            value: await ethers.utils.parseEther("" + (price1 * 1) / ethInUSDC),
          })
        );
        expect(
          await Contract.connect(users[2]).mintNFT([2, 1, 1], {
            value: await ethers.utils.parseEther(
              "" + (price1 * 2 + price2 * 1 + price3 * 1) / ethInUSDC
            ),
          })
        );

        await expect(await Contract.totalSupply()).to.equal(11);

        let usersBalance =
          (await provider.getBalance(users[0].address)).toString() /
          1000000000000000000;
        let ContractBalance =
          (await (await provider.getBalance(Contract.address)).toString()) /
          1000000000000000000;
        console.log("users balance before withdraw:", usersBalance);
        console.log("contract balance before withdraw:", ContractBalance);

        await expect(
          (await (await provider.getBalance(Contract.address)).toString()) /
            1000000000000000000
        ).to.equal(284.9762192277335);

        await Contract.connect(users[0]).withdraw();

        usersBalance =
          (await provider.getBalance(users[0].address)).toString() /
          1000000000000000000;
        console.log("users[0] balance after withdraw:", usersBalance);
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
        8000 * 10 ** 6
      );
      await Contract.changePrice([9000, 0, 0]);
      expect(await (await Contract.categories(1))["NFTPrice"]).to.equal(
        9000 * 10 ** 6
      );
    });

    it("Should change multiple NFT supplies", async function () {
      expect(await (await Contract.categories(1))["NFTPrice"]).to.equal(
        8000 * 10 ** 6
      );
      expect(await (await Contract.categories(3))["NFTPrice"]).to.equal(
        100000 * 10 ** 6
      );
      await Contract.changePrice([9000, 0, 90000]);
      expect(await (await Contract.categories(1))["NFTPrice"]).to.equal(
        9000 * 10 ** 6
      );
      expect(await (await Contract.categories(3))["NFTPrice"]).to.equal(
        90000 * 10 ** 6
      );
    });
  });

  describe("Token URI", function () {
    it("Should set the right URI", async function () {
      await Contract.setIsActive();
      await expect(
        await Contract.connect(users[1]).mintNFT([1, 0, 0], {
          value: await ethers.utils.parseEther("" + (price1 * 1) / ethInUSDC),
        })
      );
      await expect(
        await Contract.connect(users[1]).mintNFT([0, 1, 1], {
          value: await ethers.utils.parseEther(
            "" + (price2 * 1 + price3 * 1) / ethInUSDC
          ),
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
