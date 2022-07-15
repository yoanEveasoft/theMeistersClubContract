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

describe("TestMCV2", function () {
  let Contract;
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

    const contract = await ethers.getContractFactory("TestMCV2");
    Contract = await contract.deploy("/test", pool);
    priceinUSDC = await Contract.nftPrice();

    sqrtPriceX96 = await Contract.getPrice();
    preMarginEthInUSDC = (10 ** 12 * 2 ** 192) / sqrtPriceX96 ** 2;
    ethInUSDC = preMarginEthInUSDC * 0.98;

    price = priceinUSDC / (ethInUSDC * 10 ** 6);
    console.log(price);
  });

  describe("Deployment", function () {
    it("Should set the right users[0]", async function () {
      expect(await Contract.owner()).to.equal(users[0].address);
    });
  });

  describe("Giveaways", function () {
    it("Should mint 10 giveaways", async function () {
      await Contract.mintMultipleByOwner(ethAddressList);
      expect(await (await Contract.totalSupply()).toString()).to.equal("10");
    });

    it("Should be the right users[0]", async function () {
      await Contract.mintMultipleByOwner(ethAddressList);
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
          Contract.connect(users[3]).presaleMint(1, proof, {
            value: await price.toString(),
          })
        ).to.be.revertedWith("Presale is not opened yet");
      });

      it("Should fail if not Whitelisted", async function () {
        await Contract.setPresaleActive();
        expect(
          Contract.presaleMint(1, proof, {
            value: await price.toString(),
          })
        ).to.be.revertedWith("Not whitelisted");
      });

      it("Should mint if Whitelisted", async function () {
        await Contract.setPresaleActive();
        expect(
          await Contract.presaleMint(2, proof, {
            value: await ethers.utils.parseEther("" + price * 2),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(users[0].address);
        expect(await Contract.totalSupply()).to.equal(2);
      });

      it("Should fail if incorrect Price", async function () {
        await Contract.setPresaleActive();
        expect(
          await Contract.presaleMint(3, proof, {
            value: await ethers.utils.parseEther("" + price * 2),
          })
        ).to.be.revertedWith("Ether value sent is not correct");
        expect(await Contract.totalSupply()).to.equal(0);
      });

      it("Should fail if Whitelist supply is reached", async function () {
        await Contract.setPresaleActive();
        await Contract.changeWhitelistSupply(20);
        expect(
          await Contract.connect(users[0]).presaleMint(21, proof, {
            value: await ethers.utils.parseEther("" + price * 21),
          })
        ).to.be.revertedWith("the presale max is reached");
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
          Contract.connect(users[1]).mintNFT(1, {
            value: await ethers.utils.parseEther("" + price * 1),
          })
        ).to.be.revertedWith("Presale is still active");
      });

      it("Should fail if Ether value sent is not correct", async function () {
        await expect(
          Contract.connect(users[1]).mintNFT(4, {
            value: await ethers.utils.parseEther("" + price * 3),
          })
        ).to.be.revertedWith("Ether value sent is not correct");
      });

      it("Should mint 2 NFT", async function () {
        expect(
          await Contract.connect(users[1]).mintNFT(2, {
            value: await ethers.utils.parseEther("" + price * 2),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(users[1].address);
        expect(await Contract.ownerOf(1)).to.equal(users[1].address);
        expect(await Contract.totalSupply()).to.equal(2);
      });

      it("Should mint multiple differents NFT", async function () {
        expect(
          await Contract.connect(users[0]).mintNFT(4, {
            value: await ethers.utils.parseEther("" + price * 4),
          })
        );
        expect(await Contract.ownerOf(0)).to.equal(users[0].address);
        expect(await Contract.totalSupply()).to.equal(4);
      });

      it("Should fail if supply is reached", async function () {
        await Contract.changeSupply(10);
        await network.provider.send("evm_increaseTime", [90]);
        await network.provider.send("evm_mine");
        expect(
          await Contract.connect(users[0]).mintNFT(11, {
            value: await ethers.utils.parseEther("" + price * 11),
          })
        ).to.be.revertedWith("the sale max is reached for this nft tier");
      });

      it("Should withdraw the money", async function () {
        expect(
          await Contract.connect(users[1]).mintNFT(1, {
            value: await ethers.utils.parseEther("" + price),
          })
        );
        expect(
          await Contract.connect(users[2]).mintNFT(2, {
            value: await ethers.utils.parseEther("" + price * 2),
          })
        );
        expect(
          await Contract.connect(users[2]).mintNFT(2, {
            value: await ethers.utils.parseEther("" + price * 2),
          })
        );
        expect(
          await Contract.connect(users[1]).mintNFT(1, {
            value: await ethers.utils.parseEther("" + price * 1),
          })
        );
        expect(
          await Contract.connect(users[1]).mintNFT(1, {
            value: await ethers.utils.parseEther("" + price * 2),
          })
        );
        expect(
          await Contract.connect(users[2]).mintNFT(4, {
            value: await ethers.utils.parseEther("" + price * 4),
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
        ).to.equal(7.748500778806708);

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
      expect(await Contract.maxSupply()).to.equal(5000);
      await Contract.changeSupply(6000);
      expect(await Contract.maxSupply()).to.equal(6000);
    });

    it("Should change whitelist supply", async function () {
      expect(await Contract.whitelistSupply()).to.equal(1000);
      await Contract.changeWhitelistSupply(500);
      expect(await Contract.whitelistSupply()).to.equal(500);
    });
  });

  describe("change price", function () {
    it("Should change the NFT price", async function () {
      console.log(await Contract.nftPrice());
      expect(await Contract.nftPrice()).to.equal(750 * 10 ** 6);
      await Contract.changePrice(1000);
      expect(await Contract.nftPrice()).to.equal(1000 * 10 ** 6);
    });
  });

  describe("Token URI", function () {
    it("Should set the right URI", async function () {
      await Contract.setIsActive();
      await expect(
        await Contract.connect(users[1]).mintNFT(1, {
          value: await ethers.utils.parseEther("" + price),
        })
      );
      await expect(
        await Contract.connect(users[1]).mintNFT(2, {
          value: await ethers.utils.parseEther("" + price * 2),
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
        "ERC721Metadata: URI query for nonexistent token"
      );
    });
  });
});
