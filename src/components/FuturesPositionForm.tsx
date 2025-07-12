import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, message } from 'antd';
import { addNewFuturesPosition, updateFuturesPosition } from '../services/investService';
import { STRATEGY_OPTIONS } from '../types';
import type { FuturesRecord } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface FuturesPositionFormProps {
  visible: boolean;
  record: FuturesRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

const FuturesPositionForm: React.FC<FuturesPositionFormProps> = ({
  visible,
  record,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 当弹窗打开时，填充表单数据
  useEffect(() => {
    if (visible && record) {
      form.setFieldsValue({
        contractName: record.contractName,
        contractCode: record.contractCode,
        direction: record.direction,
        openPrice: record.openPrice,
        lots: record.lots,
        multiplier: record.multiplier,
        marginRate: record.marginRate,
        currentPrice: record.currentPrice,
        stopLossPrice: record.stopLossPrice,
        openDate: record.openDate ? dayjs(record.openDate) : null,
        remark: record.remark,
        strategy: record.strategy
      });
    } else if (visible && !record) {
      // 新建时重置表单
      form.resetFields();
      // 设置默认值
      form.setFieldsValue({
        direction: 'long',
        marginRate: 10,
        openDate: dayjs(),
        multiplier: 300
      });
    }
  }, [visible, record, form]);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const formData = {
        ...values,
        openDate: values.openDate ? values.openDate.format('YYYY-MM-DD') : ''
      };

      if (record) {
        // 编辑模式
        const updatedRecord: FuturesRecord = {
          ...record,
          ...formData,
          // 重新计算保证金和盈亏
          margin: formData.openPrice * formData.lots * formData.multiplier * (formData.marginRate / 100),
          currentProfit: formData.direction === 'long'
            ? (formData.currentPrice - formData.openPrice) * formData.lots * formData.multiplier
            : (formData.openPrice - formData.currentPrice) * formData.lots * formData.multiplier,
          maxLoss: Math.abs(formData.direction === 'long' 
            ? (formData.openPrice - formData.stopLossPrice) * formData.lots * formData.multiplier
            : (formData.stopLossPrice - formData.openPrice) * formData.lots * formData.multiplier),
          lossPercentage: (Math.abs(formData.direction === 'long' 
            ? (formData.openPrice - formData.stopLossPrice) * formData.lots * formData.multiplier
            : (formData.stopLossPrice - formData.openPrice) * formData.lots * formData.multiplier) / 
            (formData.openPrice * formData.lots * formData.multiplier * (formData.marginRate / 100))) * 100
        };

        updateFuturesPosition(updatedRecord);
        messageApi.success('期货持仓更新成功');
      } else {
        // 新建模式
        addNewFuturesPosition(
          formData.contractName,
          formData.contractCode,
          formData.direction,
          formData.openPrice,
          formData.lots,
          formData.multiplier,
          formData.marginRate,
          formData.currentPrice,
          formData.stopLossPrice,
          formData.openDate,
          formData.remark || '',
          formData.strategy || ''
        );
        messageApi.success('期货持仓添加成功');
      }
      
      onSuccess();
    } catch (error) {
      console.error('表单提交失败:', error);
      messageApi.error('操作失败');
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={record ? '编辑期货持仓' : '添加期货持仓'}
        open={visible}
        onCancel={onClose}
        onOk={handleSubmit}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            direction: 'long',
            marginRate: 10,
            multiplier: 300
          }}
        >
          <Form.Item
            name="contractName"
            label="合约名称"
            rules={[{ required: true, message: '请输入合约名称' }]}
          >
            <Input placeholder="如：沪深300指数期货" />
          </Form.Item>

          <Form.Item
            name="contractCode"
            label="合约代码"
            rules={[{ required: true, message: '请输入合约代码' }]}
          >
            <Input placeholder="如：IF2024" />
          </Form.Item>

          <Form.Item
            name="direction"
            label="交易方向"
            rules={[{ required: true, message: '请选择交易方向' }]}
          >
            <Select>
              <Option value="long">做多</Option>
              <Option value="short">做空</Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="openPrice"
              label="开仓价格"
              rules={[{ required: true, message: '请输入开仓价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="开仓价格"
              />
            </Form.Item>

            <Form.Item
              name="currentPrice"
              label="当前价格"
              rules={[{ required: true, message: '请输入当前价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="当前价格"
              />
            </Form.Item>

            <Form.Item
              name="stopLossPrice"
              label="止损价格"
              rules={[{ required: true, message: '请输入止损价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="止损价格"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="lots"
              label="手数"
              rules={[{ required: true, message: '请输入手数' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="手数"
              />
            </Form.Item>

            <Form.Item
              name="multiplier"
              label="合约乘数"
              rules={[{ required: true, message: '请输入合约乘数' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="如：300"
              />
            </Form.Item>

            <Form.Item
              name="marginRate"
              label="保证金率(%)"
              rules={[{ required: true, message: '请输入保证金率' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={100}
                step={0.1}
                style={{ width: '100%' }}
                placeholder="如：10"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="openDate"
              label="开仓日期"
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

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

export default FuturesPositionForm; 