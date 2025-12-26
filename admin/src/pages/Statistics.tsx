import { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs,
  List,
  ProgressBar,
  SpinLoading,
  DatePicker,
  Button
} from 'antd-mobile';
import dayjs from 'dayjs';
import { 
  getTransactionStats, 
  getProductSalesStats, 
  getPartnerPurchaseStats 
} from '../services/api';
import type { 
  TransactionStats, 
  ProductSalesStats, 
  PartnerPurchaseStats 
} from '../types';
import './Statistics.css';

/**
 * 统计报表页面
 */
function Statistics() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [productStats, setProductStats] = useState<ProductSalesStats[]>([]);
  const [partnerStats, setPartnerStats] = useState<PartnerPurchaseStats[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 加载统计数据
  const loadStats = async () => {
    try {
      setLoading(true);
      const [statsData, productData, partnerData] = await Promise.all([
        getTransactionStats({ 
          startDate: dateRange.start, 
          endDate: dateRange.end 
        }),
        getProductSalesStats({ 
          startDate: dateRange.start, 
          endDate: dateRange.end 
        }),
        getPartnerPurchaseStats({ 
          startDate: dateRange.start, 
          endDate: dateRange.end 
        }),
      ]);
      setStats(statsData);
      setProductStats(productData || []);
      setPartnerStats(partnerData || []);
    } catch (error) {
      console.error('加载统计数据失败:', error);
      // 使用模拟数据
      setStats({
        totalCount: 128,
        totalRevenue: 12580.5,
        totalCost: 8960.3,
        totalProfit: 3620.2,
        avgProfitMargin: 28.8,
        avgOrderValue: 98.3,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
        },
      });
      setProductStats([
        { productName: '中华香烟', salesCount: 45, totalQuantity: 89, totalRevenue: 4450, avgUnitPrice: 50 },
        { productName: '农夫山泉', salesCount: 120, totalQuantity: 360, totalRevenue: 720, avgUnitPrice: 2 },
        { productName: '康师傅方便面', salesCount: 78, totalQuantity: 156, totalRevenue: 624, avgUnitPrice: 4 },
        { productName: '雪碧', salesCount: 65, totalQuantity: 130, totalRevenue: 390, avgUnitPrice: 3 },
        { productName: '红牛', salesCount: 42, totalQuantity: 84, totalRevenue: 504, avgUnitPrice: 6 },
      ]);
      setPartnerStats([
        { partnerId: 1, partnerName: '张三', purchaseCount: 28, totalSpent: 2800, avgOrderValue: 100, lastPurchaseDate: dayjs().toISOString() },
        { partnerId: 2, partnerName: '李四', purchaseCount: 15, totalSpent: 3500, avgOrderValue: 233.3, lastPurchaseDate: dayjs().subtract(1, 'day').toISOString() },
        { partnerId: 3, partnerName: '王五', purchaseCount: 12, totalSpent: 1200, avgOrderValue: 100, lastPurchaseDate: dayjs().subtract(2, 'day').toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  // 获取最大销售额用于计算进度条
  const maxRevenue = productStats.length > 0 
    ? Math.max(...productStats.map(p => p.totalRevenue))
    : 1;
  
  const maxSpent = partnerStats.length > 0
    ? Math.max(...partnerStats.map(p => p.totalSpent))
    : 1;

  if (loading) {
    return (
      <div className="loading-container">
        <SpinLoading color="primary" />
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="statistics-page">
      {/* 日期选择 */}
      <div className="date-selector">
        <Button 
          size="small" 
          onClick={() => setShowDatePicker(true)}
        >
          {dateRange.start} 至 {dateRange.end}
        </Button>
        <div className="quick-dates">
          <Button 
            size="mini" 
            fill="none"
            onClick={() => setDateRange({
              start: dayjs().format('YYYY-MM-DD'),
              end: dayjs().format('YYYY-MM-DD'),
            })}
          >
            今天
          </Button>
          <Button 
            size="mini" 
            fill="none"
            onClick={() => setDateRange({
              start: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
              end: dayjs().format('YYYY-MM-DD'),
            })}
          >
            近7天
          </Button>
          <Button 
            size="mini" 
            fill="none"
            onClick={() => setDateRange({
              start: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
              end: dayjs().format('YYYY-MM-DD'),
            })}
          >
            近30天
          </Button>
        </div>
      </div>

      {/* Tab 切换 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.Tab title="概览" key="overview" />
        <Tabs.Tab title="商品排行" key="products" />
        <Tabs.Tab title="顾客排行" key="partners" />
      </Tabs>

      {/* 概览 */}
      {activeTab === 'overview' && stats && (
        <div className="overview-content">
          {/* 核心指标 */}
          <Card className="stats-card main-stats">
            <div className="stat-item highlight">
              <span className="stat-label">总销售额</span>
              <span className="stat-value revenue">
                ¥{stats.totalRevenue.toFixed(2)}
              </span>
            </div>
          </Card>

          <div className="stats-grid">
            <Card className="stats-card">
              <div className="stat-item">
                <span className="stat-label">交易笔数</span>
                <span className="stat-value">{stats.totalCount}</span>
              </div>
            </Card>
            <Card className="stats-card">
              <div className="stat-item">
                <span className="stat-label">平均客单价</span>
                <span className="stat-value">¥{stats.avgOrderValue.toFixed(1)}</span>
              </div>
            </Card>
          </div>

          <div className="stats-grid">
            <Card className="stats-card">
              <div className="stat-item">
                <span className="stat-label">总成本</span>
                <span className="stat-value">¥{stats.totalCost.toFixed(2)}</span>
              </div>
            </Card>
            <Card className="stats-card">
              <div className="stat-item">
                <span className="stat-label">总毛利</span>
                <span className="stat-value profit">¥{stats.totalProfit.toFixed(2)}</span>
              </div>
            </Card>
          </div>

          <Card className="stats-card">
            <div className="profit-rate">
              <span className="stat-label">平均毛利率</span>
              <span className="rate-value">{stats.avgProfitMargin.toFixed(1)}%</span>
            </div>
            <ProgressBar 
              percent={stats.avgProfitMargin} 
              style={{ 
                '--fill-color': stats.avgProfitMargin > 25 ? '#52c41a' : '#faad14',
                marginTop: 8
              }} 
            />
          </Card>
        </div>
      )}

      {/* 商品排行 */}
      {activeTab === 'products' && (
        <div className="ranking-content">
          <List header="销售额排行">
            {productStats.slice(0, 10).map((product, index) => (
              <List.Item
                key={product.productName}
                prefix={
                  <span className={`rank-badge ${index < 3 ? 'top' : ''}`}>
                    {index + 1}
                  </span>
                }
                extra={
                  <span className="rank-amount">¥{product.totalRevenue.toFixed(0)}</span>
                }
                description={
                  <div className="rank-progress">
                    <ProgressBar 
                      percent={(product.totalRevenue / maxRevenue) * 100}
                      style={{ '--fill-color': '#1677ff' }}
                    />
                    <span className="rank-meta">
                      {product.salesCount}笔 · 均价¥{product.avgUnitPrice.toFixed(1)}
                    </span>
                  </div>
                }
              >
                {product.productName}
              </List.Item>
            ))}
          </List>
        </div>
      )}

      {/* 顾客排行 */}
      {activeTab === 'partners' && (
        <div className="ranking-content">
          <List header="消费额排行">
            {partnerStats.slice(0, 10).map((partner, index) => (
              <List.Item
                key={partner.partnerId}
                prefix={
                  <span className={`rank-badge ${index < 3 ? 'top' : ''}`}>
                    {index + 1}
                  </span>
                }
                extra={
                  <span className="rank-amount">¥{partner.totalSpent.toFixed(0)}</span>
                }
                description={
                  <div className="rank-progress">
                    <ProgressBar 
                      percent={(partner.totalSpent / maxSpent) * 100}
                      style={{ '--fill-color': '#52c41a' }}
                    />
                    <span className="rank-meta">
                      {partner.purchaseCount}次 · 均价¥{partner.avgOrderValue.toFixed(1)}
                    </span>
                  </div>
                }
              >
                {partner.partnerName}
              </List.Item>
            ))}
          </List>
        </div>
      )}

      {/* 日期选择器 */}
      <DatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(val) => {
          setDateRange({
            ...dateRange,
            start: dayjs(val).format('YYYY-MM-DD'),
          });
          setShowDatePicker(false);
        }}
        defaultValue={new Date(dateRange.start)}
      />
    </div>
  );
}

export default Statistics;

