import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  Tag, 
  message, 
  Row, 
  Col,
  Divider,
  Space,
  Typography
} from 'antd';
import { 
  SaveOutlined, 
  PlusOutlined,
  BookOutlined,
  HeartOutlined,
  BulbOutlined,
  CalendarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { 
  createDailyReview, 
  updateDailyReview, 
  getDailyReviewByDate,
  calculateDailyProfit 
} from '../services/investService';
import type { DailyReview } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface DailyReviewFormProps {
  selectedDate?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DailyReviewForm: React.FC<DailyReviewFormProps> = ({ 
  selectedDate, 
  onSuccess, 
  onCancel 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [inputTag, setInputTag] = useState('');
  const [existingReview, setExistingReview] = useState<DailyReview | null>(null);
  const [dailyProfit, setDailyProfit] = useState(0);

  // 预定义标签
  const predefinedTags = [
    '突破买入', '止损卖出', '获利了结', '加仓', '减仓',
    '情绪化交易', '理性分析', '市场震荡', '趋势明确',
    '超买', '超卖', '消息面影响', '技术面分析'
  ];

  // 情绪状态选项
  const emotionOptions = [
    { value: 'excellent', label: '极佳', color: '#52c41a' },
    { value: 'good', label: '良好', color: '#1890ff' },
    { value: 'neutral', label: '一般', color: '#faad14' },
    { value: 'bad', label: '较差', color: '#fa8c16' },
    { value: 'terrible', label: '很差', color: '#f5222d' }
  ];

  useEffect(() => {
    const initForm = async () => {
      const reviewDate = selectedDate || dayjs().format('YYYY-MM-DD');
      
      // 计算当日盈亏
      const profit = calculateDailyProfit(reviewDate);
      setDailyProfit(profit);
      
      // 检查是否已存在该日期的复盘记录
      const existing = getDailyReviewByDate(reviewDate);
      if (existing) {
        setExistingReview(existing);
        setCustomTags(existing.tags || []);
        form.setFieldsValue({
          date: dayjs(existing.date),
          marketOverview: existing.marketOverview,
          positionReview: existing.positionReview,
          tradeAnalysis: existing.tradeAnalysis,
          emotionState: existing.emotionState,
          lessons: existing.lessons,
          nextPlan: existing.nextPlan,
          totalProfit: existing.totalProfit
        });
      } else {
        // 新建复盘，清空所有状态并设置默认值
        setExistingReview(null);
        setCustomTags([]);
        setInputTag('');
        form.resetFields();
        form.setFieldsValue({
          date: dayjs(reviewDate),
          totalProfit: profit,
          emotionState: 'neutral'
        });
      }
    };

    initForm();
  }, [selectedDate, form]);

  // 添加自定义标签
  const handleAddTag = () => {
    if (inputTag && !customTags.includes(inputTag)) {
      setCustomTags([...customTags, inputTag]);
      setInputTag('');
    }
  };

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    setCustomTags(customTags.filter(t => t !== tag));
  };

  // 添加预定义标签
  const handleAddPredefinedTag = (tag: string) => {
    if (!customTags.includes(tag)) {
      setCustomTags([...customTags, tag]);
    }
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const reviewData = {
        date: dayjs(values.date).format('YYYY-MM-DD'),
        marketOverview: values.marketOverview || '',
        positionReview: values.positionReview || '',
        tradeAnalysis: values.tradeAnalysis || '',
        emotionState: values.emotionState || 'neutral',
        lessons: values.lessons || '',
        nextPlan: values.nextPlan || '',
        totalProfit: parseFloat(values.totalProfit) || 0,
        tags: customTags
      };

      if (existingReview) {
        // 更新现有记录
        const result = updateDailyReview(existingReview.id, reviewData);
        
        if (result) {
          messageApi.success('复盘记录更新成功');
          // 延迟调用回调，确保消息显示
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            }
          }, 500);
        } else {
          messageApi.error('更新失败');
        }
      } else {
        // 创建新记录
        const result = createDailyReview(reviewData);
        
        if (result) {
          messageApi.success('复盘记录保存成功');
          
          // 清空表单数据
          form.resetFields();
          setCustomTags([]);
          setInputTag('');
          setExistingReview(null);
          setDailyProfit(0);
          
          // 延迟调用回调，确保消息显示
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            }
          }, 500);
        } else {
          messageApi.error('保存失败');
        }
      }
    } catch (error) {
      console.error('保存复盘记录失败:', error);
      messageApi.error('保存失败');
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      {contextHolder}
      <Card title={
        <Space>
          <BookOutlined />
          <span>{existingReview ? '编辑复盘' : '每日复盘'}</span>
        </Space>
      } bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="date"
                label={
                  <Space>
                    <CalendarOutlined />
                    <span>复盘日期</span>
                  </Space>
                }
                rules={[{ required: true, message: '请选择复盘日期' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="选择日期"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="totalProfit"
                label={
                  <Space>
                    <DollarOutlined />
                    <span>当日盈亏</span>
                  </Space>
                }
              >
                <Input 
                  type="number"
                  step="0.01"
                  addonAfter="元"
                  placeholder="当日总盈亏"
                  style={{ 
                    color: dailyProfit >= 0 ? '#52c41a' : '#f5222d'
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="emotionState"
            label={
              <Space>
                <HeartOutlined />
                <span>情绪状态</span>
              </Space>
            }
          >
            <Select placeholder="选择今日情绪状态">
              {emotionOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider orientation="left">交易回顾</Divider>

          <Form.Item
            name="marketOverview"
            label="市场概况"
          >
            <TextArea
              rows={3}
              placeholder="今日市场整体表现、热点板块、重要消息等..."
            />
          </Form.Item>

          <Form.Item
            name="positionReview"
            label="持仓回顾"
          >
            <TextArea
              rows={3}
              placeholder="各持仓股票的表现、价格变化、持仓调整等..."
            />
          </Form.Item>

          <Form.Item
            name="tradeAnalysis"
            label="交易分析"
          >
            <TextArea
              rows={3}
              placeholder="今日的买卖操作、决策依据、执行情况等..."
            />
          </Form.Item>

          <Divider orientation="left">总结与计划</Divider>

          <Form.Item
            name="lessons"
            label={
              <Space>
                <BulbOutlined />
                <span>经验教训</span>
              </Space>
            }
          >
            <TextArea
              rows={3}
              placeholder="今日的收获、错误、需要改进的地方..."
            />
          </Form.Item>

          <Form.Item
            name="nextPlan"
            label="明日计划"
          >
            <TextArea
              rows={3}
              placeholder="明日的交易计划、关注重点、操作策略..."
            />
          </Form.Item>

          <Form.Item label="标签">
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">预设标签：</Text>
              <div style={{ marginTop: 8 }}>
                {predefinedTags.map(tag => (
                  <Tag
                    key={tag}
                    style={{ cursor: 'pointer', marginBottom: 4 }}
                    onClick={() => handleAddPredefinedTag(tag)}
                    color={customTags.includes(tag) ? 'blue' : 'default'}
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Input
                  value={inputTag}
                  onChange={(e) => setInputTag(e.target.value)}
                  placeholder="添加自定义标签"
                  onPressEnter={handleAddTag}
                  style={{ width: 200 }}
                />
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={handleAddTag}
                >
                  添加
                </Button>
              </Space>
            </div>

            <div>
              {customTags.map(tag => (
                <Tag
                  key={tag}
                  closable
                  onClose={() => handleRemoveTag(tag)}
                  style={{ marginBottom: 4 }}
                >
                  {tag}
                </Tag>
              ))}
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
                size="large"
              >
                {existingReview ? '更新复盘' : '保存复盘'}
              </Button>
              {onCancel && (
                <Button onClick={onCancel} size="large">
                  取消
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default DailyReviewForm; 