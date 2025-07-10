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
  buyPrice: number;
  shares: number;
  stopLossPrice: number;
  currentPrice: number;
  buyDate: string;
  remark: string;
  maxLoss: number;
  lossPercentage: number;
  currentProfit: number;
  priceHistory: PriceHistoryRecord[];
}

// 清仓记录类型
export interface ClosedPosition {
  id: number;
  stockName: string;
  buyPrice: number;
  shares: number;
  buyDate: string;
  closedPrice: number;
  closedAt: string;
  finalProfit: number;
  remark: string;
}

// 资金记录类型
export interface CapitalRecord {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdraw' | 'buy' | 'sell'; // 'deposit' 入金，'withdraw' 出金，'buy' 买入，'sell' 卖出
  timestamp?: number; // 添加可选的timestamp字段
  remark?: string; // 添加可选的备注字段
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