import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, InputNumber, Button, Table, Modal, message, Row, Col, Tooltip, Tag } from 'antd';
import { 
  PlusOutlined, 
  MinusOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  WalletOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { 
  addCapital, 
  withdrawCapital, 
  getCapitalRecords, 
  deleteCapitalRecord,
  calculateCurrentCapital,
  calculateTotalInvestment
} from '../services/investService';
import type { CapitalRecord } from '../types';
import dayjs from 'dayjs';
import * as echarts from 'echarts';

interface CapitalManagerProps {
  onDataChange?: () => void;
  refresh?: number;
}

const CapitalManager: React.FC<CapitalManagerProps> = ({ onDataChange, refresh }) => {
  const [form] = Form.useForm();
  const [records, setRecords] = useState<CapitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentCapital, setCurrentCapital] = useState(0);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 初始化图表
  const initChart = () => {
    if (chartRef.current && records.length > 0) {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
      
      chartInstance.current = echarts.init(chartRef.current);
      
      // 计算累计资金变化
      const sortedRecords = [...records].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let cumulativeAmount = 0;
      const chartData = sortedRecords.map(record => {
        if (record.type === 'deposit' || record.type === 'sell') {
          cumulativeAmount += record.amount;
        } else {
          cumulativeAmount -= record.amount;
        }
        return {
          date: dayjs(record.date).format('MM-DD'),
          amount: cumulativeAmount,
          type: record.type
        };
      });

      const option = {
        title: {
          text: '资金变化趋势',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#374151'
          }
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#667eea',
          borderWidth: 2,
          textStyle: {
            color: '#374151'
          },
          formatter: function(params: any) {
            const data = params[0];
            return `${data.name}<br/>累计资金: ${data.value.toFixed(2)}元`;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          top: '20%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: chartData.map(item => item.date),
          axisLine: {
            lineStyle: {
              color: '#e2e8f0'
            }
          },
          axisLabel: {
            color: '#64748b'
          }
        },
        yAxis: {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: '#e2e8f0'
            }
          },
          axisLabel: {
            color: '#64748b',
            formatter: '{value}元'
          },
          splitLine: {
            lineStyle: {
              color: '#f1f5f9',
              type: 'dashed'
            }
          }
        },
        series: [
          {
            name: '累计资金',
            type: 'line',
            data: chartData.map(item => item.amount),
            smooth: true,
            lineStyle: {
              width: 3,
              color: '#667eea'
            },
            itemStyle: {
              color: '#667eea',
              borderColor: '#fff',
              borderWidth: 2
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [{
                  offset: 0, color: 'rgba(102, 126, 234, 0.3)'
                }, {
                  offset: 1, color: 'rgba(102, 126, 234, 0.05)'
                }]
              }
            },
            symbol: 'circle',
            symbolSize: 6
          }
        ]
      };

      chartInstance.current.setOption(option);

      // 添加窗口大小调整监听
      const handleResize = () => {
        if (chartInstance.current) {
          chartInstance.current.resize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  };

  // 加载资金记录
  const loadRecords = () => {
    setLoading(true);
    try {
      const data = getCapitalRecords();
      setRecords(data);
      setCurrentCapital(calculateCurrentCapital());
      setTotalInvestment(calculateTotalInvestment());
    } catch (error) {
      console.error('加载资金记录失败:', error);
      messageApi.error('加载资金记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [refresh]);

  useEffect(() => {
    if (records.length > 0) {
      // 延迟初始化图表，确保DOM已渲染
      setTimeout(() => {
        initChart();
      }, 100);
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [records]);

  // 添加资金
  const handleAddCapital = () => {
    form.validateFields().then(values => {
      const { amount } = values;
      if (!amount || amount <= 0) {
        messageApi.warning('请输入有效的资金金额');
        return;
      }

      try {
        addCapital(amount);
        messageApi.success('资金添加成功');
        form.resetFields();
        loadRecords();
        if (onDataChange) {
          onDataChange();
        }
      } catch (error) {
        console.error('添加资金失败:', error);
        messageApi.error('添加资金失败');
      }
    });
  };

  // 提取资金
  const handleWithdrawCapital = () => {
    form.validateFields().then(values => {
      const { amount } = values;
      if (!amount || amount <= 0) {
        messageApi.warning('请输入有效的资金金额');
        return;
      }

      try {
        withdrawCapital(amount);
        messageApi.success('资金提取成功');
        form.resetFields();
        loadRecords();
        if (onDataChange) {
          onDataChange();
        }
      } catch (error) {
        console.error('提取资金失败:', error);
        messageApi.error('提取资金失败');
      }
    });
  };

  // 删除记录
  const handleDelete = (record: CapitalRecord) => {
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除这条资金记录吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        try {
          deleteCapitalRecord(record.id);
          messageApi.success('删除成功');
          loadRecords();
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

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => {
        // 如果是ISO字符串格式，提取日期部分；如果已经是YYYY-MM-DD格式，直接使用
        const dateStr = date.includes('T') ? date.split('T')[0] : date;
        return dayjs(dateStr).format('YYYY-MM-DD');
      }
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const typeMap = {
          deposit: { text: '入金', color: '#52c41a' },
          withdraw: { text: '出金', color: '#ff4d4f' },
          buy: { text: '买入', color: '#1890ff' },
          sell: { text: '卖出', color: '#fa8c16' }
        };
        const typeInfo = typeMap[type as keyof typeof typeMap] || { text: type, color: '#666' };
        return (
          <Tag color={typeInfo.color} style={{ margin: 0 }}>
            {typeInfo.text}
          </Tag>
        );
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number, record: CapitalRecord) => {
        const isIncome = record.type === 'deposit' || record.type === 'sell';
        const color = isIncome ? '#52c41a' : '#f5222d';
        const prefix = isIncome ? '+' : '-';
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {prefix}{amount.toFixed(2)}元
          </span>
        );
      }
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (remark: string) => remark || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: CapitalRecord) => (
        <Tooltip title="删除">
          <Button 
            type="text" 
            danger
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record)} 
          />
        </Tooltip>
      )
    }
  ];

  // 可用资金 = 当前资金 - 已投入资金
  const availableCapital = currentCapital - totalInvestment;

  return (
    <div className="capital-container">
      {contextHolder}
      {modalContextHolder}
      <Row gutter={[24, 24]} style={{ width: '100%' }}>
        <Col xs={24} lg={10}>
          <Card title="资金管理" bordered={false}>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-card-title">
                  <WalletOutlined style={{ marginRight: 4 }} />
                  当前资金
                </div>
                <div className="stat-card-value" style={{ color: '#667eea' }}>
                  {currentCapital.toFixed(2)}元
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-title">
                  <LineChartOutlined style={{ marginRight: 4 }} />
                  已投入资金
                </div>
                <div className="stat-card-value" style={{ color: '#52c41a' }}>
                  {totalInvestment.toFixed(2)}元
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
            </div>

            <Form form={form} layout="vertical">
              <Form.Item
                name="amount"
                label="金额"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <InputNumber
                  min={0}
                  step={1000}
                  style={{ width: '100%' }}
                  placeholder="请输入金额"
                  precision={2}
                  size="large"
                />
              </Form.Item>
              
              <div className="actions-grid">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddCapital()}
                >
                  入金
                </Button>
                <Button
                  icon={<MinusOutlined />}
                  onClick={() => handleWithdrawCapital()}
                >
                  出金
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
        
        <Col xs={24} lg={14}>
          <Card title="资金记录" bordered={false} style={{ marginBottom: 24 }}>
            <Table
              dataSource={records}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '暂无资金记录' }}
            />
          </Card>

          {records.length > 0 && (
            <Card title="资金曲线" bordered={false}>
              <div 
                ref={chartRef} 
                style={{ 
                  width: '100%', 
                  height: '400px',
                  padding: '10px'
                }} 
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default CapitalManager; 