import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Wallets from './pages/Wallets';
import NavbarSimple from './components/NavbarSimple';
import { useWallet } from './contexts/WalletContext';

function App() {
  const { initializeConnection } = useWallet();

  useEffect(() => {
    if (initializeConnection) {
      initializeConnection();
    }
  }, [initializeConnection]);

  return (
    <div className="min-h-screen flex flex-col">
      <NavbarSimple />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <footer className="bg-gray-900 py-4 text-center text-gray-400">
        <p>Solana Market Maker &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
