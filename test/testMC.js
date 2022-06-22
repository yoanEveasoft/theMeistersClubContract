const { expect } = require("chai");
const { waffle, ethers } = require("hardhat");
const provider = waffle.provider;
const ethAddressList = require("../addressList");

//paramètres
/* const is721a = true; */
const isRaffle = false;
const isPresale = true;
const isFreeMint = false;
const isPublicSale = true;
const maxSupply = 10000;

//change the proof and root depending on the ethaAdressList
const proof = [
  "0x000000000000000000000000d8350cf2c9224f2720b68585fea8cea2abb0dedc",
  "0xda9368679d0479bbe56892253e6608a26fd93fe8b3af53e6a7176687e598cf3f",
  "0xb801bec4655b4d629fc4c7107bb72356951fa6c965b4193aa7179da7c8835bdd",
  "0x635d237c6806b06782f9de989bb50bb7ff6d9164b29ec6db61feb7314a34b865",
  "0x17e8cdd2126d1104543d1e56b4dd25ad8e369fa4abac2b1941e9c9f33c904dea",
  "0x7e951591b808536a6b63045d897d2ab7919bb1c6654b8a7f2c146bf9213e98b4",
  "0x80f350aab5d052efca9baae16c0c4ef705bbda3cb5e386a037ff660c217f9e2f",
];
const root = "0xb8851699b8e764dc99a286fdbc20411bec24a4eb54373cf8e40ce88d60382fc6";


describe("TestMC", function () {
  let DContract;
  let owner;
  let accounts;

  beforeEach(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("TestMC");
    DContract = await Contract.deploy("/test");
    price1 = await (await DContract.categories(1))["NFTPrice"];
    price2 = await (await DContract.categories(2))["NFTPrice"];
    price3 = await (await DContract.categories(3))["NFTPrice"]
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await DContract.owner()).to.equal(owner.address);
    });
  });

  describe("Giveaways", function () {
    it("Should mint 99 giveaways", async function () {
      await DContract.mintMultipleByOwner(ethAddressList, [1,2,1,1,1,1,3,2,2]);
      expect(await (await DContract.totalSupply()).toString()).to.equal("9");
      expect(await (await DContract.categories(1))["counterSupply"]).to.equal(5);
      expect(await (await DContract.categories(2))["counterSupply"]).to.equal(3);
      expect(await (await DContract.categories(3))["counterSupply"]).to.equal(1);
      expect(await DContract.NFTcategory(0)).to.equal(1);
      expect(await DContract.NFTcategory(6)).to.equal(3);
    });

    it("Should be the right owner", async function () {
      await DContract.mintMultipleByOwner(ethAddressList, [1,2,1,1,1,1,3,2,2]);
      expect(await DContract.ownerOf(0)).to.equal(ethAddressList[0]);
      expect(await DContract.ownerOf(5)).to.equal(ethAddressList[5]);
      expect(await DContract.ownerOf(8)).to.equal(ethAddressList[8]);
    });
  });

  isPresale &&
    describe("Presale", function () {
      beforeEach(async function () {
        await DContract.setIsActive();
        await DContract.setMerkleRoot( root );
      });

      it("Should fail if Presale is not active", async function () {
        expect(
          DContract.connect(accounts[0]).presaleMint([1,0,0], proof, { value: await ((price1) * 2).toString(), })).to.be.revertedWith("Presale is not opened yet");
      });

      it("Should fail if not Whitelisted", async function () {
        await DContract.setPresaleActive();
        await expect(DContract.connect(accounts[1]).presaleMint([1,0,0], proof, {value: await ((price1) * 1).toString(), })).to.be.revertedWith("Not whitelisted");
      });

      it("Should mint if Whitelisted", async function () {
        await DContract.setPresaleActive();
        expect(await DContract.connect(accounts[0]).presaleMint([2,0,0], proof, {value: await ((price1) * 2).toString(),}));
        expect(await DContract.ownerOf(0)).to.equal(accounts[0].address);
        expect(await DContract.totalSupply()).to.equal(2);
      });

       it("Should mint multiple differents NFT", async function () {
        await DContract.setPresaleActive();
        expect(await DContract.connect(accounts[0]).presaleMint([2,1,1], proof, {value: await ((price1) * 2 + (price2) * 1 + (price3) * 1).toString(),}));
        expect(await DContract.ownerOf(0)).to.equal(accounts[0].address);
        expect(await DContract.totalSupply()).to.equal(4);
        expect(await (await DContract.categories(1))["counterWhitelistSupply"]).to.equal(2);
        expect(await (await DContract.categories(2))["counterWhitelistSupply"]).to.equal(1);
        expect(await (await DContract.categories(3))["counterWhitelistSupply"]).to.equal(1);
        expect(await DContract.NFTcategory(0)).to.equal(1);
        expect(await DContract.NFTcategory(3)).to.equal(3);
      });

      it("Should fail if Whitelist supply is reached", async function () {
        await DContract.setPresaleActive();
        expect(await DContract.connect(accounts[0]).presaleMint([0,0,5], proof, {value: await ((price3) * 5).toString(),})).to.be.revertedWith('the presale max is reached for this nft tier');
      });

    });


  isPublicSale &&
    describe("Public Sale", async function () {
      beforeEach(async function () {
        await DContract.setIsActive();
      });

      it("Should fail if Presale is active", async function () {
        await DContract.setPresaleActive();
        await expect(DContract.connect(accounts[1]).mintNFT([1,0,0], {value: await ((price1) * 2).toString(),})).to.be.revertedWith("Presale is still active");
      });

      it("Should fail if Ether value sent is not correct", async function () {
        await expect(DContract.connect(accounts[1]).mintNFT([4,0,0], {value: await ((price1) * 1).toString(),})).to.be.revertedWith("Ether value sent is not correct");
      });

      it("Should mint 2 NFT", async function () {
        expect(await DContract.connect(accounts[1]).mintNFT([2,0,0], {value: await ((price1) * 2).toString(),}));
        expect(await DContract.ownerOf(0)).to.equal(accounts[1].address);
        expect(await DContract.ownerOf(1)).to.equal(accounts[1].address);
        expect(await DContract.totalSupply()).to.equal(2);
      });

      it("Should mint multiple differents NFT", async function () {
        expect(await DContract.connect(accounts[0]).mintNFT([2,1,1], {value: await ((price1) * 2 + (price2) * 1 + (price3) * 1).toString(),}));
        expect(await DContract.ownerOf(0)).to.equal(accounts[0].address);
        expect(await DContract.totalSupply()).to.equal(4);
        expect(await (await DContract.categories(1))["counterSupply"]).to.equal(2);
        expect(await (await DContract.categories(2))["counterSupply"]).to.equal(1);
        expect(await (await DContract.categories(3))["counterSupply"]).to.equal(1);
        expect(await DContract.NFTcategory(0)).to.equal(1);
        expect(await DContract.NFTcategory(3)).to.equal(3);
      });

       it("Should fail if supply is reached", async function () {
        await DContract.changeSupply([10, 0, 0]);
        expect(await DContract.connect(accounts[0]).mintNFT([11,0,0], {value: await ((price1) * 11).toString(),})).to.be.revertedWith('the sale max is reached for this nft tier');
      });

      it("Should withdraw the money", async function () {
        expect(await DContract.connect(accounts[1]).mintNFT([1,0,0], {value: await ((price1) * 1).toString(), }));
        expect(await DContract.connect(accounts[2]).mintNFT([0,1,1], {value: await ((price2) * 1 + (price3) * 1).toString(), }));
        expect(await DContract.connect(accounts[3]).mintNFT([0,2,0], {value: await ((price2) * 2).toString(), }));
        expect(await DContract.connect(accounts[4]).mintNFT([1,0,0], {value: await ((price1) * 1).toString(), }));
        expect(await DContract.connect(accounts[5]).mintNFT([1,0,0], {value: await ((price1) * 1).toString(), }));
        expect(await DContract.connect(accounts[6]).mintNFT([2,1,1], {value: await ((price1) * 2 + (price2) * 1 + (price3) * 1).toString(),}));
  
        await expect(await DContract.totalSupply()).to.equal(11);

        let ownerBalance =(await provider.getBalance(owner.address)).toString() / 1000000000000000000;
        console.log("owner balance before withdraw:", ownerBalance);
        await expect(await (await provider.getBalance(DContract.address)).toString()/ 1000000000000000000).to.equal(379);

        await DContract.connect(owner).withdraw();

        ownerBalance =(await provider.getBalance(owner.address)).toString() / 1000000000000000000;
        console.log("owner balance after withdraw:", ownerBalance);
        await expect(await (await provider.getBalance(DContract.address)).toString()/ 1000000000000000000).to.equal(0);
      });
    });

     describe("change supply", function () {
        it("Should change the NFT supply", async function () {
        expect(await (await DContract.categories(1))["maxSupply"]).to.equal(299);
        await DContract.changeSupply([499, 0, 0]);
        expect(await (await DContract.categories(1))["maxSupply"]).to.equal(499);
    });

        it("Should change multiple NFT supplies", async function () {
        expect(await (await DContract.categories(1))["maxSupply"]).to.equal(299);
        expect(await (await DContract.categories(3))["maxSupply"]).to.equal(99);
        await DContract.changeSupply([499, 0, 299]);
        expect(await (await DContract.categories(1))["maxSupply"]).to.equal(499);
        expect(await (await DContract.categories(3))["maxSupply"]).to.equal(299);
        });
     });

      describe("change price", function () {
        it("Should change the NFT price", async function () {
        expect(await (await DContract.categories(1))["NFTPrice"]).to.equal(ethers.utils.parseEther("11"));
        await DContract.changePrice([ethers.utils.parseEther("1"), 0, 0]);
        expect(await (await DContract.categories(1))["NFTPrice"]).to.equal(ethers.utils.parseEther("1"));
    });

        it("Should change multiple NFT supplies", async function () {
        expect(await (await DContract.categories(1))["NFTPrice"]).to.equal(ethers.utils.parseEther("11"));
        expect(await (await DContract.categories(3))["NFTPrice"]).to.equal(ethers.utils.parseEther("98"));
        await DContract.changePrice([ethers.utils.parseEther("1"), 0, ethers.utils.parseEther("50")]);
        expect(await (await DContract.categories(1))["NFTPrice"]).to.equal(ethers.utils.parseEther("1"));
        expect(await (await DContract.categories(3))["NFTPrice"]).to.equal(ethers.utils.parseEther("50"));
        });
     });



  describe("Token URI", function () {
    it("Should set the right URI", async function () {
      await DContract.setIsActive();
      await expect(await DContract.connect(accounts[1]).mintNFT([1,0,0], {value: await ((price1) * 1).toString(), }));
      await expect(await DContract.connect(accounts[1]).mintNFT([0,1,1], {value: await ((price2) * 1 + (price3) * 1).toString(), }));
      await DContract.setBaseUri("https://test");
      expect(await DContract.tokenURI(0)).to.equal("https://testhidden1.json");
      expect(await DContract.tokenURI(1)).to.equal("https://testhidden2.json");
      expect(await DContract.tokenURI(2)).to.equal("https://testhidden3.json");
      await DContract.setRevealCollection();
       expect(await DContract.tokenURI(0)).to.equal("https://test0.json");
       expect(await DContract.tokenURI(1)).to.equal("https://test1.json");
       expect(await DContract.tokenURI(2)).to.equal("https://test2.json");
    });

    it("Should fail for non existing token", async function () {
      await expect(DContract.tokenURI(0)).to.be.revertedWith("URI query for nonexistent token");
    });
  });
});
