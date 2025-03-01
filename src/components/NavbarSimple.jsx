import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

function NavbarSimple() {
  const location = useLocation();
  const { activeWallets } = useWallet();
  
  return (
    <nav className="bg-gray-900 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white">Solana Market Maker</span>
          </div>
          
          <div className="hidden md:flex space-x-8">
            <Link to="/" className={`text-sm font-medium ${location.pathname === '/' ? 'text-white' : 'text-gray-300'}`}>
              Dashboard
            </Link>
            <Link to="/wallets" className={`text-sm font-medium ${location.pathname === '/wallets' ? 'text-white' : 'text-gray-300'}`}>
              Wallets
              {activeWallets.length > 0 && (
                <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                  {activeWallets.length}
                </span>
              )}
            </Link>
            <Link to="/settings" className={`text-sm font-medium ${location.pathname === '/settings' ? 'text-white' : 'text-gray-300'}`}>
              Settings
            </Link>
          </div>
          
          <div className="md:hidden">
            <button className="text-white">Menu</button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default NavbarSimple;
