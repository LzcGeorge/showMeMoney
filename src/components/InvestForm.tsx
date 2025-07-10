import React, { useState } from 'react';
import { Form, Input, InputNumber, Button, Card, DatePicker, message, Row, Col, Alert } from 'antd';
import { CalculatorOutlined, PlusOutlined, InfoCircleOutlined, LinkOutlined } from '@ant-design/icons';
import { addNewPosition } from '../services/investService';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface InvestFormProps {
  onSuccess?: () => void;
}

const InvestForm: React.FC<InvestFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [lossInfo, setLossInfo] = useState<{ loss: number; percentage: number } | null>(null);

  // 计算止损信息
  const calculateLoss = () => {
    try {
      const buyPrice = form.getFieldValue('buyPrice');
      const shares = form.getFieldValue('shares');
      const stopLossPrice = form.getFieldValue('stopLossPrice');
      
      if (!buyPrice || !shares || !stopLossPrice) {
        messageApi.warning('请先填写买入价格、股数和止损价格');
        return;
      }
      
      if (stopLossPrice >= buyPrice) {
        messageApi.warning('止损价格必须低于买入价格');
        return;
      }
      
      const totalInvestment = buyPrice * shares;
      const valueAtStopLoss = stopLossPrice * shares;
      const maxLoss = totalInvestment - valueAtStopLoss;
      const lossPercentage = (maxLoss / totalInvestment) * 100;
      
      setLossInfo({
        loss: maxLoss,
        percentage: lossPercentage
      });
    } catch (error) {
      console.error('计算亏损失败:', error);
      messageApi.error('计算失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // 提取表单数据
      const {
        stockName,
        stockCode,
        buyPrice,
        shares,
        stopLossPrice,
        currentPrice,
        remark,
        buyDate
      } = values;
      
      // 添加新持仓
      addNewPosition(
        stockName,
        stockCode || '',
        buyPrice,
        shares,
        stopLossPrice,
        currentPrice,
        buyDate ? dayjs(buyDate).format('YYYY-MM-DD') : '',
        remark || ''
      );
      
      messageApi.success('添加成功');
      form.resetFields();
      setLossInfo(null);
      
      // 触发父组件刷新
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('添加失败:', error);
      messageApi.error('添加失败');
    } finally {
      setLoading(false);
    }
  };

  // 表单值变化时，清除止损信息
  const handleValuesChange = () => {
    if (lossInfo) {
      setLossInfo(null);
    }
  };

  // 查看股东持仓功能
  const handleViewShareholders = () => {
    const stockName = form.getFieldValue('stockName');
    const stockCode = form.getFieldValue('stockCode');
    
    // 优先使用stockCode字段，如果没有则从股票名称中提取
    let code = stockCode || extractStockCode(stockName);
    
    if (code) {
      // 如果stockCode不包含交易所前缀，则自动添加
      let formattedCode = code;
      if (!/^(SH|SZ)/.test(code)) {
        if (code.startsWith('6')) {
          formattedCode = `SH${code}`;
        } else if (code.startsWith('0') || code.startsWith('3')) {
          formattedCode = `SZ${code}`;
        }
      }
      
      const url = `https://emweb.securities.eastmoney.com/pc_hsf10/pages/index.html?type=web&code=${formattedCode}&color=b#/gdyj`;
      window.open(url, '_blank');
    } else {
      messageApi.warning('请先填写股票名称或股票代码');
    }
  };

  // 提取股票代码的辅助函数
  const extractStockCode = (stockName: string): string | null => {
    if (!stockName) return null;
    // 匹配6位数字的股票代码
    const codeMatch = stockName.match(/(\d{6})/);
    if (codeMatch) {
      return codeMatch[1];
    }
    return null;
  };

  return (
    <>
      {contextHolder}
      <Card 
        title="添加新持仓" 
        bordered={false}
        className="form-card"
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          onValuesChange={handleValuesChange}
        >
          <Row gutter={[24, 0]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="stockName"
                label="股票名称"
                rules={[{ required: true, message: '请输入股票名称' }]}
              >
                <Input placeholder="如：三一重工" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="stockCode"
                label="股票代码"
              >
                <Input placeholder="如：600031（可选）" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="buyDate"
                label="买入日期"
              >
                <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="buyPrice"
                label="买入价格 (元)"
                rules={[{ required: true, message: '请输入买入价格' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="如：18.75"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="shares"
                label="买入股数"
                rules={[{ required: true, message: '请输入买入股数' }]}
              >
                <InputNumber
                  min={100}
                  step={100}
                  style={{ width: '100%' }}
                  placeholder="如：1000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="stopLossPrice"
                label="止损价格 (元)"
                rules={[{ required: true, message: '请输入止损价格' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="如：17.50"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="currentPrice"
                label="当前价格 (元)"
                rules={[{ required: true, message: '请输入当前价格' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="如：18.75"
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="remark"
                label="备注"
              >
                <TextArea rows={3} placeholder="添加备注信息（可选）" />
              </Form.Item>
            </Col>
          </Row>

          {lossInfo && (
            <Alert
              message="止损计算结果"
              description={
                <div>
                  <p>最大亏损金额: <strong>{lossInfo.loss.toFixed(2)}元</strong></p>
                  <p>亏损比例: <strong>{lossInfo.percentage.toFixed(2)}%</strong></p>
                </div>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 24 }}
            />
          )}

          <div className="actions-grid">
            <Button
              type="default"
              icon={<CalculatorOutlined />}
              onClick={calculateLoss}
              size="large"
            >
              计算止损
            </Button>
            <Button
              type="default"
              icon={<LinkOutlined />}
              onClick={handleViewShareholders}
              size="large"
            >
              股东持仓
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              loading={loading}
              size="large"
            >
              添加持仓
            </Button>
          </div>
        </Form>
      </Card>
    </>
  );
};

export default InvestForm; 