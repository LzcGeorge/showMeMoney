// 股票基本信息类型
export interface StockInfo {
  code: string;
  name: string;
  industry?: string;
  price?: number;
  changePercent?: number;
  marketCap?: number;
}

// 股东信息类型
export interface ShareholderInfo {
  name: string;
  shareCount: number;
  sharePercent: number;
  shareChange: number;
  shareChangePercent: number;
  date: string;
}

// 股东变动类型
export interface ShareholderChange {
  period: string;
  totalHolders: number;
  changePercent: number;
}

// 股价历史数据
export interface StockHistoryData {
  date: string;
  price: number;
  volume: number;
}

// API响应类型
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 价格历史记录
export interface PriceHistoryRecord {
  date: string;
  price: number;
  profit: number;
  remark: string;
}



// 投资记录类型
export interface InvestRecord {
  id: number;
  stockName: string;
  stockCode?: string; // 添加股票代码字段（可选）
  buyPrice: number;
  shares: number;
  stopLossPrice: number;
  currentPrice: number;
  buyDate: string;
  remark: string;
  strategy?: InvestStrategy; // 投资策略
  maxLoss: number;
  lossPercentage: number;
  currentProfit: number;
  priceHistory: PriceHistoryRecord[];
  buyRecordId?: string; // 关联的买入资金记录ID
}

// 清仓记录类型
export interface ClosedPosition {
  id: number;
  stockName: string;
  stockCode?: string; // 添加股票代码字段（可选）
  buyPrice: number;
  shares: number;
  buyDate: string;
  closedPrice: number;
  closedAt: string;
  finalProfit: number;
  remark: string;
  strategy?: InvestStrategy; // 投资策略
}

// 资金记录类型
export interface CapitalRecord {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdraw' | 'buy' | 'sell' | 'profit'; // 'deposit' 入金，'withdraw' 出金，'buy' 买入，'sell' 卖出，'profit' 净利润
  timestamp?: number; // 添加可选的timestamp字段
  remark?: string; // 添加可选的备注字段
  stockName?: string; // 关联的股票名称
  stockCode?: string; // 关联的股票代码
  relatedBuyId?: string; // 关联的买入记录ID（用于卖出时找到对应的买入记录）
}

// 投资统计类型
export interface InvestStats {
  totalInvestment: number;
  totalMaxLoss: number;
  averageLossPercentage: number;
  currentProfitPercentage: number;
  totalProfit: number;
  recordCount: number;
  investmentRatio: number;
}

// 清仓统计类型
export interface ClosedStats {
  closedTotal: number;
  profitCount: number;
  lossCount: number;
  winRate: number;
  totalProfitLoss: number;
  avgProfitLoss: number;
  avgProfitLossPercentage: number;
  avgHoldingDays: number;
}

// 导入结果
export interface ImportResult {
  success: boolean;
  message: string;
}

// 每日复盘记录类型
export interface DailyReview {
  id: string;
  date: string;
  marketOverview: string; // 市场概况
  positionReview: string; // 持仓回顾
  tradeAnalysis: string; // 交易分析
  emotionState: 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible'; // 情绪状态
  lessons: string; // 经验教训
  nextPlan: string; // 明日计划
  totalProfit: number; // 当日总盈亏
  tags: string[]; // 标签
  createdAt: string;
  updatedAt: string;
}

// 复盘统计类型
export interface ReviewStats {
  totalReviews: number;
  avgDailyProfit: number;
  bestDay: DailyReview | null;
  worstDay: DailyReview | null;
  emotionDistribution: Record<string, number>;
  profitableDays: number;
  lossDays: number;
}

// 期货持仓记录类型
export interface FuturesRecord {
  id: number;
  contractName: string; // 合约名称（如：沪深300指数期货）
  contractCode: string; // 合约代码（如：IF2024）
  direction: 'long' | 'short'; // 做多/做空方向
  openPrice: number; // 开仓价格
  lots: number; // 手数
  multiplier: number; // 合约乘数
  margin: number; // 保证金金额
  marginRate: number; // 保证金率（%）
  currentPrice: number; // 当前价格
  stopLossPrice: number; // 止损价格
  openDate: string; // 开仓日期
  remark: string; // 备注
  strategy?: InvestStrategy; // 投资策略
  maxLoss: number; // 最大亏损
  lossPercentage: number; // 亏损比例
  currentProfit: number; // 当前盈亏
  priceHistory: PriceHistoryRecord[]; // 价格历史
  buyRecordId?: string; // 关联的资金记录ID
}

// 期货清仓记录类型
export interface ClosedFuturesPosition {
  id: number;
  contractName: string;
  contractCode: string;
  direction: 'long' | 'short';
  openPrice: number;
  lots: number;
  multiplier: number;
  margin: number;
  openDate: string;
  closedPrice: number;
  closedAt: string;
  finalProfit: number;
  remark: string;
  strategy?: InvestStrategy; // 投资策略
}


// 投资策略类型
export type InvestStrategy = 'trend' | 'growth' |'momentum' | 'other' ;

// 策略标签映射
export const STRATEGY_LABELS: Record<InvestStrategy, string> = {
  trend: '趋势回调',
  momentum: 'RVC001',
  growth: 'RVC010',
  other: '观察',
  // value: '价值',
  // momentum: '动量',
  // reversal: '反转',
  // arbitrage: '套利',
};

// 策略选项
export const STRATEGY_OPTIONS: { value: InvestStrategy; label: string }[] = [
  { value: 'trend', label: '趋势回调' },
  { value: 'momentum', label: 'RVC001' },
  { value: 'growth', label: 'RVC010' },
  { value: 'other', label: '观察' },

  // { value: 'value', label: '价值' },
  // { value: 'reversal', label: '反转' },
  // { value: 'arbitrage', label: '套利' },
  // { value: 'other', label: '其他' }
]; 