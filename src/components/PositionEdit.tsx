import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, message } from 'antd';
import type { InvestRecord } from '../types';
import { updatePosition } from '../services/investService';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface PositionEditProps {
  visible: boolean;
  record: InvestRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PositionEdit: React.FC<PositionEditProps> = ({
  visible,
  record,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (visible && record) {
      form.setFieldsValue({
        stockName: record.stockName,
        buyPrice: record.buyPrice,
        shares: record.shares,
        stopLossPrice: record.stopLossPrice,
        currentPrice: record.currentPrice,
        buyDate: record.buyDate ? dayjs(record.buyDate) : null,
        remark: record.remark
      });
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    if (!record) return;

    try {
      const values = await form.validateFields();
      
      const updatedRecord: InvestRecord = {
        ...record,
        stockName: values.stockName,
        buyPrice: values.buyPrice,
        shares: values.shares,
        stopLossPrice: values.stopLossPrice,
        currentPrice: values.currentPrice,
        buyDate: values.buyDate ? dayjs(values.buyDate).format('YYYY-MM-DD') : record.buyDate,
        remark: values.remark || '',
        // 重新计算相关字段
        maxLoss: (values.buyPrice - values.stopLossPrice) * values.shares,
        lossPercentage: ((values.buyPrice - values.stopLossPrice) / values.buyPrice) * 100,
        currentProfit: (values.currentPrice - values.buyPrice) * values.shares
      };

      updatePosition(updatedRecord);
      messageApi.success('修改成功');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('修改失败:', error);
      messageApi.error('修改失败');
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="修改持仓"
        open={visible}
        onCancel={onClose}
        onOk={handleSubmit}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="stockName"
            label="股票名称"
            rules={[{ required: true, message: '请输入股票名称' }]}
          >
            <Input placeholder="请输入股票名称" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="buyPrice"
              label="买入价格"
              rules={[{ required: true, message: '请输入买入价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                precision={2}
                placeholder="买入价格"
              />
            </Form.Item>

            <Form.Item
              name="shares"
              label="持股数量"
              rules={[{ required: true, message: '请输入持股数量' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                precision={0}
                placeholder="持股数量"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="stopLossPrice"
              label="止损价格"
              rules={[{ required: true, message: '请输入止损价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                precision={2}
                placeholder="止损价格"
              />
            </Form.Item>

            <Form.Item
              name="currentPrice"
              label="当前价格"
              rules={[{ required: true, message: '请输入当前价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                precision={2}
                placeholder="当前价格"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="buyDate"
            label="买入日期"
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="选择买入日期"
            />
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default PositionEdit; 