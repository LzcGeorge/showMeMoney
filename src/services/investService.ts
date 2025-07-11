import type { InvestRecord, ClosedPosition, CapitalRecord, InvestStats, ImportResult, DailyReview, ReviewStats } from '../types';

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
  INITIAL_CAPITAL: 'initialCapital'
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
  remark: string = ''
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
    priceHistory: [
      {
        date: today,
        price: currentPrice,
        profit,
        remark: '初始价格'
      }
    ]
  };
  
  // 添加资金记录 - 买入股票支出
  try {
    const capitalRecords = getCapitalRecords();
    const newCapitalRecord: CapitalRecord = {
      id: generateId(),
      date: actualBuyDate,
      amount: totalInvestment,
      type: 'buy',
      timestamp: now.getTime(),
      remark: `买入 ${stockName} - ${shares}股 × ${buyPrice}元`
    };
    
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
    const totalInvestment = position.buyPrice * position.shares;
    
    // 添加资金记录 - 删除持仓时返还买入资金
    try {
      const capitalRecords = getCapitalRecords();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const refundCapitalRecord: CapitalRecord = {
        id: generateId(),
        date: today,
        amount: totalInvestment,
        type: 'deposit',
        timestamp: now.getTime(),
        remark: `删除持仓 ${position.stockName} - 返还 ${position.shares}股 × ${position.buyPrice}元`
      };
      
      capitalRecords.push(refundCapitalRecord);
      // 按日期排序
      capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
    } catch (error) {
      console.error('添加删除持仓资金记录失败:', error);
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
    remark: position.remark
  };
  
  // 添加资金记录 - 清仓收回资金
  try {
    const capitalRecords = getCapitalRecords();
    const newCapitalRecord: CapitalRecord = {
      id: generateId(),
      date: today,
      amount: totalReceivedAmount,
      type: 'sell',
      timestamp: now.getTime(),
      remark: `清仓 ${position.stockName} - ${position.shares}股 × ${position.currentPrice}元`
    };
    
    capitalRecords.push(newCapitalRecord);
    // 按日期排序
    capitalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    localStorage.setItem('capitalRecords', JSON.stringify(capitalRecords));
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
      case 'sell':    // 卖出(收入)
        return total + record.amount;
      case 'withdraw': // 出金  
      case 'buy':     // 买入(支出)
        return total - record.amount;
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
  
  // 计算可用资金 = 总资金 + 已投资金额（因为已投资的资金目前还在股票中）
  const currentCapital = calculateCurrentCapital();
  const availableCapital = currentCapital + totalInvestment;
  const investmentRatio = availableCapital > 0 ? (totalInvestment / availableCapital) * 100 : 0;
  
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

// 导入数据
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
    
    // 导入当前持仓
    if (data.currentPositions && Array.isArray(data.currentPositions)) {
      const currentPositions = getCurrentPositions();
      const mergedPositions = [...currentPositions];
      
      data.currentPositions.forEach((item: InvestRecord) => {
        const existingIndex = mergedPositions.findIndex(
          existing => existing.id === item.id
        );
        
        if (existingIndex === -1) {
          // 确保数据格式正确
          const validatedItem: InvestRecord = {
            ...item,
            priceHistory: item.priceHistory || []
          };
          mergedPositions.push(validatedItem);
          importCount++;
        }
      });
      
      saveCurrentPositions(mergedPositions);
    }
    
    // 导入清仓记录
    if (data.closedPositions && Array.isArray(data.closedPositions)) {
      const closedPositions = getClosedPositions();
      const mergedPositions = [...closedPositions];
      
      data.closedPositions.forEach((item: ClosedPosition) => {
        const existingIndex = mergedPositions.findIndex(
          existing => existing.id === item.id
        );
        
        if (existingIndex === -1) {
          mergedPositions.push(item);
          importCount++;
        }
      });
      
      saveClosedPositions(mergedPositions);
    }
    
    // 导入历史价格数据
    if (data.historicalPriceData && typeof data.historicalPriceData === 'object') {
      try {
        const existingHistoricalData = localStorage.getItem('historicalPriceData');
        let mergedHistoricalData = existingHistoricalData ? JSON.parse(existingHistoricalData) : {};
        
        // 合并历史价格数据
        Object.keys(data.historicalPriceData).forEach(key => {
          if (!mergedHistoricalData[key]) {
            mergedHistoricalData[key] = data.historicalPriceData[key];
            importCount++;
          }
        });
        
        localStorage.setItem('historicalPriceData', JSON.stringify(mergedHistoricalData));
      } catch (error) {
        console.error('导入历史价格数据失败:', error);
      }
    }
    
    // 优先导入新格式的资金记录
    if (data.capitalRecords && Array.isArray(data.capitalRecords)) {
      const capitalRecords = getCapitalRecords();
      const mergedRecords = [...capitalRecords];
      
      data.capitalRecords.forEach((item: CapitalRecord) => {
        const existingIndex = mergedRecords.findIndex(
          existing => existing.id === item.id || existing.timestamp === item.timestamp
        );
        
        if (existingIndex === -1) {
          mergedRecords.push(item);
          importCount++;
        }
      });
      
      // 按日期排序
      mergedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      localStorage.setItem('capitalRecords', JSON.stringify(mergedRecords));
    }
    // 如果没有新格式，尝试导入旧格式的资金历史（向后兼容）
    else if (data.capitalHistory && Array.isArray(data.capitalHistory)) {
      const capitalRecords = getCapitalRecords();
      const mergedRecords = [...capitalRecords];
      
      // 将旧格式转换为新格式
      data.capitalHistory.forEach((item: any) => {
        const existingIndex = mergedRecords.findIndex(
          existing => existing.timestamp === item.timestamp
        );
        
        if (existingIndex === -1) {
          // 转换旧格式到新格式
          const newRecord: CapitalRecord = {
            id: generateId(),
            date: item.date,
            amount: item.amount,
            type: item.amount > 0 ? 'deposit' : 'withdraw', // 简单判断类型
            timestamp: item.timestamp,
            remark: item.remark || ''
          };
          mergedRecords.push(newRecord);
          importCount++;
        }
      });
      
      // 按日期排序
      mergedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      localStorage.setItem('capitalRecords', JSON.stringify(mergedRecords));
    }
    
    // 导入复盘记录
    if (data.dailyReviews && Array.isArray(data.dailyReviews)) {
      const dailyReviews = getDailyReviews();
      const mergedReviews = [...dailyReviews];
      
      data.dailyReviews.forEach((item: DailyReview) => {
        const existingIndex = mergedReviews.findIndex(
          existing => existing.id === item.id || existing.date === item.date
        );
        
        if (existingIndex === -1) {
          mergedReviews.push(item);
          importCount++;
        }
      });
      
      // 按日期排序
      mergedReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      saveDailyReviews(mergedReviews);
    }
    
    // 导入初始资金（如果当前为0）
    let capitalImported = false;
    if (data.initialCapital && typeof data.initialCapital === 'number') {
      const currentInitialCapital = getInitialCapital();
      if (currentInitialCapital === 0) {
        saveInitialCapital(data.initialCapital);
        capitalImported = true;
      }
    }
    
    return { 
      success: true, 
      message: `成功导入 ${importCount} 条记录${capitalImported ? '，并设置初始资金' : ''}` 
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