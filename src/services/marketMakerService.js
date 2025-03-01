import { swapWithJupiter } from './jupiterService';
import { getWalletBalance, generateRandomAmount, generateRandomInterval } from './walletService';
import { toast } from 'react-toastify';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Store for active trading bots
const activeBots = new Map();

export function startMarketMaking(connection, wallet, globalSettings, onCycleComplete) {
  if (activeBots.has(wallet.id)) {
    toast.info(`Market maker already running for wallet ${wallet.publicKey.slice(0, 8)}...`);
    return false;
  }
  
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
    
    // Determine which settings to use (custom or global)
    const useCustomSettings = wallet.customSettings && wallet.customSettings.enabled;
    const effectiveSettings = useCustomSettings ? wallet.customSettings : globalSettings;
    const tokenMint = useCustomSettings ? wallet.customSettings.tokenMint : 'So11111111111111111111111111111111111111112';
    
    // Validate token mint
    if (!tokenMint || tokenMint.trim() === '') {
      throw new Error('Token mint address is required');
    }
    
    // Initialize bot state
    const botState = {
      wallet,
      settings: effectiveSettings,
      tokenMint,
      cyclesCompleted: wallet.cyclesCompleted || 0,
      isRunning: true,
      lastActionTime: Date.now(),
      transactions: [],
      stopRequested: false,
      useCustomSettings,
    };
    
    // Verify wallet balance before starting
    getWalletBalance(connection, wallet.publicKey)
      .then(balance => {
        const minRequired = effectiveSettings.minAmount * 2; // * 2 to account for fees and both buy/sell
        if (balance < minRequired) {
          throw new Error(`Insufficient balance. Minimum required: ${minRequired.toFixed(4)} SOL, current: ${balance.toFixed(4)} SOL`);
        }
        
        // Start the trading loop
        executeTradeLoop(connection, keypair, botState, onCycleComplete, globalSettings);
        
        // Store the bot reference
        activeBots.set(wallet.id, {
          botState,
          stop: () => {
            botState.stopRequested = true;
          }
        });
        
        const settingsType = useCustomSettings ? 'custom' : 'global';
        toast.success(`Started market making for wallet ${wallet.publicKey.slice(0, 8)}... using ${settingsType} settings`);
        return botState;
      })
      .catch(error => {
        console.error('Failed to start market making:', error);
        toast.error(`Failed to start market making: ${error.message}`);
        return false;
      });
    
    return botState;
  } catch (error) {
    console.error('Failed to start market making:', error);
    toast.error(`Failed to start market making: ${error.message}`);
    return false;
  }
}

async function executeTradeLoop(connection, keypair, botState, onCycleComplete, globalSettings) {
  if (botState.stopRequested) {
    console.log('Bot stop requested, ending trade loop');
    return;
  }
  
  try {
    // Check if we need to recycle the wallet
    if (botState.cyclesCompleted >= botState.settings.cyclesBeforeRecycle) {
      console.log(`Reached ${botState.cyclesCompleted} cycles, recycling wallet`);
      activeBots.delete(botState.wallet.id);
      onCycleComplete(botState.wallet.id, botState.cyclesCompleted, true);
      return;
    }
    
    // Get current wallet balance
    const balance = await getWalletBalance(connection, botState.wallet.publicKey);
    
    // Determine amount to trade
    let amount;
    if (botState.settings.isRandomized) {
      amount = generateRandomAmount(botState.settings.minAmount, botState.settings.maxAmount);
    } else {
      amount = botState.settings.minAmount;
    }
    
    // Make sure we have enough balance
    if (balance < amount * 2) { // * 2 to account for fees and both buy/sell
      toast.warning(`Insufficient balance in wallet ${botState.wallet.publicKey.slice(0, 8)}...`);
      
      // Try again later with a smaller amount
      setTimeout(() => {
        executeTradeLoop(connection, keypair, botState, onCycleComplete, globalSettings);
      }, 60000); // Try again in 1 minute
      
      return;
    }
    
    console.log(`Executing trade cycle ${botState.cyclesCompleted + 1} for wallet ${botState.wallet.publicKey.slice(0, 8)}...`);
    
    try {
      // Execute buy transaction using Jupiter - THIS EXECUTES A REAL SWAP
      console.log('Executing buy transaction...');
      const buyResult = await swapWithJupiter(connection, keypair, {
        tokenMint: botState.tokenMint,
        amount,
        isBuy: true,
      });
      
      botState.transactions.push(buyResult);
      
      // Wait a bit between transactions
      console.log('Waiting between transactions...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Execute sell transaction using Jupiter - THIS EXECUTES A REAL SWAP
      console.log('Executing sell transaction...');
      const sellResult = await swapWithJupiter(connection, keypair, {
        tokenMint: botState.tokenMint,
        amount,
        isBuy: false,
      });
      
      botState.transactions.push(sellResult);
      
      // Increment cycle counter
      botState.cyclesCompleted++;
      
      // Update last action time
      botState.lastActionTime = Date.now();
      
      // Notify about cycle completion
      onCycleComplete(botState.wallet.id, botState.cyclesCompleted, false);
    } catch (swapError) {
      console.error('Swap failed:', swapError);
      toast.error(`Swap failed: ${swapError.message}`);
      // Continue with the next cycle despite the error
    }
    
    // Determine next interval
    let nextInterval;
    if (botState.settings.isRandomized) {
      nextInterval = generateRandomInterval(botState.settings.minInterval, botState.settings.maxInterval) * 1000;
    } else {
      nextInterval = botState.settings.minInterval * 1000;
    }
    
    console.log(`Next trade cycle in ${nextInterval / 1000} seconds`);
    
    // Schedule next cycle
    setTimeout(() => {
      executeTradeLoop(connection, keypair, botState, onCycleComplete, globalSettings);
    }, nextInterval);
    
  } catch (error) {
    console.error('Market making cycle failed:', error);
    toast.error(`Market making cycle failed: ${error.message}`);
    
    // Try again after a delay
    setTimeout(() => {
      executeTradeLoop(connection, keypair, botState, onCycleComplete, globalSettings);
    }, 60000); // Try again in 1 minute
  }
}

export function stopMarketMaking(walletId) {
  const bot = activeBots.get(walletId);
  if (bot) {
    bot.stop();
    activeBots.delete(walletId);
    toast.info(`Stopped market making for wallet ${bot.botState.wallet.publicKey.slice(0, 8)}...`);
    return true;
  }
  return false;
}

export function getActiveBotStatus(walletId) {
  const bot = activeBots.get(walletId);
  if (bot) {
    return {
      isActive: true,
      cyclesCompleted: bot.botState.cyclesCompleted,
      lastActionTime: bot.botState.lastActionTime,
      transactions: bot.botState.transactions,
      useCustomSettings: bot.botState.useCustomSettings,
    };
  }
  return { isActive: false };
}

export function getAllActiveBots() {
  return Array.from(activeBots.entries()).map(([id, bot]) => ({
    id,
    publicKey: bot.botState.wallet.publicKey,
    cyclesCompleted: bot.botState.cyclesCompleted,
    lastActionTime: bot.botState.lastActionTime,
    useCustomSettings: bot.botState.useCustomSettings,
  }));
}
