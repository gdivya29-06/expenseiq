import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import AddExpense from './pages/AddExpense';
import Budgets from './pages/Budgets';
import Import from './pages/Import';
import Reports from './pages/Reports';
import Vendors from './pages/Vendors';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expenses/add" element={<AddExpense />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="import" element={<Import />} />
        <Route path="reports" element={<Reports />} />
        <Route path="vendors" element={<Vendors />} />
      </Route>
    </Routes>
  );
}