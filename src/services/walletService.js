import { Keypair, SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { toast } from 'react-toastify';

export async function getWalletBalance(connection, publicKeyString) {
  try {
    const publicKey = new PublicKey(publicKeyString);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    throw new Error(`Failed to get wallet balance: ${error.message}`);
  }
}

export async function transferSOL(connection, fromWallet, toPublicKey, amount) {
  try {
    const fromKeypair = Keypair.fromSecretKey(bs58.decode(fromWallet.privateKey));
    const toPublicKeyObj = new PublicKey(toPublicKey);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKeyObj,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    
    // Set transaction properties
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;
    
    // Sign transaction
    transaction.sign(fromKeypair);
    
    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    });
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }
    
    toast.success(`Transferred ${amount} SOL successfully`);
    return signature;
  } catch (error) {
    console.error('Transfer failed:', error);
    toast.error(`Transfer failed: ${error.message}`);
    throw error;
  }
}

export function generateRandomAmount(min, max) {
  return min + Math.random() * (max - min);
}

export function generateRandomInterval(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}
