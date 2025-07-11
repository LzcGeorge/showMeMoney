import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Typography,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  Empty
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CalendarOutlined,
  TrophyOutlined,
  DollarOutlined
} from '@ant-design/icons';
import {
  getDailyReviews,
  deleteDailyReview,
  calculateReviewStats
} from '../services/investService';
import type { DailyReview, ReviewStats } from '../types';
import DailyReviewForm from './DailyReviewForm';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface DailyReviewListProps {
  onDataChange?: () => void;
  refresh?: number;
}

const DailyReviewList: React.FC<DailyReviewListProps> = ({ onDataChange, refresh }) => {
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<DailyReview | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 情绪状态映射
  const emotionMap = {
    excellent: { label: '极佳', color: '#52c41a' },
    good: { label: '良好', color: '#1890ff' },
    neutral: { label: '一般', color: '#faad14' },
    bad: { label: '较差', color: '#fa8c16' },
    terrible: { label: '很差', color: '#f5222d' }
  };

  // 加载复盘数据
  const loadReviews = () => {
    setLoading(true);
    try {
      const data = getDailyReviews();
      
      // 强制刷新状态
      setReviews([]);  // 先清空
      setTimeout(() => {
        setReviews(data);  // 再设置新数据
      }, 10);
      
      const statsData = calculateReviewStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载复盘数据失败:', error);
      messageApi.error('加载复盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    if (refresh !== undefined) {
      loadReviews();
    }
  }, [refresh]);

  // 查看详情
  const handleViewDetail = (review: DailyReview) => {
    setSelectedReview(review);
    setIsDetailVisible(true);
  };

  // 编辑复盘
  const handleEdit = (review: DailyReview) => {
    setSelectedReview(review);
    setIsFormVisible(true);
  };

  // 删除复盘 - 使用 Modal.confirm 的版本（暂时注释）
  // const handleDelete = (review: DailyReview) => {
  //   // Modal.confirm 版本的代码...
  // };

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => (
        <Space direction="vertical" size={0}>
          <Text strong>{dayjs(date).format('MM-DD')}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(date).format('ddd')}
          </Text>
        </Space>
      ),
      sorter: (a: DailyReview, b: DailyReview) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    },
    {
      title: '盈亏',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      width: 100,
      render: (profit: number) => (
        <Text style={{ 
          color: profit > 0 ? '#52c41a' : profit < 0 ? '#f5222d' : '#666',
          fontWeight: 'bold'
        }}>
          {profit > 0 ? '+' : ''}{profit.toFixed(2)}
        </Text>
      ),
      sorter: (a: DailyReview, b: DailyReview) => a.totalProfit - b.totalProfit
    },
    {
      title: '情绪',
      dataIndex: 'emotionState',
      key: 'emotionState',
      width: 80,
      render: (emotion: string) => {
        const emotionInfo = emotionMap[emotion as keyof typeof emotionMap];
        return (
          <Tag color={emotionInfo?.color || 'default'}>
            {emotionInfo?.label || emotion}
          </Tag>
        );
      },
      filters: Object.entries(emotionMap).map(([value, info]) => ({
        text: info.label,
        value
      })),
      onFilter: (value: any, record: DailyReview) => record.emotionState === value
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <div>
                     {tags?.slice(0, 2).map(tag => (
             <Tag key={tag} style={{ marginBottom: 2, fontSize: 12 }}>
               {tag}
             </Tag>
           ))}
           {tags?.length > 2 && (
             <Tag color="default" style={{ fontSize: 12 }}>
               +{tags.length - 2}
             </Tag>
           )}
        </div>
      )
    },
    {
      title: '市场概况',
      dataIndex: 'marketOverview',
      key: 'marketOverview',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 200 }}>
            {text || '-'}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: DailyReview) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
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
                
                // 使用原生确认对话框代替 Modal.confirm
                const confirmed = window.confirm(`确定要删除 ${dayjs(record.date).format('YYYY年MM月DD日')} 的复盘记录吗？`);
                
                if (confirmed) {
                  const success = deleteDailyReview(record.id);
                  
                  if (success) {
                    messageApi.success('删除成功');
                    setTimeout(() => {
                      loadReviews();
                      if (onDataChange) {
                        onDataChange();
                      }
                    }, 100);
                  } else {
                    messageApi.error('删除失败');
                  }
                }
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // 表单成功回调
  const handleFormSuccess = () => {
    setIsFormVisible(false);
    setSelectedReview(null);
    
    // 延迟刷新确保状态更新
    setTimeout(() => {
      loadReviews();
      if (onDataChange) {
        onDataChange();
      }
    }, 100);
  };

  // 获取胜率颜色
  const getWinRateColor = (rate: number) => {
    if (rate >= 70) return '#52c41a';
    if (rate >= 50) return '#faad14';
    return '#f5222d';
  };

  return (
    <>
      {contextHolder}
      
      {/* 统计概览 */}
      {stats && stats.totalReviews > 0 && (
        <Card title="复盘统计" bordered={false} style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="复盘天数"
                value={stats.totalReviews}
                prefix={<CalendarOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="平均盈亏"
                value={stats.avgDailyProfit}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
                valueStyle={{ 
                  color: stats.avgDailyProfit >= 0 ? '#52c41a' : '#f5222d' 
                }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="盈利胜率"
                value={(stats.profitableDays / stats.totalReviews * 100)}
                precision={1}
                prefix={<TrophyOutlined />}
                suffix="%"
                valueStyle={{ 
                  color: getWinRateColor(stats.profitableDays / stats.totalReviews * 100)
                }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <div>
                <Text type="secondary">情绪分布</Text>
                <div style={{ marginTop: 8 }}>
                  {Object.entries(stats.emotionDistribution).map(([emotion, count]) => {
                    const emotionInfo = emotionMap[emotion as keyof typeof emotionMap];
                    const percentage = (count / stats.totalReviews * 100);
                    return (
                      <div key={emotion} style={{ marginBottom: 4 }}>
                                                 <Tag 
                           color={emotionInfo?.color} 
                           style={{ minWidth: 40, textAlign: 'center', fontSize: 12 }}
                         >
                           {emotionInfo?.label}
                         </Tag>
                        <Progress 
                          percent={percentage} 
                          size="small" 
                          showInfo={false}
                          strokeColor={emotionInfo?.color}
                          style={{ width: 60, display: 'inline-block', marginLeft: 8 }}
                        />
                        <Text style={{ marginLeft: 8, fontSize: 12 }}>
                          {count}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 复盘列表 */}
      <Card 
        title="复盘记录" 
        bordered={false}
        extra={
          <Button 
            type="primary" 
            onClick={() => {
              setSelectedReview(null);
              setIsFormVisible(true);
            }}
          >
            新建复盘
          </Button>
        }
      >
        {reviews.length === 0 ? (
          <Empty
            description="暂无复盘记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              onClick={() => {
                setSelectedReview(null);
                setIsFormVisible(true);
              }}
            >
              创建第一个复盘
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={reviews}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
            scroll={{ x: 'max-content' }}
          />
        )}
      </Card>

      {/* 编辑表单模态框 */}
      <Modal
        title={selectedReview ? '编辑复盘' : '新建复盘'}
        open={isFormVisible}
        onCancel={() => {
          setIsFormVisible(false);
          setSelectedReview(null);
        }}
        footer={null}
        width={800}
        destroyOnClose={true}
        maskClosable={false}
      >
        <DailyReviewForm
          selectedDate={selectedReview?.date}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setIsFormVisible(false);
            setSelectedReview(null);
          }}
        />
      </Modal>

      {/* 详情查看模态框 */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            <span>{dayjs(selectedReview?.date).format('YYYY年MM月DD日')} 复盘详情</span>
          </Space>
        }
        open={isDetailVisible}
        onCancel={() => {
          setIsDetailVisible(false);
          setSelectedReview(null);
        }}
        footer={[
          <Button key="edit" type="primary" onClick={() => {
            setIsDetailVisible(false);
            setIsFormVisible(true);
          }}>
            编辑
          </Button>,
          <Button key="close" onClick={() => {
            setIsDetailVisible(false);
            setSelectedReview(null);
          }}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedReview && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic
                  title="当日盈亏"
                  value={selectedReview.totalProfit}
                  precision={2}
                  suffix="元"
                  valueStyle={{ 
                    color: selectedReview.totalProfit >= 0 ? '#52c41a' : '#f5222d' 
                  }}
                />
              </Col>
              <Col span={12}>
                <div>
                  <Text type="secondary">情绪状态</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={emotionMap[selectedReview.emotionState as keyof typeof emotionMap]?.color}>
                      {emotionMap[selectedReview.emotionState as keyof typeof emotionMap]?.label}
                    </Tag>
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>标签</Title>
              <div>
                {selectedReview.tags?.map(tag => (
                  <Tag key={tag} style={{ marginBottom: 4 }}>
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>市场概况</Title>
              <Text>{selectedReview.marketOverview || '-'}</Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>持仓回顾</Title>
              <Text>{selectedReview.positionReview || '-'}</Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>交易分析</Title>
              <Text>{selectedReview.tradeAnalysis || '-'}</Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>经验教训</Title>
              <Text>{selectedReview.lessons || '-'}</Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>明日计划</Title>
              <Text>{selectedReview.nextPlan || '-'}</Text>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                创建时间：{dayjs(selectedReview.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                {selectedReview.updatedAt !== selectedReview.createdAt && (
                  <span style={{ marginLeft: 16 }}>
                    更新时间：{dayjs(selectedReview.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                )}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default DailyReviewList; 