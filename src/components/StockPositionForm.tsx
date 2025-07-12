import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, message, Button, Alert, Select } from 'antd';
import { CalculatorOutlined, LinkOutlined } from '@ant-design/icons';
import { addNewPosition, updatePosition } from '../services/investService';
import { STRATEGY_OPTIONS } from '../types';
import type { InvestRecord } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface StockPositionFormProps {
  visible: boolean;
  record: InvestRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

const StockPositionForm: React.FC<StockPositionFormProps> = ({
  visible,
  record,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [lossInfo, setLossInfo] = useState<{ loss: number; percentage: number } | null>(null);

  // 当弹窗打开时，填充表单数据
  useEffect(() => {
    if (visible && record) {
      form.setFieldsValue({
        stockName: record.stockName,
        stockCode: record.stockCode,
        buyPrice: record.buyPrice,
        shares: record.shares,
        stopLossPrice: record.stopLossPrice,
        currentPrice: record.currentPrice,
        buyDate: record.buyDate ? dayjs(record.buyDate) : null,
        remark: record.remark,
        strategy: record.strategy
      });
    } else if (visible && !record) {
      // 新建时重置表单
      form.resetFields();
      form.setFieldsValue({
        buyDate: dayjs()
      });
    }
    setLossInfo(null);
  }, [visible, record, form]);

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

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const formData = {
        ...values,
        buyDate: values.buyDate ? values.buyDate.format('YYYY-MM-DD') : ''
      };

      if (record) {
        // 编辑模式
        const updatedRecord: InvestRecord = {
          ...record,
          ...formData,
          // 重新计算相关数据
          maxLoss: (formData.buyPrice - formData.stopLossPrice) * formData.shares,
          lossPercentage: ((formData.buyPrice - formData.stopLossPrice) * formData.shares / (formData.buyPrice * formData.shares)) * 100,
          currentProfit: (formData.currentPrice - formData.buyPrice) * formData.shares,
          priceHistory: record.priceHistory || []
        };
        
        updatePosition(updatedRecord);
        messageApi.success('股票持仓更新成功');
      } else {
        // 新建模式
        addNewPosition(
          formData.stockName,
          formData.stockCode || '',
          formData.buyPrice,
          formData.shares,
          formData.stopLossPrice,
          formData.currentPrice,
          formData.buyDate,
          formData.remark || '',
          formData.strategy || ''
        );
        messageApi.success('股票持仓添加成功');
      }
      
      onSuccess();
    } catch (error) {
      console.error('表单提交失败:', error);
      messageApi.error('操作失败');
    }
  };

  // 表单值变化时，清除止损信息
  const handleValuesChange = () => {
    if (lossInfo) {
      setLossInfo(null);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={record ? '编辑股票持仓' : '添加股票持仓'}
        open={visible}
        onCancel={onClose}
        onOk={handleSubmit}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="stockName"
              label="股票名称"
              rules={[{ required: true, message: '请输入股票名称' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：三一重工" />
            </Form.Item>

            <Form.Item
              name="stockCode"
              label="股票代码"
              style={{ flex: 1 }}
            >
              <Input placeholder="如：600031（可选）" />
            </Form.Item>

            <Form.Item
              name="buyDate"
              label="买入日期"
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="buyPrice"
              label="买入价格 (元)"
              rules={[{ required: true, message: '请输入买入价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="如：18.75"
              />
            </Form.Item>

            <Form.Item
              name="shares"
              label="买入股数"
              rules={[{ required: true, message: '请输入买入股数' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="如：100"
              />
            </Form.Item>

            <Form.Item
              name="stopLossPrice"
              label="止损价格 (元)"
              rules={[{ required: true, message: '请输入止损价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="如：16.50"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="currentPrice"
              label="当前价格 (元)"
              rules={[{ required: true, message: '请输入当前价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
                placeholder="如：19.20"
              />
            </Form.Item>

            <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'end' }}>
              <Button 
                icon={<CalculatorOutlined />} 
                onClick={calculateLoss}
                style={{ marginBottom: '24px' }}
              >
                计算止损
              </Button>
              <Button 
                icon={<LinkOutlined />} 
                onClick={handleViewShareholders}
                style={{ marginBottom: '24px' }}
              >
                查看股东
              </Button>
            </div>
          </div>

          {lossInfo && (
            <Alert
              message="止损信息"
              description={
                <div>
                  <p>最大亏损：<strong style={{ color: '#f5222d' }}>{lossInfo.loss.toFixed(2)}元</strong></p>
                  <p>亏损比例：<strong style={{ color: '#f5222d' }}>{lossInfo.percentage.toFixed(2)}%</strong></p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="strategy"
              label="投资策略"
              style={{ flex: 1 }}
            >
              <Select placeholder="请选择投资策略">
                {STRATEGY_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea rows={3} placeholder="可选备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default StockPositionForm; 