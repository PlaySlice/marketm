import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as JupiterApi from '@jup-ag/api';
import { toast } from 'react-toastify';
import bs58 from 'bs58';

// SOL token mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Initialize Jupiter instance
 * @param {Connection} connection - Solana connection
 * @returns {Promise<Object>} - Jupiter instance
 */
export async function initJupiter(connection) {
  try {
    // Create Jupiter API client
    const jupiterQuoteApi = JupiterApi.QuoteApi(
      'https://quote-api.jup.ag/v6',
      {
        // Optional: Add any configuration options here
      }
    );
    
    const jupiterSwapApi = JupiterApi.SwapApi(
      'https://swap-api.jup.ag/v6',
      {
        // Optional: Add any configuration options here
      }
    );
    
    return {
      quoteApi: jupiterQuoteApi,
      swapApi: jupiterSwapApi,
      connection
    };
  } catch (error) {
    console.error('Failed to initialize Jupiter:', error);
    throw error;
  }
}

/**
 * Swap tokens using Jupiter - THIS EXECUTES REAL SWAPS ON THE BLOCKCHAIN
 * @param {Connection} connection - Solana connection
 * @param {Object} keypair - Solana keypair
 * @param {Object} params - Swap parameters
 * @returns {Promise<Object>} - Transaction result
 */
export async function swapWithJupiter(connection, keypair, params) {
  try {
    console.log('Executing REAL Jupiter swap with params:', params);
    
    // Initialize Jupiter
    const jupiter = await initJupiter(connection);
    
    // Determine input and output tokens based on buy/sell
    const inputMint = params.isBuy ? SOL_MINT : params.tokenMint;
    const outputMint = params.isBuy ? params.tokenMint : SOL_MINT;
    
    // Convert amount to lamports (smallest unit)
    const amountInLamports = Math.floor(params.amount * 1000000000); // Convert to lamports
    
    console.log(`Swapping ${params.amount} SOL (${amountInLamports} lamports) from ${inputMint} to ${outputMint}`);
    
    // Get quote from Jupiter
    const quoteResponse = await jupiter.quoteApi.getQuote({
      inputMint,
      outputMint,
      amount: amountInLamports.toString(),
      slippageBps: 50, // 0.5% slippage
      onlyDirectRoutes: false,
      asLegacyTransaction: true
    });
    
    if (!quoteResponse || !quoteResponse.data) {
      throw new Error(`No routes found for swap from ${inputMint} to ${outputMint}`);
    }
    
    console.log('Quote received:', quoteResponse.data);
    
    // Get the swap transaction
    const swapResponse = await jupiter.swapApi.getSwapTransaction({
      quoteResponse: quoteResponse.data,
      userPublicKey: keypair.publicKey.toString(),
      wrapAndUnwrapSol: true,
      asLegacyTransaction: true
    });
    
    if (!swapResponse || !swapResponse.data) {
      throw new Error('Failed to get swap transaction');
    }
    
    console.log('Swap transaction received');
    
    // Deserialize and sign the transaction
    const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
    const transaction = Transaction.from(swapTransactionBuf);
    
    // Sign and send the transaction
    console.log('Sending REAL swap transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair],
      { commitment: 'confirmed' }
    );
    
    console.log('Swap transaction confirmed with signature:', signature);
    
    // Return the result with transaction signature
    const result = {
      signature,
      success: true,
      timestamp: Date.now(),
      type: params.isBuy ? 'buy' : 'sell',
      amount: params.amount,
      inputToken: inputMint,
      outputToken: outputMint
    };
    
    toast.success(`${params.isBuy ? 'Buy' : 'Sell'} order executed for ${params.amount} ${params.isBuy ? 'SOL' : 'tokens'} - Transaction: ${signature}`);
    return result;
  } catch (error) {
    console.error('Jupiter swap failed:', error);
    toast.error(`Swap failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get token price from Jupiter
 * @param {Connection} connection - Solana connection
 * @param {string} tokenMint - Token mint address
 * @returns {Promise<number>} - Token price in SOL
 */
export async function getTokenPrice(connection, tokenMint) {
  try {
    const jupiter = await initJupiter(connection);
    
    // Get price as quote
    const quoteResponse = await jupiter.quoteApi.getQuote({
      inputMint: tokenMint,
      outputMint: SOL_MINT,
      amount: "1000000000", // 1 token in smallest units
      slippageBps: 50
    });
    
    if (!quoteResponse || !quoteResponse.data) {
      throw new Error(`No price found for token ${tokenMint}`);
    }
    
    // Calculate the price
    const outAmount = Number(quoteResponse.data.outAmount) / 1000000000; // Convert from lamports to SOL
    
    return outAmount;
  } catch (error) {
    console.error('Failed to get token price:', error);
    return null;
  }
}
