/**
 * 交易记录 API
 */

import { Router, Request, Response } from 'express';
import { transactionService } from '../services/transaction-service';
import { CreateTransactionRequest, TransactionQuery } from '../types/transaction';

const router = Router();

/**
 * 创建交易记录
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: CreateTransactionRequest = req.body;

    if (!request.items || request.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少商品列表'
      });
    }

    if (!request.totalPrice) {
      return res.status(400).json({
        success: false,
        error: '缺少总价'
      });
    }

    const transactionId = await transactionService.createTransaction(request);

    if (!transactionId) {
      return res.status(500).json({
        success: false,
        error: '创建交易记录失败'
      });
    }

    return res.json({
      success: true,
      data: { transactionId }
    });
  } catch (error) {
    console.error('创建交易记录失败:', error);
    return res.status(500).json({
      success: false,
      error: '创建交易记录失败'
    });
  }
});

/**
 * 查询交易记录
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query: TransactionQuery = {
      partnerId: req.query.partnerId ? parseInt(req.query.partnerId as string) : undefined,
      productId: req.query.productId ? parseInt(req.query.productId as string) : undefined,
      intent: req.query.intent as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20
    };

    const transactions = await transactionService.queryTransactions(query);

    return res.json({
      success: true,
      data: {
        transactions,
        page: query.page,
        pageSize: query.pageSize
      }
    });
  } catch (error) {
    console.error('查询交易记录失败:', error);
    return res.status(500).json({
      success: false,
      error: '查询交易记录失败'
    });
  }
});

/**
 * 获取单个交易记录
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: '无效的交易 ID'
      });
    }

    const transaction = await transactionService.getTransactionById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: '交易记录不存在'
      });
    }

    return res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('获取交易记录失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取交易记录失败'
    });
  }
});

/**
 * 获取交易统计
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const query: TransactionQuery = {
      partnerId: req.query.partnerId ? parseInt(req.query.partnerId as string) : undefined,
      intent: req.query.intent as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const stats = await transactionService.getStats(query);

    if (!stats) {
      return res.status(500).json({
        success: false,
        error: '获取统计数据失败'
      });
    }

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取交易统计失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取交易统计失败'
    });
  }
});

/**
 * 获取商品销售统计
 */
router.get('/stats/products', async (req: Request, res: Response) => {
  try {
    const query: TransactionQuery = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const stats = await transactionService.getProductSalesStats(query);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取商品销售统计失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取商品销售统计失败'
    });
  }
});

/**
 * 获取顾客消费统计
 */
router.get('/stats/partners', async (req: Request, res: Response) => {
  try {
    const query: TransactionQuery = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const stats = await transactionService.getPartnerPurchaseStats(query);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取顾客消费统计失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取顾客消费统计失败'
    });
  }
});

export default router;
