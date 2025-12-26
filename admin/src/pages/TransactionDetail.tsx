import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  NavBar, 
  Card, 
  List, 
  Tag,
  SpinLoading,
  Result
} from 'antd-mobile';
import dayjs from 'dayjs';
import { getTransactionById } from '../services/api';
import type { TransactionRecord } from '../types';
import './TransactionDetail.css';

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
 * 交易详情页面
 */
function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransaction = async () => {
      if (!id) {
        setError('无效的交易ID');
        setLoading(false);
        return;
      }

      try {
        const data = await getTransactionById(parseInt(id));
        setTransaction(data);
      } catch (err) {
        console.error('加载交易详情失败:', err);
        setError('加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="detail-loading">
        <SpinLoading color="primary" />
        <span>加载中...</span>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="detail-page">
        <NavBar onBack={handleBack}>交易详情</NavBar>
        <Result
          status="error"
          title="加载失败"
          description={error || '交易记录不存在'}
        />
      </div>
    );
  }

  return (
    <div className="detail-page">
      <NavBar onBack={handleBack}>交易详情</NavBar>
      
      {/* 金额概览 */}
      <Card className="amount-card">
        <div className="amount-header">
          <Tag color={intentLabels[transaction.intent]?.color || '#999'}>
            {intentLabels[transaction.intent]?.text || '其他'}
          </Tag>
          <span className="detail-time">
            {dayjs(transaction.timestamp).format('YYYY-MM-DD HH:mm')}
          </span>
        </div>
        <div className="total-amount">
          <span className="currency">¥</span>
          <span className="value">{transaction.totalPrice.toFixed(2)}</span>
        </div>
        {transaction.partnerName && (
          <div className="partner-info">
            顾客：{transaction.partnerName}
          </div>
        )}
      </Card>

      {/* 商品明细 */}
      <div className="section-title">商品明细</div>
      <Card className="items-card">
        <List>
          {transaction.items.map((item, index) => (
            <List.Item
              key={index}
              extra={
                <span className="item-subtotal">¥{item.subtotal.toFixed(1)}</span>
              }
              description={`单价 ¥${item.unitPrice.toFixed(1)}/${item.unit}`}
            >
              <div className="item-row">
                <span className="item-name">{item.productName}</span>
                <span className="item-qty">×{item.quantity}</span>
              </div>
            </List.Item>
          ))}
        </List>
      </Card>

      {/* 利润信息 */}
      {(transaction.grossProfit !== undefined || transaction.profitMargin !== undefined) && (
        <>
          <div className="section-title">利润分析</div>
          <Card className="profit-card">
            <div className="profit-grid">
              {transaction.totalCost !== undefined && (
                <div className="profit-item">
                  <span className="profit-label">成本</span>
                  <span className="profit-value">¥{transaction.totalCost.toFixed(2)}</span>
                </div>
              )}
              {transaction.grossProfit !== undefined && (
                <div className="profit-item">
                  <span className="profit-label">毛利</span>
                  <span className="profit-value success">
                    ¥{transaction.grossProfit.toFixed(2)}
                  </span>
                </div>
              )}
              {transaction.profitMargin !== undefined && (
                <div className="profit-item">
                  <span className="profit-label">毛利率</span>
                  <span className="profit-value success">
                    {transaction.profitMargin.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* 原始语音 */}
      <div className="section-title">原始语音</div>
      <Card className="raw-text-card">
        <p className="raw-text">"{transaction.rawText}"</p>
      </Card>
    </div>
  );
}

export default TransactionDetail;

