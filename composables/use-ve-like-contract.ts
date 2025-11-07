import { readContract } from '@wagmi/core'
import { useWriteContract } from '@wagmi/vue'
import type { Hash } from 'viem'

import veLikeABI from '~/contracts/ve-like.json'

// TODO: Update address when deployed
export const veLikeAddress = '0xE55C2b91E688BE70e5BbcEdE3792d723b4766e2B'

export function useVeLikeContract() {
  const { writeContractAsync } = useWriteContract()
  const { $wagmiConfig } = useNuxtApp()

  // Read functions
  async function getAsset() {
    const asset = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'asset',
    })
    return asset as string
  }

  async function balanceOf(account: string) {
    const balance = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'balanceOf',
      args: [account],
    })
    return balance as bigint
  }

  async function totalSupply() {
    const supply = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'totalSupply',
    })
    return supply as bigint
  }

  async function totalAssets() {
    const assets = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'totalAssets',
    })
    return assets as bigint
  }

  async function convertToShares(assets: bigint) {
    const shares = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'convertToShares',
      args: [assets],
    })
    return shares as bigint
  }

  async function convertToAssets(shares: bigint) {
    const assets = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'convertToAssets',
      args: [shares],
    })
    return assets as bigint
  }

  async function maxDeposit(receiver: string) {
    const max = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'maxDeposit',
      args: [receiver],
    })
    return max as bigint
  }

  async function previewDeposit(assets: bigint) {
    const preview = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'previewDeposit',
      args: [assets],
    })
    return preview as bigint
  }

  async function maxMint(receiver: string) {
    const max = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'maxMint',
      args: [receiver],
    })
    return max as bigint
  }

  async function previewMint(shares: bigint) {
    const preview = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'previewMint',
      args: [shares],
    })
    return preview as bigint
  }

  async function maxWithdraw(owner: string) {
    const max = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'maxWithdraw',
      args: [owner],
    })
    return max as bigint
  }

  async function previewWithdraw(assets: bigint) {
    const preview = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'previewWithdraw',
      args: [assets],
    })
    return preview as bigint
  }

  async function maxRedeem(owner: string) {
    const max = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'maxRedeem',
      args: [owner],
    })
    return max as bigint
  }

  async function previewRedeem(shares: bigint) {
    const preview = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'previewRedeem',
      args: [shares],
    })
    return preview as bigint
  }

  async function allowance(owner: string, spender: string) {
    const amount = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'allowance',
      args: [owner, spender],
    })
    return amount as bigint
  }

  async function getLockTime() {
    const lockTime = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'getLockTime',
    })
    return lockTime as bigint
  }

  async function getPendingReward(owner: string) {
    const reward = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'getPendingReward',
      args: [owner],
    })
    return reward as bigint
  }

  async function getCurrentRewardContract() {
    const rewardContract = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'getCurrentRewardContract',
    })
    return rewardContract as string
  }

  async function paused() {
    const isPaused = await readContract($wagmiConfig, {
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'paused',
    })
    return isPaused as boolean
  }

  // Write functions
  async function deposit(assets: bigint, receiver: string): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'deposit',
      args: [assets, receiver],
    })
  }

  async function mint(shares: bigint, receiver: string): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'mint',
      args: [shares, receiver],
    })
  }

  async function withdraw(assets: bigint, receiver: string, owner: string): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'withdraw',
      args: [assets, receiver, owner],
    })
  }

  async function redeem(shares: bigint, receiver: string, owner: string): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'redeem',
      args: [shares, receiver, owner],
    })
  }

  async function approve(spender: string, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'approve',
      args: [spender, amount],
    })
  }

  async function transfer(to: string, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'transfer',
      args: [to, amount],
    })
  }

  async function transferFrom(from: string, to: string, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'transferFrom',
      args: [from, to, amount],
    })
  }

  async function claimReward(wallet: string): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'claimReward',
      args: [wallet],
    })
  }

  async function restakeReward(wallet: string): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'restakeReward',
      args: [wallet],
    })
  }

  async function setLockTime(timestamp: bigint): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'setLockTime',
      args: [timestamp],
    })
  }

  async function setRewardContract(rewardContractAddress: string): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'setRewardContract',
      args: [rewardContractAddress],
    })
  }

  async function pause(): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'pause',
    })
  }

  async function unpause(): Promise<Hash> {
    return writeContractAsync({
      address: veLikeAddress,
      abi: veLikeABI,
      functionName: 'unpause',
    })
  }

  return {
    // Read functions
    getAsset,
    balanceOf,
    totalSupply,
    totalAssets,
    convertToShares,
    convertToAssets,
    maxDeposit,
    previewDeposit,
    maxMint,
    previewMint,
    maxWithdraw,
    previewWithdraw,
    maxRedeem,
    previewRedeem,
    allowance,
    getLockTime,
    getPendingReward,
    getCurrentRewardContract,
    paused,
    // Write functions
    deposit,
    mint,
    withdraw,
    redeem,
    approve,
    transfer,
    transferFrom,
    claimReward,
    restakeReward,
    setLockTime,
    setRewardContract,
    pause,
    unpause,
  }
}
