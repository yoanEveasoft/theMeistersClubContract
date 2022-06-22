async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  
  const Test = await ethers.getContractFactory("TestMC");


  const Testv2 = await Test.deploy("test", "0xd8350Cf2c9224f2720B68585fea8Cea2abB0DEdC");

  console.log("Contract deployed to address:", Testv2.address);

  //'0x0000000000000000000000000000000000000000000000000000000000000000'
  //'0x1d51f9a04ebff61f265429c4d22ac3e6176effaa85229f4c272875d39487386e'
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

/*   let wallet = await new ethers.Wallet("bcf474d4d08ae290100b74dc56f43f977febf9fe7969eb3e210090fffb525370")
token = await ethers.getContractAt("Test", "0xBC63c14a9880aa72978AC818B38Bc71Df40D09Fb") */