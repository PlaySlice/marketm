import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey, Keypair, clusterApiUrl } from '@solana/web3.js';
import { toast } from 'react-toastify';
import bs58 from 'bs58';
import { stopMarketMaking } from '../services/marketMakerService';

const WalletContext = createContext();

// List of alternative public RPC endpoints
const PUBLIC_RPC_ENDPOINTS = [
  { name: 'Solana Public RPC', url: 'https://api.mainnet-beta.solana.com' },
  { name: 'GenesysGo', url: 'https://ssc-dao.genesysgo.net' },
  { name: 'Serum', url: 'https://solana-api.projectserum.com' },
  { name: 'Triton', url: 'https://free.rpcpool.com' },
  { name: 'Metaplex', url: 'https://api.metaplex.solana.com' },
  { name: 'Devnet', url: 'https://api.devnet.solana.com' },
  { name: 'Testnet', url: 'https://api.testnet.solana.com' },
];

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    console.error('useWallet must be used within a WalletContextProvider');
  }
  return context;
}

export function WalletContextProvider({ children }) {
  const [connection, setConnection] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [activeWallets, setActiveWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false, message: 'Not connected' });
  const [settings, setSettings] = useState({
    rpcEndpoint: 'https://api.devnet.solana.com', // Default to devnet which has fewer restrictions
    maxWallets: 5,
    cyclesBeforeRecycle: 10,
    minInterval: 60, // seconds
    maxInterval: 300, // seconds
    minAmount: 0.01, // SOL
    maxAmount: 0.1, // SOL
    isRandomized: true,
  });

  const initializeConnection = useCallback(async () => {
    try {
      setConnectionStatus({ connected: false, message: 'Connecting...' });
      
      // Clean up the URL to ensure it's properly formatted
      let endpoint = settings.rpcEndpoint.trim();
      
      // Check if it's a predefined cluster
      if (endpoint === 'mainnet-beta' || endpoint === 'mainnet') {
        endpoint = clusterApiUrl('mainnet-beta');
      } else if (endpoint === 'devnet') {
        endpoint = clusterApiUrl('devnet');
      } else if (endpoint === 'testnet') {
        endpoint = clusterApiUrl('testnet');
      }
      
      // Ensure the URL starts with http:// or https://
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        endpoint = 'https://' + endpoint;
      }
      
      console.log('Connecting to Solana network at:', endpoint);
      
      // Create connection with commitment level and timeout
      const conn = new Connection(endpoint, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000, // 60 seconds
        disableRetryOnRateLimit: false,
      });
      
      // Test the connection
      try {
        const version = await conn.getVersion();
        console.log('Connected to Solana network:', version);
        setConnection(conn);
        setConnectionStatus({ 
          connected: true, 
          message: `Connected to ${endpoint} (Solana ${version['solana-core']})` 
        });
        toast.success(`Connected to Solana network (${endpoint})`);
      } catch (error) {
        console.error('Failed to connect to Solana network:', error);
        
        // Check if it's a 403 error
        if (error.message && error.message.includes('403')) {
          const errorMessage = 'Access forbidden (403). This RPC endpoint may have rate limits or IP restrictions.';
          setConnectionStatus({ connected: false, message: errorMessage });
          toast.error(errorMessage);
          
          // Suggest alternative endpoints
          toast.info('Try using a different RPC endpoint in Settings');
        } else {
          setConnectionStatus({ connected: false, message: `Error: ${error.message}` });
          toast.error(`Failed to connect: ${error.message}`);
        }
        
        setConnection(null);
      }
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      setConnectionStatus({ connected: false, message: `Error: ${error.message}` });
      toast.error(`Failed to initialize connection: ${error.message}`);
      setConnection(null);
    }
  }, [settings.rpcEndpoint]);

  const createWallet = useCallback(() => {
    try {
      const newWallet = Keypair.generate();
      const walletData = {
        id: Date.now().toString(),
        publicKey: newWallet.publicKey.toString(),
        privateKey: bs58.encode(newWallet.secretKey),
        balance: 0,
        cyclesCompleted: 0,
        isActive: false,
        transactions: [],
        // Add custom trade settings for this wallet
        customSettings: {
          enabled: false, // Whether to use custom settings or global settings
          cyclesBeforeRecycle: settings.cyclesBeforeRecycle,
          minInterval: settings.minInterval,
          maxInterval: settings.maxInterval,
          minAmount: settings.minAmount,
          maxAmount: settings.maxAmount,
          isRandomized: settings.isRandomized,
          tokenMint: 'So11111111111111111111111111111111111111112', // Default to SOL
        }
      };
      
      setWallets(prev => [...prev, walletData]);
      toast.success('New wallet created');
      return walletData;
    } catch (error) {
      console.error('Failed to create wallet:', error);
      toast.error('Failed to create wallet');
      return null;
    }
  }, [settings]);

  const importWallet = useCallback((privateKeyString) => {
    try {
      let secretKey;
      try {
        secretKey = bs58.decode(privateKeyString);
      } catch (e) {
        throw new Error('Invalid private key format');
      }
      
      const keypair = Keypair.fromSecretKey(secretKey);
      const walletData = {
        id: Date.now().toString(),
        publicKey: keypair.publicKey.toString(),
        privateKey: privateKeyString,
        balance: 0,
        cyclesCompleted: 0,
        isActive: false,
        transactions: [],
        // Add custom trade settings for this wallet
        customSettings: {
          enabled: false, // Whether to use custom settings or global settings
          cyclesBeforeRecycle: settings.cyclesBeforeRecycle,
          minInterval: settings.minInterval,
          maxInterval: settings.maxInterval,
          minAmount: settings.minAmount,
          maxAmount: settings.maxAmount,
          isRandomized: settings.isRandomized,
          tokenMint: 'So11111111111111111111111111111111111111112', // Default to SOL
        }
      };
      
      setWallets(prev => [...prev, walletData]);
      toast.success('Wallet imported successfully');
      return walletData;
    } catch (error) {
      console.error('Failed to import wallet:', error);
      toast.error(`Failed to import wallet: ${error.message}`);
      return null;
    }
  }, [settings]);

  const updateWalletSettings = useCallback((walletId, customSettings) => {
    setWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, customSettings: { ...wallet.customSettings, ...customSettings } } 
          : wallet
      )
    );
    toast.success('Wallet settings updated');
  }, []);

  const activateWallet = useCallback((walletId) => {
    setWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, isActive: true } 
          : wallet
      )
    );
    
    const walletToActivate = wallets.find(w => w.id === walletId);
    if (walletToActivate) {
      setActiveWallets(prev => [...prev, walletToActivate]);
      toast.success(`Wallet ${walletToActivate.publicKey.slice(0, 8)}... activated`);
    }
  }, [wallets]);

  const deactivateWallet = useCallback((walletId) => {
    setWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, isActive: false } 
          : wallet
      )
    );
    
    setActiveWallets(prev => prev.filter(wallet => wallet.id !== walletId));
    toast.info(`Wallet deactivated`);
  }, []);

  const deleteWallet = useCallback((walletId) => {
    try {
      // First check if the wallet is active in market making
      const walletToDelete = wallets.find(w => w.id === walletId);
      
      if (walletToDelete && walletToDelete.isActive) {
        // Stop any active market making for this wallet
        stopMarketMaking(walletId);
        
        // Deactivate the wallet
        deactivateWallet(walletId);
      }
      
      // Remove the wallet from the wallets array
      setWallets(prev => prev.filter(wallet => wallet.id !== walletId));
      
      toast.success('Wallet deleted successfully');
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      toast.error(`Failed to delete wallet: ${error.message}`);
    }
  }, [wallets, deactivateWallet]);

  const deleteAllWallets = useCallback(() => {
    try {
      // Stop market making for all active wallets
      wallets.forEach(wallet => {
        if (wallet.isActive) {
          stopMarketMaking(wallet.id);
        }
      });
      
      // Clear all wallets
      setWallets([]);
      setActiveWallets([]);
      
      toast.success('All wallets deleted successfully');
    } catch (error) {
      console.error('Failed to delete all wallets:', error);
      toast.error(`Failed to delete all wallets: ${error.message}`);
    }
  }, [wallets]);

  const recycleWallet = useCallback(async (walletId) => {
    try {
      setIsLoading(true);
      const oldWallet = wallets.find(w => w.id === walletId);
      
      if (!oldWallet) {
        throw new Error('Wallet not found');
      }
      
      // Create new wallet
      const newWallet = createWallet();
      
      if (!newWallet) {
        throw new Error('Failed to create new wallet');
      }
      
      // TODO: Transfer funds from old wallet to new wallet
      // This would require actual Solana transaction code
      
      // For now, we'll just simulate it
      toast.info(`Recycling wallet ${oldWallet.publicKey.slice(0, 8)}...`);
      
      // Deactivate old wallet
      deactivateWallet(walletId);
      
      // Activate new wallet
      activateWallet(newWallet.id);
      
      toast.success('Wallet recycled successfully');
    } catch (error) {
      console.error('Failed to recycle wallet:', error);
      toast.error(`Failed to recycle wallet: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [wallets, createWallet, deactivateWallet, activateWallet]);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    toast.success('Settings updated');
    
    // Reconnect if RPC endpoint changed
    if (newSettings.rpcEndpoint && newSettings.rpcEndpoint !== settings.rpcEndpoint) {
      initializeConnection();
    }
  }, [settings.rpcEndpoint, initializeConnection]);

  const updateWalletData = useCallback((walletId, updates) => {
    setWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, ...updates } 
          : wallet
      )
    );
    
    // Also update in activeWallets if present
    setActiveWallets(prev => 
      prev.map(wallet => 
        wallet.id === walletId 
          ? { ...wallet, ...updates } 
          : wallet
      )
    );
  }, []);

  // Load wallets from localStorage on initial load
  useEffect(() => {
    const savedWallets = localStorage.getItem('marketMakerWallets');
    if (savedWallets) {
      try {
        setWallets(JSON.parse(savedWallets));
      } catch (e) {
        console.error('Failed to load saved wallets:', e);
      }
    }
    
    const savedSettings = localStorage.getItem('marketMakerSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load saved settings:', e);
      }
    }
  }, []);

  // Initialize connection on first load
  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  // Save wallets to localStorage when they change
  useEffect(() => {
    localStorage.setItem('marketMakerWallets', JSON.stringify(wallets));
  }, [wallets]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('marketMakerSettings', JSON.stringify(settings));
  }, [settings]);

  const value = {
    connection,
    wallets,
    activeWallets,
    settings,
    isLoading,
    connectionStatus,
    initializeConnection,
    createWallet,
    importWallet,
    activateWallet,
    deactivateWallet,
    recycleWallet,
    updateSettings,
    updateWalletData,
    updateWalletSettings,
    deleteWallet,
    deleteAllWallets,
    publicRpcEndpoints: PUBLIC_RPC_ENDPOINTS,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
