import React, { useState } from 'react';
import { Button, Upload, message, Modal, Space, Tooltip, Alert, Descriptions } from 'antd';
import { 
  ImportOutlined, 
  ExportOutlined, 
  UploadOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { exportAllData, importData, clearAllData } from '../services/investService';

interface DataImportExportProps {
  onDataChange?: () => void;
}

const DataImportExport: React.FC<DataImportExportProps> = ({ onDataChange }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // 导出数据
  const handleExport = () => {
    try {
      const jsonData = exportAllData();
      const dataStr = JSON.stringify(jsonData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `股票投资数据_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      messageApi.success(`数据导出成功，包含 ${jsonData.currentPositions.length} 个持仓，${jsonData.closedPositions.length} 个清仓记录`);
    } catch (error) {
      console.error('导出数据失败:', error);
      messageApi.error('导出数据失败');
    }
  };

  // 预览导入数据
  const handlePreview = () => {
    const currentData = exportAllData();
    setPreviewData(currentData);
    setIsPreviewModalVisible(true);
  };

  // 清除所有数据
  const handleClearAllData = () => {
    modal.confirm({
      title: '确认清除所有数据',
      content: (
        <div>
          <Alert
            message="警告"
            description="此操作将永久删除所有投资数据，包括持仓记录、清仓记录、资金记录等，且无法恢复！"
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <p>请确认您已经备份了重要数据，或者确实要清除所有数据。</p>
        </div>
      ),
      okText: '确认清除',
      okType: 'danger',
      cancelText: '取消',
      width: 500,
      onOk() {
        try {
          clearAllData();
          messageApi.success('所有数据已清除');
          
          // 触发父组件刷新
          if (onDataChange) {
            onDataChange();
          }
        } catch (error) {
          console.error('清除数据失败:', error);
          messageApi.error('清除数据失败');
        }
      }
    });
  };

  // 处理文件上传前的检查
  const beforeUpload = (file: File) => {
    const isJSON = file.type === 'application/json' || file.name.endsWith('.json');
    if (!isJSON) {
      messageApi.error('只能上传JSON文件!');
      return Upload.LIST_IGNORE;
    }
    
    const isLt50M = file.size / 1024 / 1024 < 50;
    if (!isLt50M) {
      messageApi.error('文件大小不能超过50MB');
      return Upload.LIST_IGNORE;
    }
    
    setFileList([file]);
    return false; // 阻止自动上传
  };

  // 处理文件导入
  const handleImport = async () => {
    if (fileList.length === 0) {
      messageApi.warning('请选择要导入的JSON文件');
      return;
    }
    
    const file = fileList[0];
    setUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          
          // 简单的数据格式验证
          if (!jsonData || typeof jsonData !== 'object') {
            throw new Error('文件格式不正确');
          }
          
          const result = importData(jsonData);
           
           if (result.success) {
             messageApi.success(`数据导入成功: ${result.message}`);
             setIsImportModalVisible(false);
             setFileList([]);
             
             // 触发父组件刷新
             if (onDataChange) {
               onDataChange();
             }
           } else {
             messageApi.error(`数据导入失败: ${result.message}`);
          }
        } catch (error) {
          console.error('解析JSON文件失败:', error);
          messageApi.error('解析JSON文件失败，请检查文件格式是否正确');
        } finally {
          setUploading(false);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('读取文件失败:', error);
      messageApi.error('读取文件失败');
      setUploading(false);
    }
  };

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <Space>
        <Tooltip title="导出所有投资数据到JSON文件">
          <Button 
            type="primary"
            icon={<ExportOutlined />} 
            onClick={handleExport}
          >
            导出数据
          </Button>
        </Tooltip>
        <Tooltip title="从JSON文件导入投资数据">
          <Button 
            icon={<ImportOutlined />} 
            onClick={() => setIsImportModalVisible(true)}
          >
            导入数据
          </Button>
        </Tooltip>
        <Tooltip title="查看当前数据内容">
          <Button 
            icon={<FileTextOutlined />} 
            onClick={handlePreview}
          >
            数据预览
          </Button>
        </Tooltip>
        <Tooltip title="清除所有投资数据">
          <Button 
            icon={<DeleteOutlined />} 
            onClick={handleClearAllData}
          >
            清除数据
          </Button>
        </Tooltip>
      </Space>

      {/* 导入数据模态框 */}
      <Modal
        title="导入投资数据"
        open={isImportModalVisible}
        onCancel={() => {
          setIsImportModalVisible(false);
          setFileList([]);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setIsImportModalVisible(false);
              setFileList([]);
            }}
          >
            取消
          </Button>,
          <Button 
            key="import" 
            type="primary" 
            loading={uploading} 
            onClick={handleImport}
            disabled={fileList.length === 0}
          >
            导入
          </Button>
        ]}
        width={600}
      >
        <Alert
          message="导入说明"
          description="导入将直接覆盖现有数据，请确保已备份重要数据。所有现有记录将被导入的数据完全替换。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <QuestionCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <span>支持的数据格式包括：</span>
          </div>
          <ul style={{ marginLeft: 24, color: '#666' }}>
            <li>当前持仓记录 (currentPositions)</li>
            <li>清仓记录 (closedPositions)</li>
            <li>资金记录 (capitalRecords)</li>
            <li>历史价格数据 (historicalPriceData)</li>
            <li>初始资金设置 (initialCapital)</li>
          </ul>
        </div>
        
        <Upload
          beforeUpload={beforeUpload}
          maxCount={1}
          fileList={fileList}
          onRemove={() => setFileList([])}
          accept=".json"
        >
          <Button icon={<UploadOutlined />}>选择JSON文件</Button>
        </Upload>
      </Modal>

      {/* 数据预览模态框 */}
      <Modal
        title="当前数据预览"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {previewData && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="当前持仓数量">
              {previewData.currentPositions?.length || 0} 条
            </Descriptions.Item>
            <Descriptions.Item label="清仓记录数量">
              {previewData.closedPositions?.length || 0} 条
            </Descriptions.Item>
            <Descriptions.Item label="资金记录数量">
              {previewData.capitalRecords?.length || 0} 条
            </Descriptions.Item>
            <Descriptions.Item label="历史价格数据">
              {previewData.historicalPriceData ? Object.keys(previewData.historicalPriceData).length : 0} 个股票
            </Descriptions.Item>
            <Descriptions.Item label="初始资金">
              {previewData.initialCapital || 0} 元
            </Descriptions.Item>
            <Descriptions.Item label="数据版本">
              {previewData.version || '1.0'}
            </Descriptions.Item>
            <Descriptions.Item label="导出时间">
              {previewData.exportTime ? new Date(previewData.exportTime).toLocaleString() : '未知'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default DataImportExport; 