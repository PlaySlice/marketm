import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

// Simple NavLink component
const NavLink = ({ to, active, children }) => (
  <Link 
    to={to} 
    className={`text-sm font-medium transition-colors duration-200 flex items-center ${
      active ? 'text-white' : 'text-gray-300 hover:text-white'
    }`}
  >
    {children}
  </Link>
);

// Main Navbar component
const Navbar = () => {
  const location = useLocation();
  const { activeWallets } = useWallet();
  
  return (
    <nav className="bg-gray-900 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo and title */}
          <div className="flex items-center space-x-2">
            {/* Solana logo */}
            <div className="w-8 h-8 text-solana">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
                <path d="M23.5 10.5H8.7c-0.4 0-0.8 0.2-1.1 0.5l-2.2 2.9c-0.2 0.2-0.2 0.6 0 0.8l2.2 2.9c0.3 0.3 0.7 0.5 1.1 0.5h14.8c0.4 0 0.8-0.2 1.1-0.5l2.2-2.9c0.2-0.2 0.2-0.6 0-0.8l-2.2-2.9c-0.3-0.3-0.7-0.5-1.1-0.5z" />
                <path d="M23.5 19H8.7c-0.4 0-0.8 0.2-1.1 0.5l-2.2 2.9c-0.2 0.2-0.2 0.6 0 0.8l2.2 2.9c0.3 0.3 0.7 0.5 1.1 0.5h14.8c0.4 0 0.8-0.2 1.1-0.5l2.2-2.9c0.2-0.2 0.2-0.6 0-0.8l-2.2-2.9c-0.3-0.3-0.7-0.5-1.1-0.5z" />
                <path d="M8.7 9H23.5c0.4 0 0.8-0.2 1.1-0.5l2.2-2.9c0.2-0.2 0.2-0.6 0-0.8l-2.2-2.9c-0.3-0.3-0.7-0.5-1.1-0.5H8.7c-0.4 0-0.8 0.2-1.1 0.5L5.4 4.8c-0.2 0.2-0.2 0.6 0 0.8l2.2 2.9c0.3 0.3 0.7 0.5 1.1 0.5z" />
              </svg>
            </div>
            {/* App title */}
            <span className="text-xl font-bold text-white">Solana Market Maker</span>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex space-x-8">
            <NavLink to="/" active={location.pathname === '/'}>Dashboard</NavLink>
            <NavLink to="/wallets" active={location.pathname === '/wallets'}>
              Wallets
              {activeWallets.length > 0 && (
                <span className="ml-2 bg-solana text-white text-xs px-2 py-1 rounded-full">
                  {activeWallets.length}
                </span>
              )}
            </NavLink>
            <NavLink to="/settings" active={location.pathname === '/settings'}>Settings</NavLink>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
