import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getWalletBalance } from '../services/walletService';
import { startMarketMaking, stopMarketMaking, getActiveBotStatus } from '../services/marketMakerService';
import { toast } from 'react-toastify';

function WalletCard({ wallet, onRecycle, onUpdate }) {
  const { connection, settings, updateWalletSettings, deleteWallet } = useWallet();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [botStatus, setBotStatus] = useState({ isActive: false });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customSettings, setCustomSettings] = useState(wallet.customSettings || {
    enabled: false,
    cyclesBeforeRecycle: settings.cyclesBeforeRecycle,
    minInterval: settings.minInterval,
    maxInterval: settings.maxInterval,
    minAmount: settings.minAmount,
    maxAmount: settings.maxAmount,
    isRandomized: settings.isRandomized,
    tokenMint: 'So11111111111111111111111111111111111111112', // Default to SOL
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchBalance = async () => {
      if (connection && wallet.publicKey) {
        try {
          const bal = await getWalletBalance(connection, wallet.publicKey);
          if (isMounted) {
            setBalance(bal);
          }
        } catch (error) {
          console.error('Failed to fetch balance:', error);
          if (isMounted) {
            setErrorMessage('Failed to fetch wallet balance');
          }
        }
      }
    };
    
    fetchBalance();
    
    // Check bot status
    const status = getActiveBotStatus(wallet.id);
    setBotStatus(status);
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [connection, wallet.publicKey, wallet.id]);

  // Update local state when wallet.customSettings changes
  useEffect(() => {
    if (wallet.customSettings) {
      setCustomSettings(wallet.customSettings);
    }
  }, [wallet.customSettings]);

  const handleStartBot = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Check if connection is established
      if (!connection) {
        throw new Error('No connection to Solana network. Please check your RPC endpoint in settings.');
      }
      
      // Check if wallet has sufficient balance
      const minRequired = customSettings.enabled ? customSettings.minAmount : settings.minAmount;
      if (balance < minRequired * 2) { // * 2 to account for fees and both buy/sell
        throw new Error(`Insufficient balance. Minimum required: ${(minRequired * 2).toFixed(4)} SOL`);
      }
      
      const result = startMarketMaking(
        connection, 
        wallet, 
        settings,
        (walletId, cyclesCompleted, needsRecycle) => {
          // Update wallet cycles
          onUpdate(walletId, { cyclesCompleted });
          
          // Check if wallet needs recycling
          if (needsRecycle) {
            onRecycle(walletId);
          }
        }
      );
      
      if (!result) {
        throw new Error('Failed to start market making bot');
      }
      
      // Update bot status
      const status = getActiveBotStatus(wallet.id);
      setBotStatus(status);
      
      toast.success(`Bot started for wallet ${wallet.publicKey.slice(0, 6)}...${wallet.publicKey.slice(-4)}`);
    } catch (error) {
      console.error('Failed to start market making:', error);
      setErrorMessage(error.message || 'Failed to start market making');
      toast.error(`Failed to start bot: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopBot = () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      const result = stopMarketMaking(wallet.id);
      
      if (!result) {
        throw new Error('Bot was not running or could not be stopped');
      }
      
      setBotStatus({ isActive: false });
      toast.success(`Bot stopped for wallet ${wallet.publicKey.slice(0, 6)}...${wallet.publicKey.slice(-4)}`);
    } catch (error) {
      console.error('Failed to stop market making:', error);
      setErrorMessage(error.message || 'Failed to stop market making');
      toast.error(`Failed to stop bot: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const handleSaveSettings = () => {
    updateWalletSettings(wallet.id, customSettings);
    setShowSettings(false);
    toast.success('Wallet settings updated');
  };

  const handleDeleteWallet = () => {
    if (botStatus.isActive) {
      toast.error('Stop the bot before deleting this wallet');
      return;
    }
    
    setShowDeleteConfirm(true);
  };

  const confirmDeleteWallet = () => {
    deleteWallet(wallet.id);
  };

  const formatPublicKey = (key) => {
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  };

  // Calculate minimum required balance
  const minRequired = customSettings.enabled ? customSettings.minAmount : settings.minAmount;
  const hasEnoughBalance = balance >= minRequired * 2;

  return (
    <div className="card mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Wallet {formatPublicKey(wallet.publicKey)}
          </h3>
          <p className="text-gray-400 text-sm">
            Cycles: {wallet.cyclesCompleted || 0} / {customSettings.enabled ? customSettings.cyclesBeforeRecycle : settings.cyclesBeforeRecycle}
          </p>
          {customSettings.enabled && (
            <span className="inline-block mt-1 px-2 py-1 bg-solana bg-opacity-20 text-solana text-xs rounded-full">
              Custom Settings
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {botStatus.isActive ? (
            <button 
              className="btn btn-secondary text-xs"
              onClick={handleStopBot}
              disabled={isLoading}
            >
              {isLoading ? 'Stopping...' : 'Stop Bot'}
            </button>
          ) : (
            <button 
              className="btn btn-primary text-xs"
              onClick={handleStartBot}
              disabled={isLoading || !hasEnoughBalance}
              title={!hasEnoughBalance ? `Insufficient balance. Need at least ${(minRequired * 2).toFixed(4)} SOL` : ''}
            >
              {isLoading ? 'Starting...' : 'Start Bot'}
            </button>
          )}
          <button 
            className="btn btn-secondary text-xs"
            onClick={() => setShowSettings(!showSettings)}
            disabled={isLoading || botStatus.isActive}
          >
            {showSettings ? 'Hide Settings' : 'Settings'}
          </button>
          <button 
            className="btn btn-secondary text-xs"
            onClick={() => onRecycle(wallet.id)}
            disabled={isLoading || botStatus.isActive}
          >
            Recycle
          </button>
          <button 
            className="btn text-xs bg-red-700 hover:bg-red-600 text-white"
            onClick={handleDeleteWallet}
            disabled={isLoading || botStatus.isActive}
          >
            Delete
          </button>
        </div>
      </div>
      
      {errorMessage && (
        <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm">{errorMessage}</p>
        </div>
      )}
      
      {!hasEnoughBalance && !botStatus.isActive && (
        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-3 mb-4">
          <p className="text-yellow-300 text-sm">
            Insufficient balance to start bot. Required: {(minRequired * 2).toFixed(4)} SOL, Current: {balance.toFixed(4)} SOL
          </p>
        </div>
      )}
      
      {showDeleteConfirm && (
        <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4 mb-4">
          <p className="text-white mb-3">Are you sure you want to delete this wallet? This action cannot be undone.</p>
          <div className="flex justify-end space-x-3">
            <button 
              className="btn text-xs bg-gray-700 hover:bg-gray-600 text-white"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button 
              className="btn text-xs bg-red-700 hover:bg-red-600 text-white"
              onClick={confirmDeleteWallet}
            >
              Delete Wallet
            </button>
          </div>
        </div>
      )}
      
      {showSettings && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-3">Custom Trading Settings</h4>
          
          <div className="mb-3">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id={`enabled-${wallet.id}`}
                name="enabled"
                className="w-4 h-4 text-solana bg-gray-700 border-gray-600 rounded focus:ring-solana focus:ring-2"
                checked={customSettings.enabled}
                onChange={handleSettingsChange}
              />
              <label htmlFor={`enabled-${wallet.id}`} className="ml-2 text-sm font-medium text-gray-300">
                Use custom settings for this wallet
              </label>
            </div>
          </div>
          
          {customSettings.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Cycles Before Recycling
                  </label>
                  <input
                    type="number"
                    name="cyclesBeforeRecycle"
                    className="input w-full"
                    value={customSettings.cyclesBeforeRecycle}
                    onChange={handleSettingsChange}
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Token Mint
                  </label>
                  <input
                    type="text"
                    name="tokenMint"
                    className="input w-full"
                    value={customSettings.tokenMint}
                    onChange={handleSettingsChange}
                    placeholder="Token mint address"
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id={`randomized-${wallet.id}`}
                    name="isRandomized"
                    className="w-4 h-4 text-solana bg-gray-700 border-gray-600 rounded focus:ring-solana focus:ring-2"
                    checked={customSettings.isRandomized}
                    onChange={handleSettingsChange}
                  />
                  <label htmlFor={`randomized-${wallet.id}`} className="ml-2 text-sm font-medium text-gray-300">
                    Use randomized intervals and amounts
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Min Interval (seconds)
                  </label>
                  <input
                    type="number"
                    name="minInterval"
                    className="input w-full"
                    value={customSettings.minInterval}
                    onChange={handleSettingsChange}
                    min="10"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Max Interval (seconds)
                  </label>
                  <input
                    type="number"
                    name="maxInterval"
                    className="input w-full"
                    value={customSettings.maxInterval}
                    onChange={handleSettingsChange}
                    min={customSettings.minInterval}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Min Amount (SOL)
                  </label>
                  <input
                    type="number"
                    name="minAmount"
                    className="input w-full"
                    value={customSettings.minAmount}
                    onChange={handleSettingsChange}
                    min="0.001"
                    step="0.001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Max Amount (SOL)
                  </label>
                  <input
                    type="number"
                    name="maxAmount"
                    className="input w-full"
                    value={customSettings.maxAmount}
                    onChange={handleSettingsChange}
                    min={customSettings.minAmount}
                    step="0.001"
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end">
            <button 
              className="btn btn-primary"
              onClick={handleSaveSettings}
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-gray-700 rounded-lg p-3 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-300">Balance:</span>
          <span className={`font-medium ${hasEnoughBalance ? 'text-white' : 'text-red-300'}`}>
            {balance.toFixed(4)} SOL
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Status:</span>
          <span className={`font-medium ${botStatus.isActive ? 'text-green-400' : 'text-gray-400'}`}>
            {botStatus.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {botStatus.isActive && botStatus.useCustomSettings && (
          <div className="flex justify-between mt-2">
            <span className="text-gray-300">Using:</span>
            <span className="text-solana font-medium">Custom Settings</span>
          </div>
        )}
        <div className="flex justify-between mt-2">
          <span className="text-gray-300">Min Required:</span>
          <span className="text-gray-300 font-medium">{(minRequired * 2).toFixed(4)} SOL</span>
        </div>
      </div>
      
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-300">Public Key:</span>
          <button 
            className="text-xs text-gray-400 hover:text-white"
            onClick={() => navigator.clipboard.writeText(wallet.publicKey)}
          >
            Copy
          </button>
        </div>
        <div className="bg-gray-800 p-2 rounded text-xs font-mono text-gray-300 break-all">
          {wallet.publicKey}
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-300">Private Key:</span>
          <div className="flex space-x-2">
            <button 
              className="text-xs text-gray-400 hover:text-white"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
            >
              {showPrivateKey ? 'Hide' : 'Show'}
            </button>
            {showPrivateKey && (
              <button 
                className="text-xs text-gray-400 hover:text-white"
                onClick={() => navigator.clipboard.writeText(wallet.privateKey)}
              >
                Copy
              </button>
            )}
          </div>
        </div>
        <div className="bg-gray-800 p-2 rounded text-xs font-mono text-gray-300 break-all">
          {showPrivateKey ? wallet.privateKey : '••••••••••••••••••••••••••••••••••••••••••••••••••'}
        </div>
      </div>
    </div>
  );
}

export default WalletCard;
