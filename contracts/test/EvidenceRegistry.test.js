const { expect } = require("chai");
const { ethers } = require("hardhat");

// Hashes SHA-256 de exemplo (32 bytes) no formato bytes32
const HASH_A = "0x" + "aa".repeat(32);
const HASH_B = "0x" + "bb".repeat(32);
const ZERO = "0x" + "00".repeat(32);

describe("EvidenceRegistry", () => {
  let registry, owner, other;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    registry = await ethers.deployContract("EvidenceRegistry");
  });

  describe("registerEvidence", () => {
    it("regista e emite EvidenceRegistered", async () => {
      await expect(registry.registerEvidence("ev-1", HASH_A, "user-1"))
        .to.emit(registry, "EvidenceRegistered");

      const [hash, custodian, registeredAt, exists] = await registry.getEvidence("ev-1");
      expect(hash).to.equal(HASH_A);
      expect(custodian).to.equal("user-1");
      expect(exists).to.equal(true);
      expect(registeredAt).to.be.greaterThan(0);
    });

    it("rejeita registo duplicado - evidencias sao imutaveis", async () => {
      await registry.registerEvidence("ev-1", HASH_A, "user-1");
      await expect(
        registry.registerEvidence("ev-1", HASH_B, "user-2")
      ).to.be.revertedWith("evidence already registered");
    });

    it("rejeita hash zero", async () => {
      await expect(
        registry.registerEvidence("ev-1", ZERO, "user-1")
      ).to.be.revertedWith("hash cannot be zero");
    });

    it("rejeita escrita de quem nao e owner", async () => {
      await expect(
        registry.connect(other).registerEvidence("ev-1", HASH_A, "user-1")
      ).to.be.revertedWith("EvidenceRegistry: caller is not owner");
    });
  });

  describe("transferCustody", () => {
    beforeEach(async () => {
      await registry.registerEvidence("ev-1", HASH_A, "user-1");
    });

    it("transfere quando fromUser e o custodiante actual", async () => {
      await expect(registry.transferCustody("ev-1", "user-1", "user-2", "pericia"))
        .to.emit(registry, "CustodyTransferred");

      const [, custodian] = await registry.getEvidence("ev-1");
      expect(custodian).to.equal("user-2");

      const history = await registry.getHistory("ev-1");
      expect(history.length).to.equal(1);
      expect(history[0].fromUser).to.equal("user-1");
      expect(history[0].toUser).to.equal("user-2");
      expect(history[0].reason).to.equal("pericia");
    });

    it("rejeita transferencia por quem nao e o custodiante", async () => {
      await expect(
        registry.transferCustody("ev-1", "user-9", "user-2", "x")
      ).to.be.revertedWith("fromUser is not current custodian");
    });

    it("rejeita transferencia para si proprio", async () => {
      await expect(
        registry.transferCustody("ev-1", "user-1", "user-1", "x")
      ).to.be.revertedWith("cannot transfer to self");
    });

    it("rejeita evidencia inexistente", async () => {
      await expect(
        registry.transferCustody("ev-9", "user-1", "user-2", "x")
      ).to.be.revertedWith("evidence not found");
    });

    it("encadeia transferencias (chain of custody)", async () => {
      await registry.transferCustody("ev-1", "user-1", "user-2", "pericia");
      await registry.transferCustody("ev-1", "user-2", "user-3", "tribunal");
      const history = await registry.getHistory("ev-1");
      expect(history.length).to.equal(2);
      expect(history[1].toUser).to.equal("user-3");
    });
  });

  describe("verifyEvidence", () => {
    it("true para hash correcto, false para adulterado", async () => {
      await registry.registerEvidence("ev-1", HASH_A, "user-1");
      expect(await registry.verifyEvidence("ev-1", HASH_A)).to.equal(true);
      expect(await registry.verifyEvidence("ev-1", HASH_B)).to.equal(false);
    });

    it("reverte para evidencia inexistente", async () => {
      await expect(registry.verifyEvidence("ev-9", HASH_A)).to.be.revertedWith(
        "evidence not found"
      );
    });
  });
});
