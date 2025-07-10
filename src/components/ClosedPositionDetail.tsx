import React from 'react';
import { Modal, Descriptions, Table, Typography, Tag } from 'antd';
import type { ClosedPosition, PriceHistoryRecord } from '../types';
import { formatCurrency, formatPercentage } from '../services/investService';

const { Text } = Typography;

interface ClosedPositionDetailProps {
  visible: boolean;
  record: ClosedPosition | null;
  onClose: () => void;
}

const ClosedPositionDetail: React.FC<ClosedPositionDetailProps> = ({
  visible,
  record,
  onClose
}) => {
  if (!record) return null;

  // 尝试从当前持仓历史中找到对应的历史价格记录
  // 由于清仓后记录已被移除，我们需要从localStorage中查找历史数据
  const getHistoricalPriceData = (): PriceHistoryRecord[] => {
    try {
      // 尝试从localStorage获取历史数据
      const historicalData = localStorage.getItem('historicalPriceData');
      if (historicalData) {
        const data = JSON.parse(historicalData);
        return data[record.id] || [];
      }
    } catch (error) {
      console.error('获取历史价格数据失败:', error);
    }
    return [];
  };

  const priceHistory = getHistoricalPriceData();

  // 计算持有天数
  const calculateHoldingDays = (): number => {
    if (!record.buyDate || !record.closedAt) return 0;
    
    const buyDate = new Date(record.buyDate);
    const closedDate = new Date(record.closedAt);
    const diffTime = Math.abs(closedDate.getTime() - buyDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 计算投资总额
  const totalInvestment = record.buyPrice * record.shares;
  
  // 计算盈亏比例
  const profitPercentage = (record.finalProfit / totalInvestment) * 100;

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => formatCurrency(price),
    },
    {
      title: '当日盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => (
        <Text type={profit >= 0 ? 'success' : 'danger'}>
          {formatCurrency(profit)}
        </Text>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      render: (text: string) => text || '-',
    },
  ];

  return (
    <Modal
      title={`${record.stockName} - 清仓详情`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="股票名称">{record.stockName}</Descriptions.Item>
        <Descriptions.Item label="买入价格">{formatCurrency(record.buyPrice)}</Descriptions.Item>
        <Descriptions.Item label="持股数量">{record.shares} 股</Descriptions.Item>
        <Descriptions.Item label="清仓价格">{formatCurrency(record.closedPrice)}</Descriptions.Item>
        <Descriptions.Item label="买入日期">{record.buyDate}</Descriptions.Item>
        <Descriptions.Item label="清仓日期">{record.closedAt}</Descriptions.Item>
        <Descriptions.Item label="持有天数">{calculateHoldingDays()} 天</Descriptions.Item>
        <Descriptions.Item label="投资总额">{formatCurrency(totalInvestment)}</Descriptions.Item>
        <Descriptions.Item label="最终盈亏">
          <Text type={record.finalProfit >= 0 ? 'success' : 'danger'}>
            {formatCurrency(record.finalProfit)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="盈亏比例">
          <Tag color={profitPercentage >= 0 ? 'green' : 'red'}>
            {formatPercentage(profitPercentage)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>{record.remark || '无'}</Descriptions.Item>
      </Descriptions>

      {priceHistory.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>历史价格记录</h4>
          <Table
            dataSource={priceHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
            columns={columns}
            pagination={false}
            size="small"
            rowKey="date"
          />
        </div>
      )}

      {priceHistory.length === 0 && (
        <div style={{ marginTop: 20, textAlign: 'center', color: '#999' }}>
          <p>暂无历史价格记录</p>
        </div>
      )}
    </Modal>
  );
};

export default ClosedPositionDetail; 