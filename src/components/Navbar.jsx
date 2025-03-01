
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

function Navbar() {
  const location = useLocation();
  const { activeWallets } = useWallet();
  
  return (
    <nav className="bg-gray-900 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-