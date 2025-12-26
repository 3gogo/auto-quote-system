import { useState, useEffect } from 'react';
import { 
  List, 
  SearchBar, 
  SwipeAction, 
  Tag,
  Tabs,
  Empty,
  SpinLoading,
  FloatingBubble,
  Toast
} from 'antd-mobile';
import { AddOutline, UserOutline } from 'antd-mobile-icons';
import { getPartners } from '../services/api';
import type { Partner } from '../types';
import './PartnerList.css';

/**
 * 等级标签颜色映射
 */
const levelColors: Record<string, string> = {
  normal: '#999',
  vip: '#faad14',
  wholesale: '#1677ff',
  special: '#ff4d4f',
};

const levelLabels: Record<string, string> = {
  normal: '普通',
  vip: 'VIP',
  wholesale: '批发',
  special: '特殊',
};

/**
 * 顾客管理页面
 */
function PartnerList() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // 加载顾客列表
  const loadPartners = async () => {
    try {
      setLoading(true);
      const data = await getPartners();
      setPartners(data || []);
    } catch (error) {
      console.error('加载顾客列表失败:', error);
      // 使用模拟数据
      setPartners([
        {
          id: 1,
          name: '张三',
          aliases: ['老张'],
          type: 'customer',
          level: 'vip',
          phone: '13800138001',
          note: '常客，喜欢买烟酒',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: '李四',
          aliases: ['李老板'],
          type: 'customer',
          level: 'wholesale',
          phone: '13800138002',
          note: '批发客户',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 3,
          name: '王五',
          aliases: [],
          type: 'supplier',
          level: 'normal',
          phone: '13800138003',
          note: '饮料供货商',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  // 过滤搜索和类型
  const filteredPartners = partners
    .filter(p => {
      if (activeTab !== 'all' && p.type !== activeTab) return false;
      if (keyword) {
        return (
          p.name.includes(keyword) ||
          p.aliases.some(a => a.includes(keyword)) ||
          p.phone?.includes(keyword)
        );
      }
      return true;
    });

  // 编辑顾客
  const handleEdit = (partner: Partner) => {
    Toast.show(`编辑: ${partner.name}`);
  };

  // 删除顾客
  const handleDelete = (partner: Partner) => {
    Toast.show(`删除: ${partner.name}`);
  };

  // 添加顾客
  const handleAdd = () => {
    Toast.show('添加新顾客');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <SpinLoading color="primary" />
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="partner-list-page">
      {/* 搜索栏 */}
      <div className="search-bar">
        <SearchBar
          placeholder="搜索姓名、别名或电话"
          value={keyword}
          onChange={setKeyword}
          style={{ '--background': '#f5f5f5' }}
        />
      </div>

      {/* 类型 Tab */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="顾客" key="customer" />
        <Tabs.Tab title="供货商" key="supplier" />
      </Tabs>

      {/* 统计 */}
      <div className="stats-bar">
        <span>共 {filteredPartners.length} 人</span>
      </div>

      {/* 顾客列表 */}
      {filteredPartners.length === 0 ? (
        <Empty description="暂无数据" />
      ) : (
        <List>
          {filteredPartners.map(partner => (
            <SwipeAction
              key={partner.id}
              rightActions={[
                {
                  key: 'edit',
                  text: '编辑',
                  color: 'primary',
                  onClick: () => handleEdit(partner),
                },
                {
                  key: 'delete',
                  text: '删除',
                  color: 'danger',
                  onClick: () => handleDelete(partner),
                },
              ]}
            >
              <List.Item
                prefix={
                  <div className="partner-avatar">
                    <UserOutline />
                  </div>
                }
                extra={
                  <Tag color={levelColors[partner.level] || '#999'}>
                    {levelLabels[partner.level] || partner.level}
                  </Tag>
                }
                description={
                  <div className="partner-meta">
                    {partner.phone && (
                      <span className="partner-phone">{partner.phone}</span>
                    )}
                    {partner.aliases.length > 0 && (
                      <span className="partner-aliases">
                        别名: {partner.aliases.join('、')}
                      </span>
                    )}
                  </div>
                }
              >
                <div className="partner-info">
                  <span className="partner-name">{partner.name}</span>
                  <Tag 
                    color={partner.type === 'customer' ? '#1677ff' : '#52c41a'} 
                    style={{ marginLeft: 8, fontSize: 10 }}
                  >
                    {partner.type === 'customer' ? '顾客' : 
                     partner.type === 'supplier' ? '供货商' : '两者'}
                  </Tag>
                </div>
              </List.Item>
            </SwipeAction>
          ))}
        </List>
      )}

      {/* 添加按钮 */}
      <FloatingBubble
        style={{
          '--initial-position-bottom': '80px',
          '--initial-position-right': '20px',
        }}
        onClick={handleAdd}
      >
        <AddOutline fontSize={24} />
      </FloatingBubble>
    </div>
  );
}

export default PartnerList;

