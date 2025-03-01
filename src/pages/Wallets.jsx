import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import WalletCard from '../components/WalletCard';
import { toast } from 'react-toastify';

function Wallets() {
  const { 
    wallets, 
    createWallet, 
    importWallet, 
    recycleWallet,
    isLoading,
    updateWalletData,
    deleteAllWallets
  } = useWallet();
  
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleCreateWallet = () => {
    createWallet();
  };

  const handleImportWallet = (e) => {
    e.preventDefault();
    
    if (!privateKeyInput.trim()) {
      toast.error('Please enter a private key');
      return;
    }
    
    const result = importWallet(privateKeyInput);
    
    if (result) {
      setPrivateKeyInput('');
      setShowImportForm(false);
    }
  };

  const handleRecycleWallet = (walletId) => {
    recycleWallet(walletId);
  };

  const handleUpdateWallet = (walletId, updates) => {
    updateWalletData(walletId, updates);
  };

  const handleDeleteAllWallets = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAllWallets = () => {
    deleteAllWallets();
    setShowDeleteAllConfirm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Wallet Management</h1>
        <div className="flex space-x-3">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowImportForm(!showImportForm)}
          >
            {showImportForm ? 'Cancel Import' : 'Import Wallet'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleCreateWallet}
            disabled={isLoading}
          >
            Create New Wallet
          </button>
          {wallets.length > 0 && (
            <button 
              className="btn bg-red-700 hover:bg-red-600 text-white"
              onClick={handleDeleteAllWallets}
              disabled={isLoading}
            >
              Delete All
            </button>
          )}
        </div>
      </div>
      
      {showDeleteAllConfirm && (
        <div className="card bg-red-900 bg-opacity-20 border border-red-700 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Delete All Wallets</h2>
          <p className="text-white mb-4">
            Are you sure you want to delete all wallets? This action cannot be undone and will stop all active bots.
          </p>
          <div className="flex justify-end space-x-3">
            <button 
              className="btn bg-gray-700 hover:bg-gray-600 text-white"
              onClick={() => setShowDeleteAllConfirm(false)}
            >
              Cancel
            </button>
            <button 
              className="btn bg-red-700 hover:bg-red-600 text-white"
              onClick={confirmDeleteAllWallets}
            >
              Delete All Wallets
            </button>
          </div>
        </div>
      )}
      
      {showImportForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Import Wallet</h2>
          <form onSubmit={handleImportWallet}>
            <div className="mb-4">
              <label htmlFor="privateKey" className="block text-sm font-medium text-gray-300 mb-2">
                Private Key (Base58 encoded)
              </label>
              <input
                type="text"
                id="privateKey"
                className="input w-full"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="Enter private key..."
                required
              />
            </div>
            <div className="flex justify-end">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading}
              >
                Import
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {wallets.length > 0 ? (
          wallets.map(wallet => (
            <WalletCard 
              key={wallet.id} 
              wallet={wallet} 
              onRecycle={handleRecycleWallet}
              onUpdate={handleUpdateWallet}
            />
          ))
        ) : (
          <div className="col-span-2 card flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No Wallets Yet</h3>
            <p className="text-gray-400 text-center mb-6">
              Create a new wallet or import an existing one to get started.
            </p>
            <button 
              className="btn btn-primary"
              onClick={handleCreateWallet}
              disabled={isLoading}
            >
              Create First Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Wallets;
