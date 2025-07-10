import React from 'react';
import { Modal, Descriptions, Table, Typography } from 'antd';
import type { InvestRecord } from '../types';
import { formatCurrency, formatPercentage } from '../services/investService';

const { Text } = Typography;

interface PositionDetailProps {
  visible: boolean;
  record: InvestRecord | null;
  onClose: () => void;
}

const PositionDetail: React.FC<PositionDetailProps> = ({
  visible,
  record,
  onClose
}) => {
  if (!record) return null;

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
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
    },
  ];

  return (
    <Modal
      title={`${record.stockName} - 持仓详情`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="股票名称">{record.stockName}</Descriptions.Item>
        <Descriptions.Item label="买入价格">{formatCurrency(record.buyPrice)}</Descriptions.Item>
        <Descriptions.Item label="持股数量">{record.shares} 股</Descriptions.Item>
        <Descriptions.Item label="当前价格">{formatCurrency(record.currentPrice)}</Descriptions.Item>
        <Descriptions.Item label="止损价格">{formatCurrency(record.stopLossPrice)}</Descriptions.Item>
        <Descriptions.Item label="买入日期">{record.buyDate}</Descriptions.Item>
        <Descriptions.Item label="最大亏损">{formatCurrency(record.maxLoss)}</Descriptions.Item>
        <Descriptions.Item label="亏损比例">{formatPercentage(record.lossPercentage)}</Descriptions.Item>
        <Descriptions.Item label="当前盈亏">
          <Text type={record.currentProfit >= 0 ? 'success' : 'danger'}>
            {formatCurrency(record.currentProfit)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>{record.remark || '无'}</Descriptions.Item>
      </Descriptions>

      {record.priceHistory && record.priceHistory.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>历史价格记录</h4>
          <Table
            dataSource={record.priceHistory}
            columns={columns}
            pagination={false}
            size="small"
            rowKey="date"
          />
        </div>
      )}
    </Modal>
  );
};

export default PositionDetail; 