import { useState, useEffect } from 'react';
import { 
  List, 
  SearchBar, 
  SwipeAction, 
  Tag,
  Empty,
  SpinLoading,
  FloatingBubble,
  Toast
} from 'antd-mobile';
import { AddOutline } from 'antd-mobile-icons';
import { getProducts } from '../services/api';
import type { Product } from '../types';
import './ProductList.css';

/**
 * 商品管理页面
 */
function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  // 加载商品列表
  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data || []);
    } catch (error) {
      console.error('加载商品列表失败:', error);
      // 使用模拟数据
      setProducts([
        {
          id: 1,
          name: '农夫山泉',
          category: '饮料',
          aliases: ['农夫', '矿泉水'],
          unit: '瓶',
          baseCost: 1.2,
          defaultPrice: 2,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: '康师傅方便面',
          category: '食品',
          aliases: ['方便面', '泡面'],
          unit: '包',
          baseCost: 2.5,
          defaultPrice: 4,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 3,
          name: '中华香烟',
          category: '烟酒',
          aliases: ['中华', '软中华'],
          unit: '包',
          baseCost: 45,
          defaultPrice: 50,
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
    loadProducts();
  }, []);

  // 过滤搜索
  const filteredProducts = keyword
    ? products.filter(p => 
        p.name.includes(keyword) ||
        p.aliases.some(a => a.includes(keyword)) ||
        p.category?.includes(keyword)
      )
    : products;

  // 编辑商品
  const handleEdit = (product: Product) => {
    Toast.show(`编辑: ${product.name}`);
  };

  // 删除商品
  const handleDelete = (product: Product) => {
    Toast.show(`删除: ${product.name}`);
  };

  // 添加商品
  const handleAdd = () => {
    Toast.show('添加新商品');
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
    <div className="product-list-page">
      {/* 搜索栏 */}
      <div className="search-bar">
        <SearchBar
          placeholder="搜索商品名称或别名"
          value={keyword}
          onChange={setKeyword}
          style={{ '--background': '#f5f5f5' }}
        />
      </div>

      {/* 商品统计 */}
      <div className="stats-bar">
        <span>共 {filteredProducts.length} 个商品</span>
      </div>

      {/* 商品列表 */}
      {filteredProducts.length === 0 ? (
        <Empty description="暂无商品" />
      ) : (
        <List>
          {filteredProducts.map(product => (
            <SwipeAction
              key={product.id}
              rightActions={[
                {
                  key: 'edit',
                  text: '编辑',
                  color: 'primary',
                  onClick: () => handleEdit(product),
                },
                {
                  key: 'delete',
                  text: '删除',
                  color: 'danger',
                  onClick: () => handleDelete(product),
                },
              ]}
            >
              <List.Item
                title={product.name}
                extra={
                  <div className="product-price">
                    <span className="price">¥{product.defaultPrice?.toFixed(1) || '-'}</span>
                    <span className="unit">/{product.unit}</span>
                  </div>
                }
                description={
                  <div className="product-meta">
                    {product.category && (
                      <Tag color="default" style={{ marginRight: 4 }}>
                        {product.category}
                      </Tag>
                    )}
                    {product.aliases.length > 0 && (
                      <span className="aliases">
                        别名: {product.aliases.join('、')}
                      </span>
                    )}
                  </div>
                }
              >
                <div className="product-info">
                  <span className="product-name">{product.name}</span>
                  {!product.isActive && (
                    <Tag color="default" style={{ marginLeft: 8 }}>已停用</Tag>
                  )}
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

export default ProductList;

