import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

function Settings() {
  const { settings, updateSettings, initializeConnection, connectionStatus, publicRpcEndpoints } = useWallet();
  const [formData, setFormData] = useState({
    rpcEndpoint: settings.rpcEndpoint,
    maxWallets: settings.maxWallets,
    cyclesBeforeRecycle: settings.cyclesBeforeRecycle,
    minInterval: settings.minInterval,
    maxInterval: settings.maxInterval,
    minAmount: settings.minAmount,
    maxAmount: settings.maxAmount,
    isRandomized: settings.isRandomized,
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
  };

  const handleTestConnection = async () => {
    setIsConnecting(true);
    // Update the RPC endpoint in settings
    updateSettings({ rpcEndpoint: formData.rpcEndpoint });
    // Then initialize the connection
    setTimeout(() => {
      initializeConnection();
      setIsConnecting(false);
    }, 500);
  };

  const handleSelectEndpoint = (endpoint) => {
    setFormData(prev => ({ ...prev, rpcEndpoint: endpoint }));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      
      <div className="card mb-6">
        <h3 className="text-lg font-medium text-white mb-4">Connection Status</h3>
        <div className={`p-3 rounded-lg ${connectionStatus.connected ? 'bg-green-900 bg-opacity-20 border border-green-700' : 'bg-red-900 bg-opacity-20 border border-red-700'}`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className={`${connectionStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
              {connectionStatus.message}
            </p>
          </div>
        </div>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Solana Connection</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="rpcEndpoint" className="block text-sm font-medium text-gray-300 mb-2">
                  Solana RPC Endpoint
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="rpcEndpoint"
                    name="rpcEndpoint"
                    className="input w-full"
                    value={formData.rpcEndpoint}
                    onChange={handleChange}
                    placeholder="https://api.devnet.solana.com"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleTestConnection}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Test Connection'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Public RPC endpoints may have rate limits. For production use, consider a dedicated RPC provider.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Public RPC Endpoints
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {publicRpcEndpoints.map((endpoint, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`btn text-xs ${formData.rpcEndpoint === endpoint.url ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleSelectEndpoint(endpoint.url)}
                    >
                      {endpoint.name}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-yellow-500">
                  Note: Public RPC endpoints may return 403 errors due to rate limits or IP restrictions.
                  If you encounter issues, try a different endpoint or use a dedicated RPC provider.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Wallet Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="maxWallets" className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Active Wallets
                </label>
                <input
                  type="number"
                  id="maxWallets"
                  name="maxWallets"
                  className="input w-full"
                  value={formData.maxWallets}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  Number of wallets to run concurrently (1-10)
                </p>
              </div>
              
              <div>
                <label htmlFor="cyclesBeforeRecycle" className="block text-sm font-medium text-gray-300 mb-2">
                  Cycles Before Recycling
                </label>
                <input
                  type="number"
                  id="cyclesBeforeRecycle"
                  name="cyclesBeforeRecycle"
                  className="input w-full"
                  value={formData.cyclesBeforeRecycle}
                  onChange={handleChange}
                  min="1"
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  Number of buy-sell cycles before generating a new wallet
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Trading Parameters</h3>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="isRandomized"
                name="isRandomized"
                className="w-4 h-4 text-solana bg-gray-700 border-gray-600 rounded focus:ring-solana focus:ring-2"
                checked={formData.isRandomized}
                onChange={handleChange}
              />
              <label htmlFor="isRandomized" className="ml-2 text-sm font-medium text-gray-300">
                Use randomized intervals and amounts
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="minInterval" className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Interval (seconds)
                </label>
                <input
                  type="number"
                  id="minInterval"
                  name="minInterval"
                  className="input w-full"
                  value={formData.minInterval}
                  onChange={handleChange}
                  min="10"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="maxInterval" className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Interval (seconds)
                </label>
                <input
                  type="number"
                  id="maxInterval"
                  name="maxInterval"
                  className="input w-full"
                  value={formData.maxInterval}
                  onChange={handleChange}
                  min={formData.minInterval}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="minAmount" className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Amount (SOL)
                </label>
                <input
                  type="number"
                  id="minAmount"
                  name="minAmount"
                  className="input w-full"
                  value={formData.minAmount}
                  onChange={handleChange}
                  min="0.001"
                  step="0.001"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Amount (SOL)
                </label>
                <input
                  type="number"
                  id="maxAmount"
                  name="maxAmount"
                  className="input w-full"
                  value={formData.maxAmount}
                  onChange={handleChange}
                  min={formData.minAmount}
                  step="0.001"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
