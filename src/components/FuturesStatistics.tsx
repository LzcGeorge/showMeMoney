import React, { useEffect, useState } from 'react';
import { Card } from 'antd';
import { 
  DollarOutlined, 
  WarningOutlined, 
  PercentageOutlined, 
  LineChartOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { calculateFuturesStats } from '../services/investService';

interface FuturesStatisticsProps {
  refresh?: number; // 用于触发刷新的计数器
}

const FuturesStatistics: React.FC<FuturesStatisticsProps> = ({ refresh }) => {
  const [stats, setStats] = useState({
    totalMargin: 0,
    totalMaxLoss: 0,
    averageLossPercentage: 0,
    currentProfitPercentage: 0,
    totalProfit: 0,
    recordCount: 0,
    longPositions: 0,
    shortPositions: 0
  });

  useEffect(() => {
    // 加载统计数据
    const loadStats = () => {
      const calculatedStats = calculateFuturesStats();
      setStats(calculatedStats);
    };
    
    loadStats();
  }, [refresh]);

  // 根据盈亏情况返回颜色
  const getProfitColor = (value: number) => {
    return value > 0 ? '#f5222d' : value < 0 ? '#52c41a' : '#666';
  };

  return (
    <Card title="期货投资概览" bordered={false}>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-title">
            <DollarOutlined style={{ marginRight: 4 }} />
            总保证金
          </div>
          <div className="stat-card-value" style={{ color: '#667eea' }}>
            {stats.totalMargin.toFixed(2)}元
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <WarningOutlined style={{ marginRight: 4 }} />
            最大亏损金额
          </div>
          <div className="stat-card-value" style={{ color: '#faad14' }}>
            {stats.totalMaxLoss.toFixed(2)}元
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <PercentageOutlined style={{ marginRight: 4 }} />
            平均亏损比例
          </div>
          <div className="stat-card-value" style={{ color: '#faad14' }}>
            {stats.averageLossPercentage.toFixed(2)}%
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <LineChartOutlined style={{ marginRight: 4 }} />
            当前盈亏
          </div>
          <div className="stat-card-value" style={{ color: getProfitColor(stats.totalProfit) }}>
            {stats.totalProfit.toFixed(2)}元
          </div>
          <div style={{ fontSize: 12, color: getProfitColor(stats.currentProfitPercentage) }}>
            {stats.currentProfitPercentage > 0 ? '+' : ''}
            {stats.currentProfitPercentage.toFixed(2)}%
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <TeamOutlined style={{ marginRight: 4 }} />
            持仓数量
          </div>
          <div className="stat-card-value" style={{ color: '#667eea' }}>
            {stats.recordCount}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FuturesStatistics; 