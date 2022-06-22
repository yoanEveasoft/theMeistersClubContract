import SHA256 from "crypto-js/sha256";
import { MerkleTree } from "merkletreejs";
import ethAddressList from "./address";

const leaves = ethAddressList.map((x) =>
  x.replace("0x", "0x000000000000000000000000")
);
const tree = new MerkleTree(leaves, SHA256, { sortPairs: true })
const root = tree.getRoot().toString('hex');

export const GetProof = (walletAddress) => {
const leaf = walletAddress.replace("0x", "0x000000000000000000000000");
return (tree.getHexProof(leaf));
}

export const GetRoot = () => {
  return `0x${root}`;
};
