import { Routes, Route, Navigate } from 'react-router';
import { SafeArea } from 'antd-mobile';
import Layout from './components/Layout';
import TransactionList from './pages/TransactionList';
import TransactionDetail from './pages/TransactionDetail';
import ProductList from './pages/ProductList';
import PartnerList from './pages/PartnerList';
import Statistics from './pages/Statistics';

/**
 * 小店报价助手 - 后台管理应用
 */
function App() {
  return (
    <div className="app">
      <SafeArea position="top" />
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* 默认重定向到交易记录 */}
          <Route index element={<Navigate to="/transactions" replace />} />
          
          {/* 交易记录 */}
          <Route path="transactions" element={<TransactionList />} />
          <Route path="transactions/:id" element={<TransactionDetail />} />
          
          {/* 商品管理 */}
          <Route path="products" element={<ProductList />} />
          
          {/* 顾客管理 */}
          <Route path="partners" element={<PartnerList />} />
          
          {/* 统计报表 */}
          <Route path="statistics" element={<Statistics />} />
        </Route>
      </Routes>
      <SafeArea position="bottom" />
    </div>
  );
}

export default App;

