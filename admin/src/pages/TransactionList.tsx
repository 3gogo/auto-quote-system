import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { 
  List, 
  PullToRefresh, 
  InfiniteScroll, 
  SearchBar,
  Tabs,
  Tag,
  Empty,
  SpinLoading
} from 'antd-mobile';
import dayjs from 'dayjs';
import { getTransactions } from '../services/api';
import type { TransactionRecord } from '../types';
import './TransactionList.css';

/**
 * 意图类型映射
 */
const intentLabels: Record<string, { text: string; color: string }> = {
  retail_quote: { text: '零售', color: '#1677ff' },
  single_item_query: { text: '询价', color: '#52c41a' },
  purchase_price_check: { text: '进货', color: '#faad14' },
  price_correction: { text: '改价', color: '#ff4d4f' },
};

/**
 * 交易记录列表页面
 */
function TransactionList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const pageSize = 20;

  // 加载交易列表
  const loadTransactions = useCallback(async (
    pageNum: number, 
    reset: boolean = false
  ) => {
    try {
      const params: Record<string, unknown> = {
        page: pageNum,
        pageSize,
      };

      // 按意图筛选
      if (activeTab !== 'all') {
        params.intent = activeTab;
      }

      const result = await getTransactions(params);
      const newList = result.transactions || [];

      if (reset) {
        setTransactions(newList);
      } else {
        setTransactions(prev => [...prev, ...newList]);
      }

      setHasMore(newList.length >= pageSize);
      setPage(pageNum);
    } catch (error) {
      console.error('加载交易列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pageSize]);

  // 初始加载
  useEffect(() => {
    setLoading(true);
    setTransactions([]);
    loadTransactions(1, true);
  }, [loadTransactions]);

  // 下拉刷新
  const handleRefresh = async () => {
    await loadTransactions(1, true);
  };

  // 加载更多
  const loadMore = async () => {
    await loadTransactions(page + 1, false);
  };

  // 切换 Tab
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 点击交易项
  const handleItemClick = (id: number) => {
    navigate(`/transactions/${id}`);
  };

  // 过滤搜索结果
  const filteredTransactions = keyword
    ? transactions.filter(t => 
        t.rawText.includes(keyword) ||
        t.partnerName?.includes(keyword) ||
        t.items.some(item => item.productName.includes(keyword))
      )
    : transactions;

  // 按日期分组
  const groupByDate = (list: TransactionRecord[]) => {
    const groups: Record<string, TransactionRecord[]> = {};
    list.forEach(item => {
      const date = dayjs(item.timestamp).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    return groups;
  };

  const groupedTransactions = groupByDate(filteredTransactions);

  // 格式化日期标题
  const formatDateTitle = (dateStr: string) => {
    const date = dayjs(dateStr);
    const today = dayjs().startOf('day');
    const diff = today.diff(date.startOf('day'), 'day');

    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    return date.format('MM月DD日');
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
    <div className="transaction-list-page">
      {/* 搜索栏 */}
      <div className="search-bar">
        <SearchBar
          placeholder="搜索商品、顾客或原话"
          value={keyword}
          onChange={setKeyword}
          style={{ '--background': '#f5f5f5' }}
        />
      </div>

      {/* 筛选 Tab */}
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <Tabs.Tab title="全部" key="all" />
        <Tabs.Tab title="零售" key="retail_quote" />
        <Tabs.Tab title="询价" key="single_item_query" />
        <Tabs.Tab title="进货" key="purchase_price_check" />
      </Tabs>

      {/* 交易列表 */}
      <PullToRefresh onRefresh={handleRefresh}>
        {filteredTransactions.length === 0 ? (
          <Empty description="暂无交易记录" />
        ) : (
          <div className="transaction-groups">
            {Object.entries(groupedTransactions).map(([date, items]) => (
              <div key={date} className="transaction-group">
                <div className="group-header">
                  <span className="group-date">{formatDateTitle(date)}</span>
                  <span className="group-count">{items.length} 笔</span>
                </div>
                <List>
                  {items.map(item => (
                    <List.Item
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      arrow
                      extra={
                        <span className="amount">{item.totalPrice.toFixed(1)}</span>
                      }
                      description={
                        <div className="item-description">
                          <span className="item-time">
                            {dayjs(item.timestamp).format('HH:mm')}
                          </span>
                          {item.partnerName && (
                            <span className="item-partner">{item.partnerName}</span>
                          )}
                        </div>
                      }
                    >
                      <div className="item-content">
                        <Tag 
                          color={intentLabels[item.intent]?.color || '#999'}
                          style={{ marginRight: 8 }}
                        >
                          {intentLabels[item.intent]?.text || '其他'}
                        </Tag>
                        <span className="item-summary">
                          {item.items.map(i => i.productName).join('、')}
                        </span>
                      </div>
                    </List.Item>
                  ))}
                </List>
              </div>
            ))}
          </div>
        )}
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  );
}

export default TransactionList;

