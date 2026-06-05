import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import AddExpense from './pages/AddExpense';
import Transactions from './pages/Transactions';
import FriendLedger from './pages/FriendLedger';
import FriendDetail from './pages/FriendDetail';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-md mx-auto min-h-screen relative bg-[#F8F7F2]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<AddExpense />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/friends" element={<FriendLedger />} />
          <Route path="/friends/:name" element={<FriendDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
