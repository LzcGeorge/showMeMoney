import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Modal, Tag, Tooltip, Select } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, DollarOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons';
import type { InvestRecord } from '../types';
import { getCurrentPositions, deletePosition, closePosition } from '../services/investService';
import { STRATEGY_LABELS, STRATEGY_OPTIONS } from '../types';
import StockPositionForm from './StockPositionForm';

interface PositionListProps {
  onDataChange?: () => void;
  refresh?: number;
}

const PositionList: React.FC<PositionListProps> = ({ onDataChange, refresh }) => {
  const [positions, setPositions] = useState<InvestRecord[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<InvestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InvestRecord | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [strategyFilter, setStrategyFilter] = useState<string>('');

  // 加载持仓数据
  const loadPositions = () => {
    setLoading(true);
    try {
      const data = getCurrentPositions();
      setPositions(data);
      setFilteredPositions(data);
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

  // 编辑记录
  const handleEdit = (record: InvestRecord) => {
    setEditingRecord(record);
    setIsFormVisible(true);
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

  // 表单提交成功回调
  const handleFormSuccess = () => {
    setIsFormVisible(false);
    setEditingRecord(null);
    loadPositions();
    if (onDataChange) {
      onDataChange();
    }
  };

  // 跳转到东方财富查看股东持仓
  const handleViewShareholders = (record: InvestRecord) => {
    // 优先使用stockCode字段，如果没有则从股票名称中提取
    let stockCode = record.stockCode || extractStockCode(record.stockName);
    
    if (stockCode) {
      // 如果stockCode不包含交易所前缀，则自动添加
      let formattedCode = stockCode;
      if (!/^(SH|SZ)/.test(stockCode)) {
        if (stockCode.startsWith('6')) {
          formattedCode = `SH${stockCode}`;
        } else if (stockCode.startsWith('0') || stockCode.startsWith('3')) {
          formattedCode = `SZ${stockCode}`;
        }
      }
      
      const url = `https://emweb.securities.eastmoney.com/pc_hsf10/pages/index.html?type=web&code=${formattedCode}&color=b#/gdyj`;
      window.open(url, '_blank');
    } else {
      messageApi.warning('无法识别股票代码，请在股票代码列填写或确保股票名称包含代码信息');
    }
  };

  // 提取股票代码的辅助函数
  const extractStockCode = (stockName: string): string | null => {
    // 匹配6位数字的股票代码
    const codeMatch = stockName.match(/(\d{6})/);
    if (codeMatch) {
      return codeMatch[1];
    }
    return null;
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
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 100,
      render: (code: string) => code || '-'
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
      },
      sorter: (a: InvestRecord, b: InvestRecord) => {
        const aInvestment = a.buyPrice * a.shares;
        const bInvestment = b.buyPrice * b.shares;
        const aPercentage = (a.currentProfit / aInvestment) * 100;
        const bPercentage = (b.currentProfit / bInvestment) * 100;
        return aPercentage - bPercentage;
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
      },
      sorter: (a: InvestRecord, b: InvestRecord) => a.currentProfit - b.currentProfit
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: InvestRecord) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdit(record);
              }}
            />
          </Tooltip>
          <Tooltip title="股东持仓">
            <Button 
              type="text" 
              icon={<LinkOutlined />} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('股东持仓按钮被点击:', record);
                handleViewShareholders(record);
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
        title="股票持仓" 
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
              添加持仓
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
          locale={{ emptyText: '暂无持仓记录' }}
        />
      </Card>

      {/* 添加/编辑表单 */}
      <StockPositionForm
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

export default PositionList; 