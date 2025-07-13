import type { InvestRecord, ClosedPosition, CapitalRecord, InvestStats, ImportResult, DailyReview, ReviewStats, FuturesRecord, ClosedFuturesPosition, InvestStrategy } from '../types';

// 格式化货币
export const formatCurrency = (amount: number): string => {
  return `${amount.toFixed(2)}元`;
};

// 格式化百分比
export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(2)}%`;
};

// 其他工具函数

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// 本地存储键名
const STORAGE_KEYS = {
  CURRENT_POSITIONS: 'stockLossHistory',
  CLOSED_POSITIONS: 'closedPositions',
  INITIAL_CAPITAL: 'initialCapital',
  FUTURES_POSITIONS: 'futuresPositions',
  CLOSED_FUTURES: 'closedFutures'
};

// 获取当前持仓列表
export const getCurrentPositions = (): InvestRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_POSITIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取当前持仓数据失败:', error);
    return [];
  }
};

// 获取已清仓记录
export const getClosedPositions = (): ClosedPosition[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLOSED_POSITIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取清仓记录失败:', error);
    return [];
  }
};

// 获取初始资金
export const getInitialCapital = (): number => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INITIAL_CAPITAL);
    return data ? parseFloat(data) : 0;
  } catch (error) {
    console.error('获取初始资金失败:', error);
    return 0;
  }
};

// 保存当前持仓列表
const saveCurrentPositions = (positions: InvestRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_POSITIONS, JSON.stringify(positions));
  } catch (error) {
    console.error('保存当前持仓数据失败:', error);
  }
};

// 保存已清仓记录
const saveClosedPositions = (positions: ClosedPosition[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CLOSED_POSITIONS, JSON.stringify(positions));
  } catch (error) {
    console.error('保存清仓记录失败:', error);
  }
};

// 保存初始资金
export const saveInitialCapital = (amount: number): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.INITIAL_CAPITAL, amount.toString());
  } catch (error) {
    console.error('保存初始资金失败:', error);
  }
};

// 添加新持仓
export const addNewPosition = (
  stockName: string,
  stockCode: string = '',
  buyPrice: number,
  shares: number,
  stopLossPrice: number,
  currentPrice: number,
  buyDate: string = '',
  remark: string = '',
  strategy: string = ''
): InvestRecord => {
  // 计算最大亏损
  const totalInvestment = buyPrice * shares;
  const valueAtStopLoss = stopLossPrice * shares;
  const maxLoss = totalInvestment - valueAtStopLoss;
  const lossPercentage = (maxLoss / totalInvestment) * 100;
  
  // 计算当前盈亏
  const profit = (currentPrice - buyPrice) * shares;
  
  // 创建新记录
  const now = new Date();
  const id = now.getTime();
  const today = now.toISOString().split('T')[0];
  const actualBuyDate = buyDate || today;
  
  const newRecord: InvestRecord = {
    id,
    stockName,
    stockCode: stockCode || undefined,
    buyPrice,
    shares,
    stopLossPrice,
    currentPrice,
    maxLoss,
    lossPercentage,
    currentProfit: profit,
    buyDate: actualBuyDate,
    remark,
    strategy: strategy as InvestStrategy || undefined,
    priceHistory: [
      {
        date: today,
        price: currentPrice,
        profit,
        remark: '初始价格'
      }
    ]
  };
  
  // 添加资金记录 - 买入股票支出（记录但不影响资金曲线）
  try {
    const capitalRecords = getCapitalRecords();
    const buyRecordId = generateId();
    const newCapitalRecord: CapitalRecord = {
      id: buyRecordId,
      date: actualBuyDate,
      amount: totalInvestment,
      type: 'buy',
      timestamp: now.getTime(),
      remark: `买入 ${stockName} : ${shares}股 × ${buyPrice}元`,
      stockName: stockName,
      stockCode: stockCode || undefined
    };
    
    // 将买入记录ID存储到持仓记录中，方便后续卖出时查找
    newRecord.buyRecordId = buyRecordId;
    
    capitalRecords.push(newCapitalRecord);
    // 按日期排序
    capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
  } catch (error) {
    console.error('添加买入资金记录失败:', error);
  }
  
  // 添加到列表
  const positions = getCurrentPositions();
  positions.push(newRecord);
  saveCurrentPositions(positions);
  
  return newRecord;
};

// 更新持仓
export const updatePosition = (record: InvestRecord): void => {
  const positions = getCurrentPositions();
  const index = positions.findIndex(item => item.id === record.id);
  
  if (index !== -1) {
    positions[index] = record;
    saveCurrentPositions(positions);
  }
};

// 删除持仓
export const deletePosition = (id: number): void => {
  const positions = getCurrentPositions();
  const index = positions.findIndex(item => item.id === id);
  
  if (index !== -1) {
    const position = positions[index];
    
    // 删除对应的买入记录（如果存在）
    try {
      if (position.buyRecordId) {
        const capitalRecords = getCapitalRecords();
        const filteredRecords = capitalRecords.filter(record => record.id !== position.buyRecordId);
        
        // 按日期排序
        filteredRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem('capitalRecords', JSON.stringify(filteredRecords));
      }
    } catch (error) {
      console.error('删除买入记录失败:', error);
    }
    
    // 删除持仓记录
    const filteredPositions = positions.filter(item => item.id !== id);
    saveCurrentPositions(filteredPositions);
  }
};

// 添加价格记录
export const addPriceRecord = (
  positionId: number,
  price: number,
  date: string,
  remark: string = ''
): void => {
  const positions = getCurrentPositions();
  const index = positions.findIndex(item => item.id === positionId);
  
  if (index !== -1) {
    const position = positions[index];
    const profit = (price - position.buyPrice) * position.shares;
    
    // 添加价格记录
    position.priceHistory.push({
      date,
      price,
      profit,
      remark
    });
    
    // 更新当前价格和盈亏
    position.currentPrice = price;
    position.currentProfit = profit;
    
    // 保存更新
    positions[index] = position;
    saveCurrentPositions(positions);
  }
};

// 删除价格记录
export const deletePriceRecord = (positionId: number, date: string): void => {
  const positions = getCurrentPositions();
  const index = positions.findIndex(item => item.id === positionId);
  
  if (index !== -1) {
    const position = positions[index];
    
    // 至少保留一条价格记录
    if (position.priceHistory.length <= 1) {
      return;
    }
    
    // 删除指定日期的价格记录
    position.priceHistory = position.priceHistory.filter(item => item.date !== date);
    
    // 更新当前价格和盈亏（使用最新价格）
    const latestRecord = position.priceHistory.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    position.currentPrice = latestRecord.price;
    position.currentProfit = latestRecord.profit;
    
    // 保存更新
    positions[index] = position;
    saveCurrentPositions(positions);
  }
};

// 清仓操作
export const closePosition = (id: number): ClosedPosition | null => {
  const positions = getCurrentPositions();
  const index = positions.findIndex(item => item.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const position = positions[index];
  
  // 保存历史价格数据到单独的存储中
  try {
    const historicalData = localStorage.getItem('historicalPriceData');
    let historyData: { [key: number]: any[] } = {};
    
    if (historicalData) {
      historyData = JSON.parse(historicalData);
    }
    
    // 保存当前持仓的价格历史
    if (position.priceHistory && position.priceHistory.length > 0) {
      historyData[position.id] = position.priceHistory;
      localStorage.setItem('historicalPriceData', JSON.stringify(historyData));
    }
  } catch (error) {
    console.error('保存历史价格数据失败:', error);
  }
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 计算清仓收回的资金总额
  const totalReceivedAmount = position.currentPrice * position.shares;
  
  // 创建清仓记录
  const closedPosition: ClosedPosition = {
    id: position.id,
    stockName: position.stockName,
    stockCode: position.stockCode,
    buyPrice: position.buyPrice,
    shares: position.shares,
    buyDate: position.buyDate,
    closedPrice: position.currentPrice,
    closedAt: today,
    finalProfit: position.currentProfit,
    remark: position.remark,
    strategy: position.strategy
  };
  
  // 添加资金记录 - 清仓净利润（只记录盈亏，不记录总收入）
  try {
    const capitalRecords = getCapitalRecords();
    
    // 查找对应的买入记录
    const buyRecord = capitalRecords.find(record => 
      record.id === position.buyRecordId && record.type === 'buy'
    );
    
    if (buyRecord) {
      // 计算净利润：卖出收入 - 买入成本
      const netProfit = totalReceivedAmount - buyRecord.amount;
      
      // 只有当净利润不为0时才记录
      if (netProfit !== 0) {
        const profitRecord: CapitalRecord = {
          id: generateId(),
          date: today,
          amount: netProfit, // 保持原始值，可以是正数或负数
          type: 'profit', // 统一使用profit类型，无论盈利还是亏损
          timestamp: now.getTime(),
          remark: `清仓 ${position.stockName} : 净${netProfit > 0 ? '盈利' : '亏损'} ${Math.abs(netProfit).toFixed(2)}元`,
          stockName: position.stockName,
          stockCode: position.stockCode,
          relatedBuyId: position.buyRecordId
        };
        
        capitalRecords.push(profitRecord);
        // 按日期排序
        capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
      }
    } else {
      console.warn('未找到对应的买入记录，使用传统方式记录卖出');
      // 如果找不到买入记录，使用传统方式
      const newCapitalRecord: CapitalRecord = {
        id: generateId(),
        date: today,
        amount: totalReceivedAmount,
        type: 'sell',
        timestamp: now.getTime(),
        remark: `清仓 ${position.stockName} : ${position.shares}股 × ${position.currentPrice}元`,
        stockName: position.stockName,
        stockCode: position.stockCode
      };
      
      capitalRecords.push(newCapitalRecord);
      capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
    }
  } catch (error) {
    console.error('添加清仓资金记录失败:', error);
  }
  
  // 添加到清仓列表
  const closedPositions = getClosedPositions();
  closedPositions.push(closedPosition);
  saveClosedPositions(closedPositions);
  
  // 从当前持仓中删除
  positions.splice(index, 1);
  saveCurrentPositions(positions);
  
  return closedPosition;
};

// 删除清仓记录
export const deleteClosedPosition = (id: number): void => {
  const positions = getClosedPositions();
  const index = positions.findIndex(item => item.id === id);
  
  if (index !== -1) {
    const closedPosition = positions[index];
    const totalReceivedAmount = closedPosition.closedPrice * closedPosition.shares;
    
    // 撤销对应的清仓资金记录
    try {
      const capitalRecords = getCapitalRecords();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const cancelCapitalRecord: CapitalRecord = {
        id: generateId(),
        date: today,
        amount: totalReceivedAmount,
        type: 'withdraw',
        timestamp: now.getTime(),
        remark: `删除清仓记录 ${closedPosition.stockName} - 撤销收入 ${closedPosition.shares}股 × ${closedPosition.closedPrice}元`
      };
      
      capitalRecords.push(cancelCapitalRecord);
      // 按日期排序
      capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
    } catch (error) {
      console.error('撤销清仓资金记录失败:', error);
    }
    
    // 删除清仓记录
    const filteredPositions = positions.filter(item => item.id !== id);
    saveClosedPositions(filteredPositions);
  }
};

// 计算当前资金
export const calculateCurrentCapital = (): number => {
  const records = getCapitalRecords();
  return records.reduce((total, record) => {
    switch (record.type) {
      case 'deposit': // 入金
      case 'sell':    // 卖出(收入) - 兼容旧数据
      case 'profit':  // 净利润
        return total + record.amount;
      case 'withdraw': // 出金  
        return total - record.amount;
      case 'buy':     // 买入(支出) - 不再减去买入支出，因为买入的钱还是自己的资产
        return total; // 买入时不影响当前资金计算
      default:
        return total;
    }
  }, 0);
};

// 计算投资统计数据
export const calculateInvestStats = (): InvestStats => {
  const positions = getCurrentPositions();
  
  if (positions.length === 0) {
    return {
      totalInvestment: 0,
      totalMaxLoss: 0,
      averageLossPercentage: 0,
      currentProfitPercentage: 0,
      totalProfit: 0,
      recordCount: 0,
      investmentRatio: 0
    };
  }
  
  let totalInvestment = 0;
  let totalMaxLoss = 0;
  let totalLossPercentage = 0;
  let totalProfit = 0;
  
  positions.forEach(position => {
    const investment = position.buyPrice * position.shares;
    totalInvestment += investment;
    totalMaxLoss += position.maxLoss;
    totalLossPercentage += position.lossPercentage;
    totalProfit += position.currentProfit;
  });
  
  const averageLossPercentage = totalLossPercentage / positions.length;
  const currentProfitPercentage = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
  
  // 计算投入占比
  const currentCapital = calculateCurrentCapital();
  const investmentRatio = currentCapital > 0 ? (totalInvestment / currentCapital) * 100 : 0;
  
  return {
    totalInvestment,
    totalMaxLoss,
    averageLossPercentage,
    currentProfitPercentage,
    totalProfit,
    recordCount: positions.length,
    investmentRatio
  };
};

// 导出所有数据
export const exportAllData = () => {
  // 获取历史价格数据
  let historicalPriceData = {};
  try {
    const historicalData = localStorage.getItem('historicalPriceData');
    if (historicalData) {
      historicalPriceData = JSON.parse(historicalData);
    }
  } catch (error) {
    console.error('获取历史价格数据失败:', error);
  }

  return {
    currentPositions: getCurrentPositions(),
    closedPositions: getClosedPositions(),
    capitalRecords: getCapitalRecords(), // 统一使用新的资金记录格式
    initialCapital: getInitialCapital(),
    historicalPriceData, // 历史价格数据
    dailyReviews: getDailyReviews(), // 每日复盘记录
    exportTime: new Date().toISOString(),
    version: '2.1' // 数据格式版本
  };
};

// 导入数据（直接覆盖模式）
export const importData = (data: any): ImportResult => {
  try {
    // 验证数据结构
    if (!data || typeof data !== 'object') {
      return { 
        success: false, 
        message: '无效的数据格式' 
      };
    }
    
    let importCount = 0;
    
    // 导入当前持仓（直接覆盖）
    if (data.currentPositions && Array.isArray(data.currentPositions)) {
      const validatedPositions = data.currentPositions.map((item: InvestRecord) => ({
        ...item,
        priceHistory: item.priceHistory || []
      }));
      saveCurrentPositions(validatedPositions);
      importCount += validatedPositions.length;
    }
    
    // 导入清仓记录（直接覆盖）
    if (data.closedPositions && Array.isArray(data.closedPositions)) {
      saveClosedPositions(data.closedPositions);
      importCount += data.closedPositions.length;
    }
    
    // 导入期货持仓（直接覆盖）
    if (data.futuresPositions && Array.isArray(data.futuresPositions)) {
      saveFuturesPositions(data.futuresPositions);
      importCount += data.futuresPositions.length;
    }
    
    // 导入期货清仓记录（直接覆盖）
    if (data.closedFutures && Array.isArray(data.closedFutures)) {
      saveClosedFuturesPositions(data.closedFutures);
      importCount += data.closedFutures.length;
    }
    
    // 导入历史价格数据（直接覆盖）
    if (data.historicalPriceData && typeof data.historicalPriceData === 'object') {
      try {
        localStorage.setItem('historicalPriceData', JSON.stringify(data.historicalPriceData));
        importCount += Object.keys(data.historicalPriceData).length;
      } catch (error) {
        console.error('导入历史价格数据失败:', error);
      }
    }
    
    // 导入资金记录（直接覆盖）
    if (data.capitalRecords && Array.isArray(data.capitalRecords)) {
      // 按日期排序
      const sortedRecords = [...data.capitalRecords].sort((a: CapitalRecord, b: CapitalRecord) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      localStorage.setItem('capitalRecords', JSON.stringify(sortedRecords));
      importCount += sortedRecords.length;
    }
    // 如果没有新格式，尝试导入旧格式的资金历史（向后兼容）
    else if (data.capitalHistory && Array.isArray(data.capitalHistory)) {
      const convertedRecords = data.capitalHistory.map((item: any) => ({
        id: generateId(),
        date: item.date,
        amount: item.amount,
        type: item.amount > 0 ? 'deposit' : 'withdraw',
        timestamp: item.timestamp,
        remark: item.remark || ''
      }));
      
      // 按日期排序
      convertedRecords.sort((a: CapitalRecord, b: CapitalRecord) => new Date(a.date).getTime() - new Date(b.date).getTime());
      localStorage.setItem('capitalRecords', JSON.stringify(convertedRecords));
      importCount += convertedRecords.length;
    }
    
    // 导入复盘记录（直接覆盖）
    if (data.dailyReviews && Array.isArray(data.dailyReviews)) {
      // 按日期排序
      const sortedReviews = [...data.dailyReviews].sort((a: DailyReview, b: DailyReview) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      saveDailyReviews(sortedReviews);
      importCount += sortedReviews.length;
    }
    
    // 导入初始资金（直接覆盖）
    if (data.initialCapital && typeof data.initialCapital === 'number') {
      saveInitialCapital(data.initialCapital);
    }
    
    return { 
      success: true, 
      message: `成功导入并覆盖了 ${importCount} 条记录` 
    };
  } catch (error) {
    console.error('导入数据失败:', error);
    return { 
      success: false, 
      message: '导入失败：' + (error instanceof Error ? error.message : '未知错误') 
    };
  }
}; 

// 资金管理相关函数
export function addCapital(amount: number): void {
  const records = getCapitalRecords();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const newRecord: CapitalRecord = {
    id: generateId(),
    date: today,
    amount,
    type: 'deposit',
    timestamp: now.getTime(),
    remark: `手动入金 ${amount}元`
  };
  
  records.push(newRecord);
  // 按日期排序
  records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  localStorage.setItem('capitalRecords', JSON.stringify(records));
}

export function withdrawCapital(amount: number): void {
  const records = getCapitalRecords();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const newRecord: CapitalRecord = {
    id: generateId(),
    date: today,
    amount,
    type: 'withdraw',
    timestamp: now.getTime(),
    remark: `手动出金 ${amount}元`
  };
  
  records.push(newRecord);
  // 按日期排序
  records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  localStorage.setItem('capitalRecords', JSON.stringify(records));
}

export function getCapitalRecords(): CapitalRecord[] {
  const recordsJson = localStorage.getItem('capitalRecords');
  return recordsJson ? JSON.parse(recordsJson) : [];
}

export function deleteCapitalRecord(id: string): void {
  const records = getCapitalRecords();
  const updatedRecords = records.filter(record => record.id !== id);
  localStorage.setItem('capitalRecords', JSON.stringify(updatedRecords));
}

// 重写计算当前资金函数
export function calculateTotalInvestment(): number {
  const positions = getCurrentPositions();
  return positions.reduce((total, position) => {
    return total + (position.buyPrice * position.shares);
  }, 0);
} 

// 清除所有数据
export const clearAllData = (): void => {
  try {
    // 清除所有相关的localStorage数据
    localStorage.removeItem(STORAGE_KEYS.CURRENT_POSITIONS); // 当前持仓
    localStorage.removeItem(STORAGE_KEYS.CLOSED_POSITIONS); // 清仓记录
    localStorage.removeItem(STORAGE_KEYS.INITIAL_CAPITAL); // 初始资金
    localStorage.removeItem('capitalRecords'); // 新格式资金记录
    localStorage.removeItem('historicalPriceData'); // 历史价格数据
    localStorage.removeItem('dailyReviews'); // 添加清除复盘记录
    
    // 清除可能存在的其他相关数据
    localStorage.removeItem('investStats'); // 投资统计缓存（如果有）
    localStorage.removeItem('closedStats'); // 清仓统计缓存（如果有）
    
    console.log('所有投资管理数据已清除');
  } catch (error) {
    console.error('清除数据失败:', error);
    throw error;
  }
}; 

// ==================== 每日复盘功能 ====================

// 本地存储键名
const DAILY_REVIEWS_KEY = 'dailyReviews';

// 生成复盘记录ID
const generateReviewId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// 获取所有复盘记录
export const getDailyReviews = (): DailyReview[] => {
  try {
    const data = localStorage.getItem(DAILY_REVIEWS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取复盘记录失败:', error);
    return [];
  }
};

// 保存复盘记录
const saveDailyReviews = (reviews: DailyReview[]): void => {
  try {
    localStorage.setItem(DAILY_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (error) {
    console.error('保存复盘记录失败:', error);
  }
};

// 创建新的复盘记录
export const createDailyReview = (reviewData: Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'>): DailyReview => {
  const now = new Date().toISOString();
  const newReview: DailyReview = {
    ...reviewData,
    id: generateReviewId(),
    createdAt: now,
    updatedAt: now
  };
  
  const reviews = getDailyReviews();
  reviews.push(newReview);
  
  // 按日期倒序排序
  reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  saveDailyReviews(reviews);
  return newReview;
};

// 更新复盘记录
export const updateDailyReview = (id: string, reviewData: Partial<DailyReview>): DailyReview | null => {
  const reviews = getDailyReviews();
  const index = reviews.findIndex(review => review.id === id);
  
  if (index !== -1) {
    const updatedReview = {
      ...reviews[index],
      ...reviewData,
      updatedAt: new Date().toISOString()
    };
    
    reviews[index] = updatedReview;
    saveDailyReviews(reviews);
    return updatedReview;
  }
  
  return null;
};

// 删除复盘记录
export const deleteDailyReview = (id: string): boolean => {
  const reviews = getDailyReviews();
  const index = reviews.findIndex(review => review.id === id);
  
  if (index !== -1) {
    reviews.splice(index, 1);
    saveDailyReviews(reviews);
    return true;
  }
  
  return false;
};

// 根据日期获取复盘记录
export const getDailyReviewByDate = (date: string): DailyReview | null => {
  const reviews = getDailyReviews();
  return reviews.find(review => review.date === date) || null;
};

// 计算当日盈亏
export const calculateDailyProfit = (date: string): number => {
  const positions = getCurrentPositions();
  const closedPositions = getClosedPositions();
  
  // 计算当前持仓在指定日期的盈亏（基于价格历史）
  let currentPositionsProfit = 0;
  positions.forEach(position => {
    const priceRecord = position.priceHistory.find(record => record.date === date);
    if (priceRecord) {
      currentPositionsProfit += priceRecord.profit;
    }
  });
  
  // 计算当日清仓的盈亏
  let closedPositionsProfit = 0;
  closedPositions.forEach(position => {
    if (position.closedAt === date) {
      closedPositionsProfit += position.finalProfit;
    }
  });
  
  return currentPositionsProfit + closedPositionsProfit;
};

// 计算复盘统计数据
export const calculateReviewStats = (): ReviewStats => {
  const reviews = getDailyReviews();
  
  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      avgDailyProfit: 0,
      bestDay: null,
      worstDay: null,
      emotionDistribution: {},
      profitableDays: 0,
      lossDays: 0
    };
  }
  
  // 计算平均每日盈亏
  const totalProfit = reviews.reduce((sum, review) => sum + review.totalProfit, 0);
  const avgDailyProfit = totalProfit / reviews.length;
  
  // 找出最好和最差的一天
  const bestDay = reviews.reduce((best, current) => 
    current.totalProfit > (best?.totalProfit || -Infinity) ? current : best
  );
  const worstDay = reviews.reduce((worst, current) => 
    current.totalProfit < (worst?.totalProfit || Infinity) ? current : worst
  );
  
  // 情绪分布统计
  const emotionDistribution: Record<string, number> = {};
  reviews.forEach(review => {
    emotionDistribution[review.emotionState] = (emotionDistribution[review.emotionState] || 0) + 1;
  });
  
  // 盈利和亏损天数
  const profitableDays = reviews.filter(review => review.totalProfit > 0).length;
  const lossDays = reviews.filter(review => review.totalProfit < 0).length;
  
  return {
    totalReviews: reviews.length,
    avgDailyProfit,
    bestDay,
    worstDay,
    emotionDistribution,
    profitableDays,
    lossDays
  };
};

// 获取最近N天的复盘记录
export const getRecentReviews = (days: number): DailyReview[] => {
  const reviews = getDailyReviews();
  return reviews.slice(0, days);
};

// ================================
// 期货管理相关函数
// ================================

// 获取当前期货持仓列表
export const getCurrentFuturesPositions = (): FuturesRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FUTURES_POSITIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取期货持仓数据失败:', error);
    return [];
  }
};

// 获取已清仓期货记录
export const getClosedFuturesPositions = (): ClosedFuturesPosition[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLOSED_FUTURES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取期货清仓记录失败:', error);
    return [];
  }
};

// 保存当前期货持仓列表
const saveFuturesPositions = (positions: FuturesRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.FUTURES_POSITIONS, JSON.stringify(positions));
  } catch (error) {
    console.error('保存期货持仓数据失败:', error);
  }
};

// 保存已清仓期货记录
const saveClosedFuturesPositions = (positions: ClosedFuturesPosition[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CLOSED_FUTURES, JSON.stringify(positions));
  } catch (error) {
    console.error('保存期货清仓记录失败:', error);
  }
};

// 添加新期货持仓
export const addNewFuturesPosition = (
  contractName: string,
  contractCode: string,
  direction: 'long' | 'short',
  openPrice: number,
  lots: number,
  multiplier: number,
  marginRate: number,
  currentPrice: number,
  stopLossPrice: number,
  openDate: string = '',
  remark: string = '',
  strategy: string = ''
): FuturesRecord => {
  // 计算保证金金额
  const contractValue = openPrice * lots * multiplier;
  const margin = contractValue * (marginRate / 100);
  
  // 计算最大亏损（基于保证金）
  const maxLoss = direction === 'long' 
    ? (openPrice - stopLossPrice) * lots * multiplier
    : (stopLossPrice - openPrice) * lots * multiplier;
  const lossPercentage = (Math.abs(maxLoss) / margin) * 100;
  
  // 计算当前盈亏
  const profit = direction === 'long'
    ? (currentPrice - openPrice) * lots * multiplier
    : (openPrice - currentPrice) * lots * multiplier;
  
  // 创建新记录
  const now = new Date();
  const id = now.getTime();
  const today = now.toISOString().split('T')[0];
  const actualOpenDate = openDate || today;
  
  const newRecord: FuturesRecord = {
    id,
    contractName,
    contractCode,
    direction,
    openPrice,
    lots,
    multiplier,
    margin,
    marginRate,
    currentPrice,
    stopLossPrice,
          openDate: actualOpenDate,
      remark,
      strategy: strategy as InvestStrategy || undefined,
      maxLoss: Math.abs(maxLoss),
    lossPercentage,
    currentProfit: profit,
    priceHistory: [
      {
        date: today,
        price: currentPrice,
        profit,
        remark: '开仓价格'
      }
    ]
  };
  
  // 添加资金记录 - 期货保证金支出
  try {
    const capitalRecords = getCapitalRecords();
    const buyRecordId = generateId();
    const newCapitalRecord: CapitalRecord = {
      id: buyRecordId,
      date: actualOpenDate,
      amount: margin,
      type: 'buy',
      timestamp: now.getTime(),
      remark: `开仓 ${contractName}(${contractCode}) : ${lots}手 × ${openPrice}元 (${direction === 'long' ? '做多' : '做空'})`,
      stockName: contractName,
      stockCode: contractCode
    };
    
    // 将买入记录ID存储到持仓记录中
    newRecord.buyRecordId = buyRecordId;
    
    capitalRecords.push(newCapitalRecord);
    capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
  } catch (error) {
    console.error('添加期货开仓资金记录失败:', error);
  }
  
  // 添加到列表
  const positions = getCurrentFuturesPositions();
  positions.push(newRecord);
  saveFuturesPositions(positions);
  
  return newRecord;
};

// 更新期货持仓
export const updateFuturesPosition = (record: FuturesRecord): void => {
  const positions = getCurrentFuturesPositions();
  const index = positions.findIndex(item => item.id === record.id);
  
  if (index !== -1) {
    positions[index] = record;
    saveFuturesPositions(positions);
  }
};

// 删除期货持仓
export const deleteFuturesPosition = (id: number): void => {
  const positions = getCurrentFuturesPositions();
  const index = positions.findIndex(item => item.id === id);
  
  if (index !== -1) {
    const position = positions[index];
    
    // 删除对应的保证金记录（如果存在）
    try {
      if (position.buyRecordId) {
        const capitalRecords = getCapitalRecords();
        const filteredRecords = capitalRecords.filter(record => record.id !== position.buyRecordId);
        
        filteredRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem('capitalRecords', JSON.stringify(filteredRecords));
      }
    } catch (error) {
      console.error('删除期货保证金记录失败:', error);
    }
    
    // 删除持仓记录
    const filteredPositions = positions.filter(item => item.id !== id);
    saveFuturesPositions(filteredPositions);
  }
};

// 添加期货价格记录
export const addFuturesPriceRecord = (
  positionId: number,
  price: number,
  date: string,
  remark: string = ''
): void => {
  const positions = getCurrentFuturesPositions();
  const index = positions.findIndex(item => item.id === positionId);
  
  if (index !== -1) {
    const position = positions[index];
    const profit = position.direction === 'long'
      ? (price - position.openPrice) * position.lots * position.multiplier
      : (position.openPrice - price) * position.lots * position.multiplier;
    
    // 添加价格记录
    position.priceHistory.push({
      date,
      price,
      profit,
      remark
    });
    
    // 更新当前价格和盈亏
    position.currentPrice = price;
    position.currentProfit = profit;
    
    // 保存更新
    positions[index] = position;
    saveFuturesPositions(positions);
  }
};

// 期货平仓操作
export const closeFuturesPosition = (id: number): ClosedFuturesPosition | null => {
  const positions = getCurrentFuturesPositions();
  const index = positions.findIndex(item => item.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const position = positions[index];
  
  // 保存历史价格数据
  try {
    const historicalData = localStorage.getItem('historicalPriceData');
    let historyData: { [key: number]: any[] } = {};
    
    if (historicalData) {
      historyData = JSON.parse(historicalData);
    }
    
    if (position.priceHistory && position.priceHistory.length > 0) {
      historyData[position.id] = position.priceHistory;
      localStorage.setItem('historicalPriceData', JSON.stringify(historyData));
    }
  } catch (error) {
    console.error('保存期货历史价格数据失败:', error);
  }
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 创建平仓记录
  const closedPosition: ClosedFuturesPosition = {
    id: position.id,
    contractName: position.contractName,
    contractCode: position.contractCode,
    direction: position.direction,
    openPrice: position.openPrice,
    lots: position.lots,
    multiplier: position.multiplier,
    margin: position.margin,
    openDate: position.openDate,
    closedPrice: position.currentPrice,
    closedAt: today,
    finalProfit: position.currentProfit,
    remark: position.remark,
    strategy: position.strategy
  };
  
  // 添加资金记录 - 期货平仓净利润
  try {
    const capitalRecords = getCapitalRecords();
    
    // 查找对应的保证金记录
    const marginRecord = capitalRecords.find(record => 
      record.id === position.buyRecordId && record.type === 'buy'
    );
    
    if (marginRecord) {
      // 只记录净利润，不记录保证金返还
      if (position.currentProfit !== 0) {
        const profitRecord: CapitalRecord = {
          id: generateId(),
          date: today,
          amount: position.currentProfit, // 保持原始值，可以是正数或负数
          type: 'profit', // 统一使用profit类型，无论盈利还是亏损
          timestamp: now.getTime(),
          remark: `平仓 ${position.contractName}(${position.contractCode}) - 净${position.currentProfit > 0 ? '盈利' : '亏损'} ${Math.abs(position.currentProfit).toFixed(2)}元`,
          stockName: position.contractName,
          stockCode: position.contractCode,
          relatedBuyId: position.buyRecordId
        };
        
        capitalRecords.push(profitRecord);
        capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
      }
    }
  } catch (error) {
    console.error('添加期货平仓资金记录失败:', error);
  }
  
  // 添加到清仓列表
  const closedPositions = getClosedFuturesPositions();
  closedPositions.push(closedPosition);
  saveClosedFuturesPositions(closedPositions);
  
  // 从当前持仓中删除
  positions.splice(index, 1);
  saveFuturesPositions(positions);
  
  return closedPosition;
};

// 计算期货投资统计
export const calculateFuturesStats = () => {
  const positions = getCurrentFuturesPositions();
  
  if (positions.length === 0) {
    return {
      totalMargin: 0,
      totalMaxLoss: 0,
      averageLossPercentage: 0,
      currentProfitPercentage: 0,
      totalProfit: 0,
      recordCount: 0,
      longPositions: 0,
      shortPositions: 0
    };
  }
  
  let totalMargin = 0;
  let totalMaxLoss = 0;
  let totalLossPercentage = 0;
  let totalProfit = 0;
  let longPositions = 0;
  let shortPositions = 0;
  
  positions.forEach(position => {
    totalMargin += position.margin;
    totalMaxLoss += position.maxLoss;
    totalLossPercentage += position.lossPercentage;
    totalProfit += position.currentProfit;
    
    if (position.direction === 'long') {
      longPositions++;
    } else {
      shortPositions++;
    }
  });
  
  const averageLossPercentage = totalLossPercentage / positions.length;
  const currentProfitPercentage = totalMargin > 0 ? (totalProfit / totalMargin) * 100 : 0;
  
  return {
    totalMargin,
    totalMaxLoss,
    averageLossPercentage,
    currentProfitPercentage,
    totalProfit,
    recordCount: positions.length,
    longPositions,
    shortPositions
  };
}; 

// 删除期货清仓记录
export const deleteClosedFuturesPosition = (id: number): void => {
  const positions = getClosedFuturesPositions();
  const index = positions.findIndex(item => item.id === id);
  
  if (index !== -1) {
    const closedPosition = positions[index];
    
    // 撤销对应的平仓资金记录
    try {
      const capitalRecords = getCapitalRecords();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // 如果有盈利记录，需要撤销
      if (closedPosition.finalProfit !== 0) {
        const cancelCapitalRecord: CapitalRecord = {
          id: generateId(),
          date: today,
          amount: Math.abs(closedPosition.finalProfit),
          type: closedPosition.finalProfit > 0 ? 'withdraw' : 'deposit',
          timestamp: now.getTime(),
          remark: `删除期货清仓记录 ${closedPosition.contractName}(${closedPosition.contractCode}) - 撤销${closedPosition.finalProfit > 0 ? '盈利' : '亏损'} ${Math.abs(closedPosition.finalProfit).toFixed(2)}元`
        };
        
        capitalRecords.push(cancelCapitalRecord);
        capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
      }
    } catch (error) {
      console.error('撤销期货平仓资金记录失败:', error);
    }
    
    // 删除清仓记录
    const filteredPositions = positions.filter(item => item.id !== id);
    saveClosedFuturesPositions(filteredPositions);
  }
}; 