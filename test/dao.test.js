const DAO = artifacts.require("DAO");
//const { expect } = require("chai");

contract("DAO", (accounts) => {
  let dao;

  before(async () => {
    dao = await DAO.deployed();
  });

  it("should set the owner correctly", async () => {
    const owner = await dao.owner();
    expect(owner).to.equal(accounts[0]);
  });

  it("should add a member correctly", async () => {
    await dao.addMember(accounts[1], { from: accounts[0] });
    const isMember = await dao.isMember(accounts[1]);
    expect(isMember).to.be.true;

    const memberInfo = await dao.memberInfo(accounts[1]);
    expect(memberInfo.memberAddress).to.equal(accounts[1]);
    expect(memberInfo.tokenBalance.toNumber()).to.equal(100);
  });

  it("should not allow non-owner to add a member", async () => {
    try {
      await dao.addMember(accounts[2], { from: accounts[1] });
    } catch (error) {
      expect(error.reason).to.equal('VM Exception while processing transaction: revert');
    }
    const isMember = await dao.isMember(accounts[2]);
    expect(isMember).to.be.false;
  });

  it("should create a proposal correctly", async () => {
    await dao.createProposal("Test Proposal", { from: accounts[1] });
    const proposal = await dao.proposals(0);
    expect(proposal.description).to.equal("Test Proposal");
    expect(proposal.voteCount.toNumber()).to.equal(0);
  });

  it("should allow a member to vote yes on a proposal", async () => {
    await dao.voteYes(0, 10, { from: accounts[1] });
    const proposal = await dao.proposals(0);
    expect(proposal.yesVotes.toNumber()).to.equal(10);

    const memberInfo = await dao.memberInfo(accounts[1]);
    expect(memberInfo.tokenBalance.toNumber()).to.equal(90);
  });

  it("should not allow a member to vote more tokens than they have", async () => {
    try {
      await dao.voteYes(0, 100, { from: accounts[1] });
    } catch (error) {
      expect(error.reason).to.equal('Not enough tokens to vote');
    }
    const proposal = await dao.proposals(0);
    expect(proposal.yesVotes.toNumber()).to.equal(10);
  });

  it("should allow a member to vote no on a proposal", async () => {
    await dao.voteNo(0, 10, { from: accounts[1] });
    const proposal = await dao.proposals(0);
    expect(proposal.noVotes.toNumber()).to.equal(10);

    const memberInfo = await dao.memberInfo(accounts[1]);
    expect(memberInfo.tokenBalance.toNumber()).to.equal(80);
  });

  it("should execute a proposal if yes votes are greater than no votes", async () => {
    await dao.voteYes(0, 10, { from: accounts[1] }); // Yes votes now 20
    await dao.executeProposal(0, { from: accounts[1] });
    const proposal = await dao.proposals(0);
    expect(proposal.executed).to.be.true;
  });

  it("should not execute a proposal if yes votes are not greater than no votes", async () => {
    await dao.createProposal("Another Test Proposal", { from: accounts[1] });
    await dao.voteNo(1, 10, { from: accounts[1] });
    try {
      await dao.executeProposal(1, { from: accounts[1] });
    } catch (error) {
      expect(error.reason).to.equal('Do not have enough votes');
    }
    const proposal = await dao.proposals(1);
    expect(proposal.executed).to.be.false;
  });

  it("should remove a member correctly", async () => {
    await dao.removeMember(accounts[1], { from: accounts[0] });
    const isMember = await dao.isMember(accounts[1]);
    expect(isMember).to.be.false;

    const memberInfo = await dao.memberInfo(accounts[1]);
    expect(memberInfo.memberAddress).to.equal('0x0000000000000000000000000000000000000000');
    expect(memberInfo.tokenBalance.toNumber()).to.equal(0);
  });
});
