import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Modal, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, InfoCircleOutlined, DollarOutlined } from '@ant-design/icons';
import type { InvestRecord } from '../types';
import { getCurrentPositions, deletePosition, closePosition } from '../services/investService';
import PositionDetail from './PositionDetail';
import PositionEdit from './PositionEdit';

interface PositionListProps {
  onDataChange?: () => void;
  refresh?: number;
}

const PositionList: React.FC<PositionListProps> = ({ onDataChange, refresh }) => {
  const [positions, setPositions] = useState<InvestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InvestRecord | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

  // 加载持仓数据
  const loadPositions = () => {
    setLoading(true);
    try {
      const data = getCurrentPositions();
      setPositions(data);
    } catch (error) {
      console.error('加载持仓数据失败:', error);
      messageApi.error('加载持仓数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  // 监听外部刷新信号
  useEffect(() => {
    if (refresh !== undefined) {
      loadPositions();
    }
  }, [refresh]);

  // 查看详情
  const handleViewDetail = (record: InvestRecord) => {
    setSelectedRecord(record);
    setIsDetailVisible(true);
  };

  // 编辑记录
  const handleEdit = (record: InvestRecord) => {
    setSelectedRecord(record);
    setIsEditVisible(true);
  };

  // 删除记录
  const handleDelete = (record: InvestRecord) => {
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除 ${record.stockName} 的持仓记录吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        try {
          console.log('执行删除操作，ID:', record.id);
          deletePosition(record.id);
          messageApi.success('删除成功');
          
          // 立即刷新当前组件数据
          loadPositions();
          
          // 通知父组件刷新
          if (onDataChange) {
            onDataChange();
          }
        } catch (error) {
          console.error('删除失败:', error);
          messageApi.error('删除失败');
        }
      }
    });
  };

  // 清仓操作
  const handleClosePosition = (record: InvestRecord) => {
    modal.confirm({
      title: '确认清仓',
      icon: <ExclamationCircleOutlined />,
      content: `确定要将 ${record.stockName} 标记为已清仓吗？这将把此股票从当前持仓移到历史清仓记录中。`,
      okText: '确认',
      cancelText: '取消',
      onOk() {
        try {
          const result = closePosition(record.id);
          
          if (result) {
            const totalAmount = result.closedPrice * result.shares;
            messageApi.success(
              `${record.stockName} 已清仓，收回资金 ${totalAmount.toFixed(2)}元，` +
              `${result.finalProfit >= 0 ? '盈利' : '亏损'} ${Math.abs(result.finalProfit).toFixed(2)}元`
            );
            
            // 立即刷新当前组件数据
            loadPositions();
            
            // 通知父组件刷新
            if (onDataChange) {
              onDataChange();
            }
          } else {
            messageApi.error('清仓操作失败');
          }
        } catch (error) {
          console.error('清仓失败:', error);
          messageApi.error('清仓失败');
        }
      }
    });
  };

  // 编辑完成回调
  const handleEditComplete = () => {
    setIsEditVisible(false);
    loadPositions();
    if (onDataChange) {
      onDataChange();
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      render: (text: string) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      )
    },
    {
      title: '当前价格',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      render: (price: number) => `${price.toFixed(2)}元`
    },
    {
      title: '止损价格',
      dataIndex: 'stopLossPrice',
      key: 'stopLossPrice',
      render: (price: number) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
          {price.toFixed(2)}元
        </span>
      )
    },
    {
      title: '最大亏损',
      dataIndex: 'maxLoss',
      key: 'maxLoss',
      render: (loss: number) => `${loss.toFixed(2)}元`
    },
    {
      title: '止损比例',
      dataIndex: 'lossPercentage',
      key: 'lossPercentage',
      render: (percentage: number) => (
        <Tag color={percentage > 10 ? 'red' : percentage > 7 ? 'orange' : 'green'}>
          {percentage.toFixed(2)}%
        </Tag>
      )
    },
    {
      title: '当前盈亏%',
      key: 'profitPercentage',
      render: (_: any, record: InvestRecord) => {
        const investment = record.buyPrice * record.shares;
        const percentage = (record.currentProfit / investment) * 100;
        const color = percentage > 0 ? '#f5222d' : percentage < 0 ? '#52c41a' : '';
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {percentage > 0 ? '+' : ''}{percentage.toFixed(2)}%
          </span>
        );
      }
    },
    {
      title: '盈亏',
      dataIndex: 'currentProfit',
      key: 'currentProfit',
      render: (profit: number) => {
        const color = profit > 0 ? '#f5222d' : profit < 0 ? '#52c41a' : '';
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {profit > 0 ? '+' : ''}{profit.toFixed(2)}元
          </span>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: InvestRecord) => (
        <Space size="small">
          <Tooltip title="详情">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('详情按钮被点击:', record);
                handleViewDetail(record);
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('编辑按钮被点击:', record);
                handleEdit(record);
              }}
            />
          </Tooltip>
          <Tooltip title="清仓">
            <Button 
              type="text" 
              icon={<DollarOutlined />} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('清仓按钮被点击:', record);
                handleClosePosition(record);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('删除按钮被点击:', record);
                handleDelete(record);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <Card 
        title="当前持仓" 
        bordered={false}
      >
        <Table
          dataSource={positions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: '暂无持仓记录' }}
        />
      </Card>

      {/* 详情弹窗 */}
      {selectedRecord && (
        <PositionDetail
          visible={isDetailVisible}
          record={selectedRecord}
          onClose={() => setIsDetailVisible(false)}
        />
      )}

      {/* 编辑弹窗 */}
      {selectedRecord && (
        <PositionEdit
          visible={isEditVisible}
          record={selectedRecord}
          onClose={() => setIsEditVisible(false)}
          onSuccess={handleEditComplete}
        />
      )}
    </>
  );
};

export default PositionList; 