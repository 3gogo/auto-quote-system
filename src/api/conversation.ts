/**
 * 对话管理 API
 */

import { Router, Request, Response } from 'express';
import { conversationManager } from '../services/conversation-manager';
import { ConversationInput } from '../types/conversation';

const router = Router();

/**
 * 创建新会话
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const session = conversationManager.createSession(sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        state: session.state,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({
      success: false,
      error: '创建会话失败'
    });
  }
});

/**
 * 获取会话信息
 */
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = conversationManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    return res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('获取会话失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取会话失败'
    });
  }
});

/**
 * 处理对话输入
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const input: ConversationInput = {
      sessionId: req.body.sessionId,
      text: req.body.text,
      context: req.body.context
    };

    if (!input.sessionId || !input.text) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: sessionId 和 text'
      });
    }

    const output = await conversationManager.processInput(input);

    return res.json({
      success: true,
      data: output
    });
  } catch (error) {
    console.error('处理对话失败:', error);
    return res.status(500).json({
      success: false,
      error: '处理对话失败'
    });
  }
});

/**
 * 清除会话
 */
router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const deleted = conversationManager.clearSession(sessionId);
    
    res.json({
      success: true,
      data: { deleted }
    });
  } catch (error) {
    console.error('清除会话失败:', error);
    res.status(500).json({
      success: false,
      error: '清除会话失败'
    });
  }
});

/**
 * 获取所有活跃会话
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = conversationManager.getActiveSessions();
    
    res.json({
      success: true,
      data: {
        count: sessions.length,
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          state: s.state,
          partnerName: s.currentPartner?.name,
          cartItemsCount: s.cartItems.length,
          createdAt: s.createdAt,
          lastActiveAt: s.lastActiveAt
        }))
      }
    });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取会话列表失败'
    });
  }
});

export default router;
