import { useState } from 'react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '⌂', tab: 'process' },
  { id: 'recent', label: 'Recent', icon: '⏱', tab: null, decorative: true, expandable: true },
  { id: 'pinned', label: 'Pinned', icon: '📌', tab: null, decorative: true, expandable: true },
  { id: 'divider1', divider: true },
  { id: 'newgroup', label: 'New Group', isHeader: true },
  { id: 'accounts', label: 'Accounts', icon: '🏢', tab: 'process' },
  { id: 'contacts', label: 'Contacts', icon: '👤', tab: 'manage' },
  { id: 'activities', label: 'Activities', icon: '📋', tab: 'duplicates' },
  { id: 'cases', label: 'Cases', icon: '🔍', tab: 'entity' },
  { id: 'knowledge', label: 'Knowledge Articles', icon: '📖', tab: 'adam' },
  { id: 'reports', label: 'Reports', icon: '📊', tab: 'info' },
];

const PAGE_TITLES = {
  'process': 'Account: Active Accounts',
  'manage': 'Contacts: All Contacts',
  'duplicates': 'Activities: All Activities',
  'entity': 'Cases: Active Cases',
  'adam': 'Knowledge Articles',
  'info': 'Reports & Analytics'
};

const TOOLBAR_ACTIONS = [
  { label: 'Save', icon: '💾' },
  { label: 'Save & Close', icon: '📄' },
  { label: 'New', icon: '➕' },
  { label: 'Deactivate', icon: '⊘' },
  { label: 'Connect', icon: '🔗' },
  { label: 'Assign', icon: '👤' },
  { label: 'Delete', icon: '🗑' },
  { label: 'Refresh', icon: '↻' },
];

export default function PowerAppsShell({ children, currentTab, onTabChange, onToggleOff }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="pa-shell">
      {/* Top Toolbar */}
      <div className="pa-toolbar">
        <div className="pa-toolbar-left">
          <button
            className="pa-toolbar-hamburger"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            ☰
          </button>
          <span className="pa-toolbar-logo">⬡ Power Apps</span>
          <span className="pa-toolbar-app-name">Top Customers App</span>
        </div>
        <div className="pa-toolbar-center">
          <span className="pa-toolbar-toggle" onClick={onToggleOff} title="New look">
            New look
            <span className="pa-toggle-switch">
              <span className="pa-toggle-knob" />
            </span>
          </span>
        </div>
        <div className="pa-toolbar-right">
          <button className="pa-toolbar-icon-btn" title="Search">🔍</button>
          <button className="pa-toolbar-icon-btn" title="Add">➕</button>
          <button className="pa-toolbar-icon-btn" title="Filter">⚙</button>
          <button className="pa-toolbar-icon-btn" title="Help">❓</button>
          <div className="pa-toolbar-avatar">AU</div>
        </div>
      </div>

      {/* Secondary Toolbar */}
      <div className="pa-secondary-toolbar">
        <button className="pa-sec-btn">← Back</button>
        <button className="pa-sec-btn">📄</button>
        <button className="pa-sec-btn">↗</button>
        {TOOLBAR_ACTIONS.map(action => (
          <button key={action.label} className="pa-sec-btn" title={action.label}>
            {action.icon} {action.label}
          </button>
        ))}
        <button className="pa-sec-btn pa-sec-btn-share">📤 Share</button>
      </div>

      <div className="pa-body">
        {/* Left Sidebar */}
        <nav className={`pa-sidebar ${sidebarCollapsed ? 'pa-sidebar-collapsed' : ''}`}>
          {NAV_ITEMS.map(item => {
            if (item.divider) {
              return <div key={item.id} className="pa-sidebar-divider" />;
            }
            if (item.isHeader) {
              return (
                <div key={item.id} className="pa-sidebar-header">
                  {!sidebarCollapsed && item.label}
                </div>
              );
            }
            const isActive = item.tab === currentTab && !item.decorative;
            return (
              <button
                key={item.id}
                className={`pa-sidebar-item ${isActive ? 'pa-sidebar-item-active' : ''} ${item.decorative ? 'pa-sidebar-item-decorative' : ''}`}
                onClick={() => {
                  if (item.tab && !item.decorative) {
                    onTabChange(item.tab);
                  }
                }}
              >
                <span className="pa-sidebar-icon">{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="pa-sidebar-label">{item.label}</span>
                    {item.expandable && <span className="pa-sidebar-chevron">⌄</span>}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Main Content */}
        <div className="pa-main">
          {/* Page header bar */}
          <div className="pa-content-header">
            <div className="pa-content-header-left">
              <div className="pa-record-icon">
                {currentTab === 'process' ? 'AD' : currentTab === 'manage' ? 'CT' : '●'}
              </div>
              <div>
                <h2 className="pa-content-title">
                  {PAGE_TITLES[currentTab] || 'Dashboard'}
                </h2>
                <div className="pa-content-subtitle">
                  Account · Account ⌄
                </div>
              </div>
            </div>
            <div className="pa-content-header-right">
              <span className="pa-header-stat">$10,000.00<br /><small>Annual Revenue</small></span>
              <span className="pa-header-stat">6,200<br /><small>Number of Employees</small></span>
            </div>
          </div>

          {/* Tabs bar (Summary / Details / Related) */}
          <div className="pa-tab-bar">
            <button className="pa-tab pa-tab-active">Summary</button>
            <button className="pa-tab">Details</button>
            <button className="pa-tab">Related ⌄</button>
          </div>

          {/* Actual content */}
          <div className="pa-content-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
