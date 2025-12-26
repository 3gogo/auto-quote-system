import { Outlet, useNavigate, useLocation } from 'react-router';
import { TabBar } from 'antd-mobile';
import {
  BillOutline,
  ShopbagOutline,
  UserOutline,
  PieOutline
} from 'antd-mobile-icons';
import './Layout.css';

/**
 * 底部导航项配置
 */
const tabs = [
  {
    key: '/transactions',
    title: '交易',
    icon: <BillOutline />,
  },
  {
    key: '/products',
    title: '商品',
    icon: <ShopbagOutline />,
  },
  {
    key: '/partners',
    title: '顾客',
    icon: <UserOutline />,
  },
  {
    key: '/statistics',
    title: '统计',
    icon: <PieOutline />,
  },
];

/**
 * 应用布局组件
 * 包含页面内容区域和底部导航栏
 */
function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 获取当前激活的 tab
  const activeKey = '/' + location.pathname.split('/')[1];

  const handleTabChange = (key: string) => {
    navigate(key);
  };

  return (
    <div className="layout">
      {/* 页面内容区域 */}
      <div className="layout-content">
        <Outlet />
      </div>
      
      {/* 底部导航栏 */}
      <div className="layout-tabbar">
        <TabBar activeKey={activeKey} onChange={handleTabChange}>
          {tabs.map(tab => (
            <TabBar.Item 
              key={tab.key} 
              icon={tab.icon} 
              title={tab.title} 
            />
          ))}
        </TabBar>
      </div>
    </div>
  );
}

export default Layout;

