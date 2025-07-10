import React, { useEffect, useState } from 'react';
import { Card, Progress } from 'antd';
import { 
  DollarOutlined, 
  WarningOutlined, 
  PercentageOutlined, 
  LineChartOutlined,
  FundOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { calculateInvestStats, calculateCurrentCapital } from '../services/investService';
import type { InvestStats } from '../types';

interface InvestStatisticsProps {
  refresh?: number; // 用于触发刷新的计数器
}

const InvestStatistics: React.FC<InvestStatisticsProps> = ({ refresh }) => {
  const [stats, setStats] = useState<InvestStats>({
    totalInvestment: 0,
    totalMaxLoss: 0,
    averageLossPercentage: 0,
    currentProfitPercentage: 0,
    totalProfit: 0,
    recordCount: 0,
    investmentRatio: 0
  });
  const [currentCapital, setCurrentCapital] = useState(0);

  useEffect(() => {
    // 加载统计数据
    const loadStats = () => {
      const calculatedStats = calculateInvestStats();
      setStats(calculatedStats);
      setCurrentCapital(calculateCurrentCapital());
    };
    
    loadStats();
  }, [refresh]);

  // 根据盈亏情况返回颜色
  const getProfitColor = (value: number) => {
    return value > 0 ? '#f5222d' : value < 0 ? '#52c41a' : '#666';
  };

  // 根据投入占比返回颜色
  const getRatioColor = (ratio: number) => {
    if (ratio > 80) return '#f5222d';
    if (ratio > 50) return '#fa8c16';
    return '#52c41a';
  };

  // 可用资金 = 当前资金 - 已投入资金
  const availableCapital = currentCapital - stats.totalInvestment;

  return (
    <Card title="投资概览" bordered={false}>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-title">
            <DollarOutlined style={{ marginRight: 4 }} />
            总投入金额
          </div>
          <div className="stat-card-value" style={{ color: '#667eea' }}>
            {stats.totalInvestment.toFixed(2)}元
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
            止损比例
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

        <div className="stat-card">
          <div className="stat-card-title">
            <FundOutlined style={{ marginRight: 4 }} />
            当前资金
          </div>
          <div className="stat-card-value" style={{ color: '#667eea' }}>
            {currentCapital.toFixed(2)}元
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">可用资金</div>
          <div className="stat-card-value" style={{ 
            color: availableCapital >= 0 ? '#667eea' : '#f5222d'
          }}>
            {availableCapital.toFixed(2)}元
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">投入占比</div>
          <div className="stat-card-value" style={{ color: getRatioColor(stats.investmentRatio) }}>
            {stats.investmentRatio.toFixed(2)}%
          </div>
          <Progress 
            percent={Math.min(stats.investmentRatio, 100)} 
            showInfo={false}
            strokeColor={getRatioColor(stats.investmentRatio)}
            trailColor="#f0f0f0"
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      </div>
    </Card>
  );
};

export default InvestStatistics; 