import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, DatePicker, Space, Tag, Row, Col, Statistic, Popconfirm } from 'antd';
import { DeleteOutlined, FallOutlined, RiseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getClosedPositions, getClosedFuturesPositions, deleteClosedPosition, deleteClosedFuturesPosition } from '../services/investService';
import { STRATEGY_LABELS, STRATEGY_OPTIONS } from '../types';
import type { InvestStrategy } from '../types';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 合并的清仓记录类型
interface CombinedClosedPosition {
  id: number;
  type: 'stock' | 'futures';
  name: string;
  code?: string;
  buyPrice: number;
  buyDate: string;
  closedPrice: number;
  closedAt: string;
  finalProfit: number;
  remark: string;
  strategy?: InvestStrategy;
  // 股票特有字段
  shares?: number;
  // 期货特有字段
  direction?: 'long' | 'short';
  lots?: number;
  multiplier?: number;
  margin?: number;
}

interface ClosedPositionListProps {
  onDataChange?: () => void;
  refresh?: number;
}

const ClosedPositionList: React.FC<ClosedPositionListProps> = ({ onDataChange, refresh }) => {
  const [closedPositions, setClosedPositions] = useState<CombinedClosedPosition[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<CombinedClosedPosition[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [profitFilter, setProfitFilter] = useState<'all' | 'profit' | 'loss'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'stock' | 'futures'>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('');

  useEffect(() => {
    loadClosedPositions();
  }, []);

  useEffect(() => {
    if (refresh !== undefined) {
      loadClosedPositions();
    }
  }, [refresh]);

  useEffect(() => {
    filterPositions();
  }, [closedPositions, dateRange, profitFilter, typeFilter, strategyFilter]);

  const loadClosedPositions = () => {
    const stockPositions = getClosedPositions();
    const futuresPositions = getClosedFuturesPositions();
    
    const combinedPositions: CombinedClosedPosition[] = [
      ...stockPositions.map(pos => ({
        id: pos.id,
        type: 'stock' as const,
        name: pos.stockName,
        code: pos.stockCode,
        buyPrice: pos.buyPrice,
        buyDate: pos.buyDate,
        closedPrice: pos.closedPrice,
        closedAt: pos.closedAt,
        finalProfit: pos.finalProfit,
        remark: pos.remark,
        strategy: pos.strategy,
        shares: pos.shares
      })),
      ...futuresPositions.map(pos => ({
        id: pos.id,
        type: 'futures' as const,
        name: pos.contractName,
        code: pos.contractCode,
        buyPrice: pos.openPrice,
        buyDate: pos.openDate,
        closedPrice: pos.closedPrice,
        closedAt: pos.closedAt,
        finalProfit: pos.finalProfit,
        remark: pos.remark,
        strategy: pos.strategy,
        direction: pos.direction,
        lots: pos.lots,
        multiplier: pos.multiplier,
        margin: pos.margin
      }))
    ];
    
    // 按清仓日期排序（最新的在前）
    combinedPositions.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
    
    setClosedPositions(combinedPositions);
  };

  const filterPositions = () => {
    let filtered = [...closedPositions];
    
    // 日期筛选
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter(pos => {
        const closedDate = dayjs(pos.closedAt);
        const startCheck = !start || closedDate.isAfter(start, 'day') || closedDate.isSame(start, 'day');
        const endCheck = !end || closedDate.isBefore(end, 'day') || closedDate.isSame(end, 'day');
        return startCheck && endCheck;
      });
    }
    
    // 盈亏筛选
    if (profitFilter === 'profit') {
      filtered = filtered.filter(pos => pos.finalProfit > 0);
    } else if (profitFilter === 'loss') {
      filtered = filtered.filter(pos => pos.finalProfit < 0);
    }
    
    // 类型筛选
    if (typeFilter !== 'all') {
      filtered = filtered.filter(pos => pos.type === typeFilter);
    }
    
    // 策略筛选
    if (strategyFilter) {
      filtered = filtered.filter(pos => pos.strategy === strategyFilter);
    }
    
    setFilteredPositions(filtered);
  };

  const handleDeletePosition = (id: number, type: 'stock' | 'futures') => {
    if (type === 'stock') {
      deleteClosedPosition(id);
    } else {
      deleteClosedFuturesPosition(id);
    }
    loadClosedPositions();
    if (onDataChange) {
      onDataChange();
    }
  };

  const clearFilters = () => {
    setDateRange(null);
    setProfitFilter('all');
    setTypeFilter('all');
    setStrategyFilter('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const formatPercentage = (position: CombinedClosedPosition) => {
    if (position.type === 'stock' && position.shares) {
      const investment = position.buyPrice * position.shares;
      return `${((position.finalProfit / investment) * 100).toFixed(2)}%`;
    } else if (position.type === 'futures' && position.margin) {
      return `${((position.finalProfit / position.margin) * 100).toFixed(2)}%`;
    }
    return '-';
  };

  // 统计信息
  const stats = {
    total: filteredPositions.length,
    stockCount: filteredPositions.filter(p => p.type === 'stock').length,
    futuresCount: filteredPositions.filter(p => p.type === 'futures').length,
    profitCount: filteredPositions.filter(p => p.finalProfit > 0).length,
    lossCount: filteredPositions.filter(p => p.finalProfit < 0).length,
    totalProfit: filteredPositions.reduce((sum, p) => sum + p.finalProfit, 0),
    winRate: filteredPositions.length > 0 ? (filteredPositions.filter(p => p.finalProfit > 0).length / filteredPositions.length * 100).toFixed(2) : '0'
  };

  const columns = [
    {
      title: '基本信息',
      key: 'info',
      width: 200,
      render: (record: CombinedClosedPosition) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{record.name}</div>
          {record.code && <div style={{ color: '#8c8c8c', fontSize: '12px' }}>{record.code}</div>}
          {record.remark && <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '2px' }}>{record.remark}</div>}
        </div>
      )
    },
    {
      title: '类型/策略',
      key: 'type',
      width: 150,
      render: (record: CombinedClosedPosition) => (
        <Space direction="vertical" size="small">
          <Tag color={record.type === 'stock' ? 'green' : 'purple'} style={{ fontSize: '12px' }}>
            {record.type === 'stock' ? '股票' : '期货'}
          </Tag>
          {record.strategy ? (
            <Tag color="blue" style={{ fontSize: '12px' }}>{STRATEGY_LABELS[record.strategy]}</Tag>
          ) : (
            <span style={{ color: '#bfbfbf', fontSize: '12px' }}>未设置</span>
          )}
          {record.type === 'futures' && record.direction && (
            <Tag color={record.direction === 'long' ? 'red' : 'green'} style={{ fontSize: '12px' }}>
              {record.direction === 'long' ? '做多' : '做空'}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: '价格信息',
      key: 'price',
      width: 150,
      render: (record: CombinedClosedPosition) => (
        <div>
          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: '#8c8c8c' }}>{record.type === 'stock' ? '买入' : '开仓'}:</span>
            <span style={{ marginLeft: '8px', fontWeight: '500' }}>{formatCurrency(record.buyPrice)}</span>
          </div>
          <div style={{ fontSize: '13px' }}>
            <span style={{ color: '#8c8c8c' }}>{record.type === 'stock' ? '清仓' : '平仓'}:</span>
            <span style={{ marginLeft: '8px', fontWeight: '500' }}>{formatCurrency(record.closedPrice)}</span>
          </div>
        </div>
      )
    },
    {
      title: '持仓信息',
      key: 'position',
      width: 120,
      render: (record: CombinedClosedPosition) => (
        <div>
          {record.type === 'stock' ? (
            <div style={{ fontSize: '13px', fontWeight: '500' }}>{record.shares} 股</div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500' }}>{record.lots} 手</div>
              <div style={{ color: '#8c8c8c', fontSize: '12px' }}>乘数: {record.multiplier}</div>
            </div>
          )}
        </div>
      )
    },
    {
      title: '盈亏情况',
      key: 'profit',
      width: 140,
      render: (record: CombinedClosedPosition) => (
        <div>
          <div style={{ 
            color: record.finalProfit >= 0 ? '#f5222d' : '#52c41a',
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '2px'
          }}>
            {record.finalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
            <span style={{ marginLeft: '4px' }}>
              {record.finalProfit >= 0 ? '+' : ''}{formatCurrency(record.finalProfit)}
            </span>
          </div>
          <div style={{ 
            color: record.finalProfit >= 0 ? '#f5222d' : '#52c41a',
            fontSize: '12px'
          }}>
            {record.finalProfit >= 0 ? '+' : ''}{formatPercentage(record)}
          </div>
        </div>
      ),
      sorter: (a: CombinedClosedPosition, b: CombinedClosedPosition) => a.finalProfit - b.finalProfit
    },
    {
      title: '日期',
      key: 'date',
      width: 140,
      render: (record: CombinedClosedPosition) => (
        <div>
          <div style={{ fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: '#8c8c8c' }}>{record.type === 'stock' ? '买入' : '开仓'}:</span>
            <div style={{ fontSize: '12px', fontWeight: '500' }}>{record.buyDate}</div>
          </div>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: '#8c8c8c' }}>{record.type === 'stock' ? '清仓' : '平仓'}:</span>
            <div style={{ fontSize: '12px', fontWeight: '500' }}>{record.closedAt}</div>
          </div>
        </div>
      ),
      sorter: (a: CombinedClosedPosition, b: CombinedClosedPosition) => 
        new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (record: CombinedClosedPosition) => (
        <Popconfirm
          title="确定要删除这条清仓记录吗？"
          onConfirm={() => handleDeletePosition(record.id, record.type)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>

      {/* 统计信息 */}
      <Card style={{ marginBottom: 16 }} title="统计信息">
        <Row gutter={16}>
          <Col span={4}>
            <Statistic title="总记录数" value={stats.total} />
          </Col>
          <Col span={4}>
            <Statistic title="股票清仓" value={stats.stockCount} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={4}>
            <Statistic title="期货清仓" value={stats.futuresCount} valueStyle={{ color: '#722ed1' }} />
          </Col>
          <Col span={4}>
            <Statistic title="盈利次数" value={stats.profitCount} valueStyle={{ color: '#f5222d' }} />
          </Col>
          <Col span={4}>
            <Statistic title="亏损次数" value={stats.lossCount} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={4}>
            <Statistic title="胜率" value={`${stats.winRate}%`} valueStyle={{ color: '#1890ff' }} />
          </Col>
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col span={24} style={{ textAlign: 'center' }}>
            <Statistic 
              title="总盈亏" 
              value={formatCurrency(stats.totalProfit)}
              valueStyle={{ 
                color: stats.totalProfit >= 0 ? '#f5222d' : '#52c41a',
                fontSize: '24px',
                fontWeight: 'bold'
              }}
              prefix={stats.totalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 筛选控件 */}
      <Card style={{ marginBottom: 16 }} title="筛选条件">
        <Space wrap>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            placeholder={['开始日期', '结束日期']}
          />
          <Select
            value={profitFilter}
            onChange={setProfitFilter}
            style={{ width: 120 }}
            placeholder="盈亏筛选"
          >
            <Option value="all">全部</Option>
            <Option value="profit">盈利</Option>
            <Option value="loss">亏损</Option>
          </Select>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 120 }}
            placeholder="类型筛选"
          >
            <Option value="all">全部</Option>
            <Option value="stock">股票</Option>
            <Option value="futures">期货</Option>
          </Select>
          <Select
            value={strategyFilter}
            onChange={setStrategyFilter}
            style={{ width: 150 }}
            placeholder="策略筛选"
            allowClear
          >
            {STRATEGY_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
          <Button onClick={clearFilters}>
            清除筛选
          </Button>
        </Space>
      </Card>

      {/* 清仓记录表格 */}
      <Card title="清仓记录" bordered={false}>
        <Table
          columns={columns}
          dataSource={filteredPositions}
          rowKey={(record) => `${record.type}-${record.id}`}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          locale={{
            emptyText: '暂无清仓记录'
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default ClosedPositionList; 