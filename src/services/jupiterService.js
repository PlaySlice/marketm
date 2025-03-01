import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { toast } from 'react-toastify';
import bs58 from 'bs58';

// SOL token mint address
const SOL_MINT = 'So11111111111111111111111111111111111111112';

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
    
    // Determine input and output tokens based on buy/sell
    const inputMint = params.isBuy ? SOL_MINT : params.tokenMint;
    const outputMint = params.isBuy ? params.tokenMint : SOL_MINT;
    
    // Convert amount to lamports (smallest unit)
    const amountInLamports = Math.floor(params.amount * 1000000000); // Convert to lamports
    
    console.log(`Swapping ${params.amount} SOL (${amountInLamports} lamports) from ${inputMint} to ${outputMint}`);
    
    // Fetch quote directly from Jupiter API
    const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=50&onlyDirectRoutes=false&asLegacyTransaction=true`);
    
    if (!quoteResponse.ok) {
      throw new Error(`Failed to get quote: ${quoteResponse.statusText}`);
    }
    
    const quoteData = await quoteResponse.json();
    console.log('Quote received:', quoteData);
    
    if (!quoteData || !quoteData.data) {
      throw new Error(`No routes found for swap from ${inputMint} to ${outputMint}`);
    }
    
    // Get swap transaction from Jupiter API
    const swapResponse = await fetch('https://swap-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quoteData.data,
        userPublicKey: keypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        asLegacyTransaction: true
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Failed to get swap transaction: ${swapResponse.statusText}`);
    }
    
    const swapData = await swapResponse.json();
    console.log('Swap transaction received');
    
    if (!swapData || !swapData.swapTransaction) {
      throw new Error('Failed to get swap transaction data');
    }
    
    // Deserialize and sign the transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
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
    // Fetch quote directly from Jupiter API
    const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=1000000000&slippageBps=50`);
    
    if (!quoteResponse.ok) {
      throw new Error(`Failed to get price: ${quoteResponse.statusText}`);
    }
    
    const quoteData = await quoteResponse.json();
    
    if (!quoteData || !quoteData.data) {
      throw new Error(`No price found for token ${tokenMint}`);
    }
    
    // Calculate the price
    const outAmount = Number(quoteData.data.outAmount) / 1000000000; // Convert from lamports to SOL
    
    return outAmount;
  } catch (error) {
    console.error('Failed to get token price:', error);
    return null;
  }
}
