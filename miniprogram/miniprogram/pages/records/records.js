/**
 * 交易记录页面
 * 使用共享业务逻辑模块
 */
const api = require('../../utils/shared-api');
const util = require('../../utils/shared-util');

Page({
  data: {
    // 记录列表
    records: [],
    
    // 分页
    page: 1,
    pageSize: 20,
    hasMore: true,
    
    // 加载状态
    loading: false,
    refreshing: false,
    
    // 筛选
    dateRange: 'today', // today, week, month, all
    dateOptions: [
      { value: 'today', label: '今天' },
      { value: 'week', label: '本周' },
      { value: 'month', label: '本月' },
      { value: 'all', label: '全部' }
    ],
    
    // 统计
    summary: {
      totalCount: 0,
      totalAmount: 0
    }
  },

  onLoad() {
    this.loadRecords(true);
  },

  onShow() {
    // 每次显示时刷新
    this.loadRecords(true);
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadRecords(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadRecords(false);
    }
  },

  /**
   * 加载记录
   */
  async loadRecords(refresh = false) {
    if (this.data.loading) return;
    
    if (refresh) {
      this.setData({ 
        page: 1, 
        hasMore: true,
        refreshing: true 
      });
    }
    
    this.setData({ loading: true });

    try {
      const { startDate, endDate } = this.getDateRange();
      
      const result = await api.getTransactionList({
        page: this.data.page,
        pageSize: this.data.pageSize,
        startDate,
        endDate
      });

      const records = result.records || result.data || [];
      const total = result.total || records.length;
      
      // 处理记录数据
      const processedRecords = records.map(record => ({
        ...record,
        formattedDate: util.formatRelativeTime(record.createdAt),
        formattedAmount: util.formatAmount(record.totalAmount)
      }));

      if (refresh) {
        this.setData({
          records: processedRecords,
          summary: {
            totalCount: total,
            totalAmount: result.totalAmount || 0
          }
        });
      } else {
        this.setData({
          records: [...this.data.records, ...processedRecords]
        });
      }

      // 判断是否还有更多
      const hasMore = this.data.records.length < total;
      this.setData({
        page: this.data.page + 1,
        hasMore
      });

    } catch (err) {
      console.error('加载记录失败', err);
      util.showError('加载失败');
    } finally {
      this.setData({ 
        loading: false,
        refreshing: false 
      });
    }
  },

  /**
   * 获取日期范围
   */
  getDateRange() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate, endDate;
    
    switch (this.data.dateRange) {
      case 'today':
        startDate = util.formatDate(today);
        endDate = util.formatDate(today);
        break;
        
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        startDate = util.formatDate(weekStart);
        endDate = util.formatDate(today);
        break;
        
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = util.formatDate(monthStart);
        endDate = util.formatDate(today);
        break;
        
      case 'all':
      default:
        startDate = null;
        endDate = null;
    }
    
    return { startDate, endDate };
  },

  /**
   * 切换日期范围
   */
  onDateRangeChange(e) {
    const value = e.currentTarget.dataset.value;
    if (value !== this.data.dateRange) {
      this.setData({ dateRange: value });
      this.loadRecords(true);
    }
  },

  /**
   * 查看详情
   */
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?id=${id}`
    });
  },

  /**
   * 导出记录
   */
  exportRecords() {
    wx.showModal({
      title: '导出记录',
      content: '将生成当前筛选范围内的交易记录报表',
      confirmText: '导出',
      success: (res) => {
        if (res.confirm) {
          util.showSuccess('功能开发中');
        }
      }
    });
  }
});
