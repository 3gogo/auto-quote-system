/**
 * 对话管理器
 * 负责管理多轮对话状态、上下文和流程控制
 */

// 自定义 UUID 生成函数，避免类型声明问题
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import {
  SessionContext,
  ConversationInput,
  ConversationOutput,
  ConversationTurn,
  ConversationState,
  ConversationManagerConfig
} from '../types/conversation';
import { nluService } from '../nlu/nlu-service';
import { pricingService } from '../pricing/pricing-service';
import { transactionService } from './transaction-service';
import { NLUResult, ProductEntity } from '../types/nlu';
import { QuoteResponse } from '../types/pricing';

/**
 * 对话管理器
 */
export class ConversationManager {
  private config: Required<ConversationManagerConfig>;
  private sessions: Map<string, SessionContext>;
  private initialized: boolean = false;

  constructor(config: ConversationManagerConfig = {}) {
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30分钟
      maxHistorySize: 50,
      autoSaveSession: true,
      enableContextMemory: true,
      ...config
    };
    this.sessions = new Map();
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await nluService.init();
      await pricingService.init();
      await transactionService.init();
      
      this.startSessionCleanup();
      
      this.initialized = true;
      console.log('✅ 对话管理器初始化成功');
    } catch (error) {
      console.error('❌ 对话管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建新会话
   */
  createSession(sessionId?: string): SessionContext {
    const id = sessionId || uuidv4();
    const session: SessionContext = {
      sessionId: id,
      state: 'idle',
      cartItems: [],
      history: [],
      awaitingConfirmation: false,
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 处理用户输入
   */
  async processInput(input: ConversationInput): Promise<ConversationOutput> {
    if (!this.initialized) {
      await this.init();
    }

    const startTime = Date.now();

    // 获取或创建会话
    let session = this.getSession(input.sessionId);
    if (!session) {
      session = this.createSession(input.sessionId);
    }

    // 更新会话状态
    session.state = 'processing';
    session.lastActiveAt = new Date();

    try {
      // 1. NLU 解析
      const nlu = await nluService.parse(input.text, {
        sessionId: input.sessionId,
        currentPartner: session.currentPartner,
        cartItems: session.cartItems,
        lastIntent: session.lastIntent,
        ...input.context
      });

      // 2. 添加用户轮次到历史
      this.addTurn(session, {
        id: uuidv4(),
        role: 'user',
        text: input.text,
        nlu,
        timestamp: new Date()
      });

      // 3. 根据状态和意图处理
      let output: ConversationOutput;

      if (session.awaitingConfirmation) {
        // 处理确认/否定
        output = await this.handleConfirmation(session, nlu);
      } else {
        // 处理正常意图
        output = await this.handleIntent(session, nlu);
      }

      // 4. 添加助手轮次到历史
      this.addTurn(session, {
        id: uuidv4(),
        role: 'assistant',
        text: output.text,
        quote: output.quote,
        timestamp: new Date()
      });

      // 5. 更新会话状态
      session.state = output.state;
      session.lastIntent = nlu.intent.intent;
      session.lastActiveAt = new Date();

      output.processingTime = Date.now() - startTime;
      return output;

    } catch (error) {
      console.error('处理对话输入失败:', error);
      session.state = 'error';
      
      return {
        sessionId: input.sessionId,
        text: '抱歉，处理出错了，请重新说一遍。',
        state: 'error',
        needsInput: true,
        needsConfirmation: false,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 处理意图
   */
  private async handleIntent(
    session: SessionContext,
    nlu: NLUResult
  ): Promise<ConversationOutput> {
    const intent = nlu.intent.intent;

    switch (intent) {
      case 'retail_quote':
        return this.handleRetailQuote(session, nlu);

      case 'single_item_query':
        return this.handleSingleItemQuery(session, nlu);

      case 'purchase_price_check':
        return this.handlePurchasePriceCheck(session, nlu);

      case 'price_correction':
        return this.handlePriceCorrection(session, nlu);

      case 'unknown':
        return this.handleUnknown(session, nlu);

      default:
        return {
          sessionId: session.sessionId,
          text: '抱歉，我没太听懂。你是想问商品价格，还是要结账报价？',
          nlu,
          state: 'awaiting_input',
          needsInput: true,
          needsConfirmation: false,
          processingTime: 0
        };
    }
  }

  /**
   * 处理零售报价
   */
  private async handleRetailQuote(
    session: SessionContext,
    nlu: NLUResult
  ): Promise<ConversationOutput> {
    // 检查是否需要追问
    if (nluService.needsClarification(nlu)) {
      const prompt = nluService.getClarificationPrompt(nlu);
      return {
        sessionId: session.sessionId,
        text: prompt,
        nlu,
        state: 'awaiting_input',
        needsInput: true,
        needsConfirmation: false,
        processingTime: 0
      };
    }

    // 更新会话上下文
    if (nlu.partner) {
      session.currentPartner = nlu.partner;
    }

    // 添加商品到购物车
    for (const product of nlu.products) {
      this.addToCart(session, product);
    }

    // 生成报价
    const quoteResult = await pricingService.processQuote({
      text: nlu.rawText,
      sessionId: session.sessionId,
      context: {
        currentPartner: session.currentPartner,
        cartItems: session.cartItems
      }
    });

    if (quoteResult.needsClarification) {
      return {
        sessionId: session.sessionId,
        text: quoteResult.speechText,
        nlu,
        state: 'awaiting_input',
        needsInput: true,
        needsConfirmation: false,
        processingTime: 0
      };
    }

    // 保存报价
    session.currentQuote = quoteResult.quote;
    session.awaitingConfirmation = true;
    session.confirmationType = 'quote';

    return {
      sessionId: session.sessionId,
      text: quoteResult.speechText,
      speechText: quoteResult.speechText,
      nlu,
      quote: quoteResult.quote,
      state: 'awaiting_confirm',
      needsInput: false,
      needsConfirmation: true,
      suggestedActions: ['确认', '修改价格', '取消'],
      processingTime: 0
    };
  }

  /**
   * 处理单品查询
   */
  private async handleSingleItemQuery(
    session: SessionContext,
    nlu: NLUResult
  ): Promise<ConversationOutput> {
    const quoteResult = await pricingService.processQuote({
      text: nlu.rawText,
      sessionId: session.sessionId
    });

    return {
      sessionId: session.sessionId,
      text: quoteResult.speechText,
      nlu,
      quote: quoteResult.quote,
      state: 'idle',
      needsInput: false,
      needsConfirmation: false,
      processingTime: 0
    };
  }

  /**
   * 处理进货核价
   */
  private async handlePurchasePriceCheck(
    session: SessionContext,
    nlu: NLUResult
  ): Promise<ConversationOutput> {
    const quoteResult = await pricingService.processQuote({
      text: nlu.rawText,
      sessionId: session.sessionId
    });

    return {
      sessionId: session.sessionId,
      text: quoteResult.speechText,
      nlu,
      state: 'idle',
      needsInput: false,
      needsConfirmation: false,
      processingTime: 0
    };
  }

  /**
   * 处理价格纠错
   */
  private async handlePriceCorrection(
    session: SessionContext,
    nlu: NLUResult
  ): Promise<ConversationOutput> {
    if (!session.currentQuote) {
      return {
        sessionId: session.sessionId,
        text: '还没有报价呢，你想改什么价格？',
        nlu,
        state: 'idle',
        needsInput: true,
        needsConfirmation: false,
        processingTime: 0
      };
    }

    // 更新报价中的价格
    if (nlu.products.length > 0 && nlu.prices.length > 0) {
      const product = nlu.products[0];
      const price = nlu.prices[0];
      
      const item = session.currentQuote.items.find(
        i => i.productName === product.name
      );
      
      if (item) {
        item.actualUnitPrice = price.value;
        item.actualSubtotal = price.value * item.quantity;
      }
    }

    // 重新计算总价
    const totalActual = session.currentQuote.items.reduce(
      (sum, item) => sum + (item.actualSubtotal || item.suggestedSubtotal),
      0
    );
    session.currentQuote.totalActualPrice = totalActual;

    session.awaitingConfirmation = true;
    session.confirmationType = 'price_correction';

    return {
      sessionId: session.sessionId,
      text: `好的，按你说的价格算。总共${totalActual}块，对吗？`,
      nlu,
      quote: session.currentQuote,
      state: 'awaiting_confirm',
      needsInput: false,
      needsConfirmation: true,
      processingTime: 0
    };
  }

  /**
   * 处理未知意图
   */
  private async handleUnknown(
    session: SessionContext,
    nlu: NLUResult
  ): Promise<ConversationOutput> {
    const prompt = nluService.getClarificationPrompt(nlu);
    
    return {
      sessionId: session.sessionId,
      text: prompt,
      nlu,
      state: 'awaiting_input',
      needsInput: true,
      needsConfirmation: false,
      processingTime: 0
    };
  }

  /**
   * 处理确认/否定
   */
  private async handleConfirmation(
    session: SessionContext,
    nlu: NLUResult
  ): Promise<ConversationOutput> {
    const intent = nlu.intent.intent;

    if (intent === 'confirm') {
      // 确认交易
      if (session.currentQuote && session.confirmationType === 'quote') {
        // 保存交易记录
        const transactionId = await transactionService.createFromQuote(
          session.currentQuote,
          nlu.rawText,
          'retail_quote',
          session.sessionId
        );

        // 清空会话
        session.cartItems = [];
        session.currentQuote = undefined;
        session.currentPartner = undefined;
        session.awaitingConfirmation = false;
        session.confirmationType = undefined;

        return {
          sessionId: session.sessionId,
          text: transactionId 
            ? '好嘞，成交！还要别的吗？' 
            : '好嘞！还要别的吗？',
          nlu,
          state: 'completed',
          needsInput: false,
          needsConfirmation: false,
          processingTime: 0
        };
      }

      return {
        sessionId: session.sessionId,
        text: '好的！',
        nlu,
        state: 'idle',
        needsInput: false,
        needsConfirmation: false,
        processingTime: 0
      };
    }

    if (intent === 'deny') {
      // 取消当前操作
      session.awaitingConfirmation = false;
      session.confirmationType = undefined;

      return {
        sessionId: session.sessionId,
        text: '好的，重新说一遍吧。',
        nlu,
        state: 'idle',
        needsInput: true,
        needsConfirmation: false,
        processingTime: 0
      };
    }

    // 其他意图，当作新的请求处理
    session.awaitingConfirmation = false;
    session.confirmationType = undefined;
    return this.handleIntent(session, nlu);
  }

  /**
   * 添加商品到购物车
   */
  private addToCart(session: SessionContext, product: ProductEntity): void {
    const existing = session.cartItems.find(
      item => item.name.toLowerCase() === product.name.toLowerCase()
    );

    if (existing) {
      existing.quantity += product.quantity;
    } else {
      session.cartItems.push({ ...product });
    }
  }

  /**
   * 添加对话轮次
   */
  private addTurn(session: SessionContext, turn: ConversationTurn): void {
    session.history.push(turn);

    // 限制历史记录大小
    if (session.history.length > this.config.maxHistorySize) {
      session.history = session.history.slice(-this.config.maxHistorySize);
    }
  }

  /**
   * 清理会话
   */
  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): SessionContext[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 启动会话清理定时器
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = this.config.sessionTimeout;

      for (const [sessionId, session] of this.sessions.entries()) {
        const inactive = now - session.lastActiveAt.getTime();
        if (inactive > timeout) {
          console.log(`清理超时会话: ${sessionId}`);
          this.sessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000); // 每5分钟检查一次
  }
}

// 导出单例
export const conversationManager = new ConversationManager();
