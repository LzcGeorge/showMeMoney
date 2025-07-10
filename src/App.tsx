import { useState } from 'react';
import { Layout, Tabs, ConfigProvider, FloatButton, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

// 导入组件
import InvestForm from './components/InvestForm';
import PositionList from './components/PositionList';
import InvestStatistics from './components/InvestStatistics';
import CapitalManager from './components/CapitalManager';
import ClosedPositionList from './components/ClosedPositionList';
import DataImportExport from './components/DataImportExport';

const { Content } = Layout;
const { TabPane } = Tabs;

function App() {
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [activeTab, setActiveTab] = useState('1');

  // 数据变更时触发刷新
  const handleDataChange = () => {
    setRefreshCounter(prev => prev + 1);
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
          colorBgContainer: '#fff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: 14,
        },
        components: {
          Card: {
            colorBgContainer: '#fff',
            borderRadiusLG: 12,
          },
          Table: {
            borderRadius: 12,
          },
          Tabs: {
            cardHeight: 48,
            cardGutter: 8,
          }
        }
      }}
    >
      <Layout className="main-layout">
        <Content className="main-content">
          <div className="app-header">
            <h1>股票投资管理系统</h1>
            <DataImportExport onDataChange={handleDataChange} />
          </div>
          
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            size="large"
            type="card"
            centered
          >
            <TabPane tab="当前持仓" key="1">
              <div className="tab-content">
                <InvestStatistics refresh={refreshCounter} />
                <PositionList onDataChange={handleDataChange} refresh={refreshCounter} />
              </div>
            </TabPane>
            
            <TabPane tab="添加持仓" key="2">
              <div className="tab-content">
                <InvestForm onSuccess={() => {
                  handleDataChange();
                  setActiveTab('1');
                }} />
              </div>
            </TabPane>
            
            <TabPane tab="资金管理" key="3">
              <div className="tab-content">
                <CapitalManager onDataChange={handleDataChange} refresh={refreshCounter} />
              </div>
            </TabPane>
            
            <TabPane tab="清仓记录" key="4">
              <div className="tab-content">
                <ClosedPositionList onDataChange={handleDataChange} refresh={refreshCounter} />
              </div>
            </TabPane>
          </Tabs>
        </Content>
      </Layout>
      
      <FloatButton.BackTop visibilityHeight={300} />
    </ConfigProvider>
  );
}

export default App;
