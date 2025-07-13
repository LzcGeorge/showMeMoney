import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tooltip, Tag, Modal, message, Select } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DollarOutlined, 
  ExclamationCircleOutlined,
  LinkOutlined 
} from '@ant-design/icons';
import { 
  getCurrentFuturesPositions, 
  deleteFuturesPosition, 
  closeFuturesPosition 
} from '../services/investService';
import { STRATEGY_LABELS, STRATEGY_OPTIONS } from '../types';
import type { FuturesRecord } from '../types';
import FuturesPositionForm from './FuturesPositionForm';

interface FuturesPositionListProps {
  onDataChange?: () => void;
  refresh?: number;
}

const FuturesPositionList: React.FC<FuturesPositionListProps> = ({ onDataChange, refresh }) => {
  const [positions, setPositions] = useState<FuturesRecord[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<FuturesRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FuturesRecord | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [strategyFilter, setStrategyFilter] = useState<string>('');

  // 加载期货持仓数据
  const loadPositions = () => {
    setLoading(true);
    try {
      const data = getCurrentFuturesPositions();
      setPositions(data);
      setFilteredPositions(data);
    } catch (error) {
      console.error('加载期货持仓失败:', error);
      messageApi.error('加载期货持仓失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    loadPositions();
  }, [refresh]);

  // 策略筛选
  useEffect(() => {
    let filtered = [...positions];
    if (strategyFilter) {
      filtered = filtered.filter(position => position.strategy === strategyFilter);
    }
    setFilteredPositions(filtered);
  }, [positions, strategyFilter]);

  // 添加新持仓
  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormVisible(true);
  };

  // 编辑持仓
  const handleEdit = (record: FuturesRecord) => {
    setEditingRecord(record);
    setIsFormVisible(true);
  };

  // 删除持仓
  const handleDelete = (record: FuturesRecord) => {
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除期货持仓 "${record.contractName}" 吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        try {
          deleteFuturesPosition(record.id);
          messageApi.success('删除成功');
          loadPositions();
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

  // 平仓操作
  const handleClosePosition = (record: FuturesRecord) => {
    modal.confirm({
      title: '确认平仓',
      icon: <ExclamationCircleOutlined />,
      content: `确定要平仓 "${record.contractName}" 吗？当前盈亏：${record.currentProfit.toFixed(2)}元`,
      okText: '确认平仓',
      okType: 'primary',
      cancelText: '取消',
      onOk() {
        try {
          closeFuturesPosition(record.id);
          messageApi.success('平仓成功');
          loadPositions();
          if (onDataChange) {
            onDataChange();
          }
        } catch (error) {
          console.error('平仓失败:', error);
          messageApi.error('平仓失败');
        }
      }
    });
  };

  // 表单提交成功回调
  const handleFormSuccess = () => {
    setIsFormVisible(false);
    setEditingRecord(null);
    loadPositions();
    if (onDataChange) {
      onDataChange();
    }
  };

  // 查看期货行情
  const handleViewQuote = (record: FuturesRecord) => {
    // 使用合约代码，转换为小写
    const contractCode = record.contractCode.toLowerCase();
    
    if (contractCode) {
      const url = `https://quote.eastmoney.com/qihuo/${contractCode}.html`;
      window.open(url, '_blank');
    } else {
      messageApi.warning('合约代码为空，无法查看行情');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '合约名称',
      dataIndex: 'contractName',
      key: 'contractName',
      render: (text: string) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      )
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (direction: 'long' | 'short') => (
        <Tag color={direction === 'long' ? 'green' : 'red'}>
          {direction === 'long' ? '做多' : '做空'}
        </Tag>
      )
    },
    {
      title: '策略',
      dataIndex: 'strategy',
      key: 'strategy',
      width: 120,
      render: (strategy: string) => strategy ? (
        <Tag color="blue">{STRATEGY_LABELS[strategy as keyof typeof STRATEGY_LABELS]}</Tag>
      ) : '-'
    },
    {
      title: '开仓价',
      dataIndex: 'openPrice',
      key: 'openPrice',
      width: 100,
      render: (price: number) => `${price.toFixed(2)}`
    },
    {
      title: '当前价',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      width: 100,
      render: (price: number) => `${price.toFixed(2)}`
    },
    {
      title: '手数',
      dataIndex: 'lots',
      key: 'lots',
      width: 80
    },
    {
      title: '保证金',
      dataIndex: 'margin',
      key: 'margin',
      width: 120,
      render: (margin: number) => `${margin.toFixed(2)}元`,
      sorter: (a: FuturesRecord, b: FuturesRecord) => a.margin - b.margin
    },
    {
      title: '当前盈亏',
      dataIndex: 'currentProfit',
      key: 'currentProfit',
      width: 120,
      render: (profit: number) => {
        const color = profit > 0 ? '#f5222d' : profit < 0 ? '#52c41a' : '';
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {profit > 0 ? '+' : ''}{profit.toFixed(2)}元
          </span>
        );
      },
      sorter: (a: FuturesRecord, b: FuturesRecord) => a.currentProfit - b.currentProfit
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      render: (remark: string) => (
        <span
          title={remark}
          style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-all',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.4'
          }}
        >
          {remark || '-'}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: FuturesRecord) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="查看行情">
            <Button 
              type="text" 
              icon={<LinkOutlined />} 
              onClick={() => handleViewQuote(record)}
            />
          </Tooltip>
          <Tooltip title="平仓">
            <Button 
              type="text" 
              icon={<DollarOutlined />} 
              onClick={() => handleClosePosition(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record)}
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
        title="期货持仓" 
        bordered={false}
        extra={
          <Space>
            <Select
              placeholder="筛选策略"
              style={{ width: 120 }}
              value={strategyFilter || undefined}
              onChange={(value) => setStrategyFilter(value || '')}
              allowClear
            >
              {STRATEGY_OPTIONS.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAdd}
            >
              添加期货持仓
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={filteredPositions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: '暂无期货持仓记录' }}
        />
      </Card>

      {/* 添加/编辑表单 */}
      <FuturesPositionForm
        visible={isFormVisible}
        record={editingRecord}
        onClose={() => {
          setIsFormVisible(false);
          setEditingRecord(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};

export default FuturesPositionList; 