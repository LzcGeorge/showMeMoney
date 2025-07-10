import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Modal, DatePicker, Form, Select, Tooltip } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, FilterOutlined, InfoCircleOutlined, LinkOutlined } from '@ant-design/icons';
import type { ClosedPosition } from '../types';
import { getClosedPositions, deleteClosedPosition } from '../services/investService';
import ClosedPositionDetail from './ClosedPositionDetail';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface ClosedPositionListProps {
  onDataChange?: () => void;
  refresh?: number;
}

const ClosedPositionList: React.FC<ClosedPositionListProps> = ({ onDataChange, refresh }) => {
  const [positions, setPositions] = useState<ClosedPosition[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<ClosedPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ClosedPosition | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [form] = Form.useForm();

  // 统计数据
  const [stats, setStats] = useState({
    closedTotal: 0,
    profitCount: 0,
    lossCount: 0,
    winRate: 0,
    totalProfitLoss: 0,
    avgProfitLoss: 0,
    avgProfitLossPercentage: 0,
    avgHoldingDays: 0
  });

  // 加载清仓记录
  const loadClosedPositions = () => {
    setLoading(true);
    try {
      const data = getClosedPositions();
      // 按清仓日期倒序排序
      data.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
      setPositions(data);
      setFilteredPositions(data);
      calculateStats(data);
    } catch (error) {
      console.error('加载清仓记录失败:', error);
      messageApi.error('加载清仓记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClosedPositions();
  }, []);

  useEffect(() => {
    loadClosedPositions();
  }, [refresh]);

  // 查看详情
  const handleViewDetail = (record: ClosedPosition) => {
    setSelectedRecord(record);
    setIsDetailVisible(true);
  };

  // 跳转到东方财富查看股东持仓
  const handleViewShareholders = (record: ClosedPosition) => {
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

  // 删除记录
  const handleDelete = (record: ClosedPosition) => {
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除 ${record.stockName} 的清仓记录吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        try {
          console.log('执行清仓记录删除操作，ID:', record.id);
          deleteClosedPosition(record.id);
          messageApi.success('删除成功');
          
          // 立即刷新当前组件数据
          loadClosedPositions();
          
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

  // 计算持有天数
  const calculateHoldingDays = (record: ClosedPosition): number => {
    if (!record.buyDate) return 0;
    
    const buyDate = new Date(record.buyDate);
    const closeDate = new Date(record.closedAt);
    const diffTime = Math.abs(closeDate.getTime() - buyDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 计算统计数据
  const calculateStats = (data: ClosedPosition[]) => {
    if (data.length === 0) {
      setStats({
        closedTotal: 0,
        profitCount: 0,
        lossCount: 0,
        winRate: 0,
        totalProfitLoss: 0,
        avgProfitLoss: 0,
        avgProfitLossPercentage: 0,
        avgHoldingDays: 0
      });
      return;
    }

    let profitCount = 0;
    let lossCount = 0;
    let totalProfit = 0;
    let totalPercentage = 0;
    let totalHoldingDays = 0;

    data.forEach(record => {
      // 计算盈亏
      const profit = record.finalProfit;
      if (profit > 0) {
        profitCount++;
      } else if (profit < 0) {
        lossCount++;
      }

      totalProfit += profit;

      // 计算盈亏比例
      const buyAmount = record.buyPrice * record.shares;
      const profitPercentage = (profit / buyAmount) * 100;
      totalPercentage += profitPercentage;

      // 计算持有天数
      totalHoldingDays += calculateHoldingDays(record);
    });

    // 计算平均值
    const winRate = data.length > 0 ? (profitCount / data.length) * 100 : 0;
    const avgProfit = data.length > 0 ? totalProfit / data.length : 0;
    const avgPercentage = data.length > 0 ? totalPercentage / data.length : 0;
    const avgHoldingDays = data.length > 0 ? totalHoldingDays / data.length : 0;

    setStats({
      closedTotal: data.length,
      profitCount,
      lossCount,
      winRate,
      totalProfitLoss: totalProfit,
      avgProfitLoss: avgProfit,
      avgProfitLossPercentage: avgPercentage,
      avgHoldingDays
    });
  };

  // 应用过滤器
  const applyFilter = (values: any) => {
    const { timeRange, resultType } = values;
    
    let filtered = [...positions];
    
    // 按时间范围过滤
    if (timeRange && timeRange.length === 2) {
      const startDate = dayjs(timeRange[0]).startOf('day');
      const endDate = dayjs(timeRange[1]).endOf('day');
      
      filtered = filtered.filter(record => {
        const closeDate = dayjs(record.closedAt);
        return closeDate.isAfter(startDate) && closeDate.isBefore(endDate);
      });
    }
    
    // 按盈亏类型过滤
    if (resultType) {
      if (resultType === 'profit') {
        filtered = filtered.filter(record => record.finalProfit > 0);
      } else if (resultType === 'loss') {
        filtered = filtered.filter(record => record.finalProfit < 0);
      }
    }
    
    setFilteredPositions(filtered);
    calculateStats(filtered);
    setIsFilterVisible(false);
  };

  // 重置过滤器
  const resetFilter = () => {
    form.resetFields();
    setFilteredPositions(positions);
    calculateStats(positions);
    setIsFilterVisible(false);
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
      title: '买入日期',
      dataIndex: 'buyDate',
      key: 'buyDate',
      render: (text: string) => text || '未记录'
    },
    {
      title: '清仓日期',
      dataIndex: 'closedAt',
      key: 'closedAt'
    },
    {
      title: '买入价',
      dataIndex: 'buyPrice',
      key: 'buyPrice',
      render: (price: number) => `${price.toFixed(2)}元`
    },
    {
      title: '清仓价',
      dataIndex: 'closedPrice',
      key: 'closedPrice',
      render: (price: number) => `${price.toFixed(2)}元`
    },
    {
      title: '持有股数',
      dataIndex: 'shares',
      key: 'shares'
    },
    {
      title: '持有天数',
      key: 'holdingDays',
      render: (_: any, record: ClosedPosition) => calculateHoldingDays(record)
    },
    {
      title: '最终盈亏',
      dataIndex: 'finalProfit',
      key: 'finalProfit',
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
      width: 160,
      render: (_: any, record: ClosedPosition) => (
        <Space size="small">
          <Tooltip title="详情">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('清仓记录详情按钮被点击:', record);
                handleViewDetail(record);
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
                console.log('清仓记录股东持仓按钮被点击:', record);
                handleViewShareholders(record);
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
                console.log('清仓记录删除按钮被点击:', record);
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
        title="清仓记录" 
        bordered={false}
        extra={
          <Button 
            icon={<FilterOutlined />} 
            onClick={() => setIsFilterVisible(true)}
          >
            筛选
          </Button>
        }
      >
        {/* 统计信息 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            <div className="stat-card" style={{ flex: '1 1 200px' }}>
              <div className="stat-card-title">清仓总数</div>
              <div className="stat-card-value" style={{ color: '#1890ff' }}>{stats.closedTotal}</div>
            </div>
            <div className="stat-card" style={{ flex: '1 1 200px' }}>
              <div className="stat-card-title">盈利次数</div>
              <div className="stat-card-value" style={{ color: '#f5222d' }}>{stats.profitCount}</div>
            </div>
            <div className="stat-card" style={{ flex: '1 1 200px' }}>
              <div className="stat-card-title">亏损次数</div>
              <div className="stat-card-value" style={{ color: '#52c41a' }}>{stats.lossCount}</div>
            </div>
            <div className="stat-card" style={{ flex: '1 1 200px' }}>
              <div className="stat-card-title">胜率</div>
              <div className="stat-card-value">{stats.winRate.toFixed(2)}%</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="stat-card" style={{ flex: '1 1 200px' }}>
              <div className="stat-card-title">总盈亏</div>
              <div className="stat-card-value" style={{ 
                color: stats.totalProfitLoss > 0 ? '#f5222d' : stats.totalProfitLoss < 0 ? '#52c41a' : '#666'
              }}>
                {stats.totalProfitLoss > 0 ? '+' : ''}{stats.totalProfitLoss.toFixed(2)}元
              </div>
            </div>
            <div className="stat-card" style={{ flex: '1 1 200px' }}>
              <div className="stat-card-title">平均盈亏</div>
              <div className="stat-card-value" style={{ 
                color: stats.avgProfitLoss > 0 ? '#f5222d' : stats.avgProfitLoss < 0 ? '#52c41a' : '#666'
              }}>
                {stats.avgProfitLoss > 0 ? '+' : ''}{stats.avgProfitLoss.toFixed(2)}元
              </div>
            </div>
            <div className="stat-card" style={{ flex: '1 1 200px' }}>
              <div className="stat-card-title">平均盈亏比例</div>
              <div className="stat-card-value" style={{ 
                color: stats.avgProfitLossPercentage > 0 ? '#f5222d' : stats.avgProfitLossPercentage < 0 ? '#52c41a' : '#666'
              }}>
                {stats.avgProfitLossPercentage > 0 ? '+' : ''}{stats.avgProfitLossPercentage.toFixed(2)}%
              </div>
            </div>
            <div className="stat-card" style={{ flex: '1 1 200px' }}>
              <div className="stat-card-title">平均持有天数</div>
              <div className="stat-card-value">{stats.avgHoldingDays.toFixed(1)}天</div>
            </div>
          </div>
        </div>

        <Table
          dataSource={filteredPositions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: '暂无清仓记录' }}
        />
      </Card>

      {/* 详情弹窗 */}
      {selectedRecord && (
        <ClosedPositionDetail
          visible={isDetailVisible}
          record={selectedRecord}
          onClose={() => setIsDetailVisible(false)}
        />
      )}

      {/* 筛选弹窗 */}
      <Modal
        title="筛选清仓记录"
        open={isFilterVisible}
        onCancel={() => setIsFilterVisible(false)}
        footer={[
          <Button key="reset" onClick={resetFilter}>
            重置
          </Button>,
          <Button key="apply" type="primary" onClick={() => form.submit()}>
            应用
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={applyFilter}
        >
          <Form.Item
            name="timeRange"
            label="时间范围"
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="resultType"
            label="盈亏类型"
          >
            <Select placeholder="请选择盈亏类型" allowClear>
              <Option value="profit">盈利</Option>
              <Option value="loss">亏损</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ClosedPositionList; 