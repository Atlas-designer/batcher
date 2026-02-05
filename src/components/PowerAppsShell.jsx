import { useState } from 'react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '\u2302', tab: 'process' },
  { id: 'recent', label: 'Recent', icon: '\u25F7', tab: null, decorative: true, expandable: true },
  { id: 'pinned', label: 'Pinned', icon: '\u2302', tab: null, decorative: true, expandable: true },
  { id: 'divider1', divider: true },
  { id: 'newgroup', label: 'My Work', isHeader: true },
  { id: 'accounts', label: 'Accounts', icon: '\u25A3', tab: 'process' },
  { id: 'contacts', label: 'Contacts', icon: '\u25CB', tab: 'manage' },
  { id: 'activities', label: 'Activities', icon: '\u2611', tab: 'duplicates' },
  { id: 'cases', label: 'Cases', icon: '\u2609', tab: 'entity' },
  { id: 'knowledge', label: 'Knowledge Articles', icon: '\u2630', tab: 'adam' },
  { id: 'reports', label: 'Reports', icon: '\u25A6', tab: 'info' },
  { id: 'divider2', divider: true },
  { id: 'c2wgroup', label: 'Cycle 2 Work', isHeader: true },
  { id: 'newapps', label: 'New Applications', icon: '\u2795', tab: null, decorative: true },
  { id: 'issuedlocs', label: 'Issued LOCs', icon: '\u2713', tab: null, decorative: true },
  { id: 'locpurchases', label: 'LOC Purchases', icon: '\u20A4', tab: null, decorative: true },
  { id: 'bpuploads', label: 'BP File Uploads', icon: '\u2191', tab: null, decorative: true },
];

const PAGE_TITLES = {
  'process': 'Accounts',
  'manage': 'Contacts',
  'duplicates': 'Activities',
  'entity': 'Cases',
  'adam': 'Knowledge Articles',
  'info': 'Reports & Analytics'
};

const PAGE_SUBTITLES = {
  'process': 'Account \u00B7 Active Accounts',
  'manage': 'Contact \u00B7 All Contacts',
  'duplicates': 'Activity \u00B7 All Activities',
  'entity': 'Case \u00B7 Active Cases',
  'adam': 'Article \u00B7 Published',
  'info': 'Report \u00B7 All Reports'
};

const TOOLBAR_ACTIONS = [
  { label: 'New' },
  { label: 'Deactivate' },
  { label: 'Delete' },
  { label: 'Detect Duplicates' },
  { label: 'Email a Link' },
  { label: 'Run Report' },
  { label: 'Excel Templates' },
];

export default function PowerAppsShell({ children, currentTab, onTabChange, onToggleOff }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="pa-shell">
      {/* Top Toolbar - Power Apps style */}
      <div className="pa-toolbar">
        <div className="pa-toolbar-left">
          <button
            className="pa-toolbar-hamburger"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            &#9776;
          </button>
          <span className="pa-toolbar-waffle">&#9783;</span>
          <span className="pa-toolbar-logo">Power Apps</span>
        </div>
        <div className="pa-toolbar-center">
          <div className="pa-toolbar-search" onClick={onToggleOff} title="Click to exit incognito">
            <span className="pa-toolbar-search-icon">&#x1F50D;</span>
            <span className="pa-toolbar-search-text">Search</span>
            <span className="pa-toolbar-search-close">&times;</span>
          </div>
        </div>
        <div className="pa-toolbar-right">
          <button className="pa-toolbar-icon-btn" title="Settings">&#x2699;</button>
          <button className="pa-toolbar-icon-btn" title="Help">?</button>
          <div className="pa-toolbar-avatar">AU</div>
        </div>
      </div>

      {/* Command Bar */}
      <div className="pa-secondary-toolbar">
        <div className="pa-cmd-left">
          {TOOLBAR_ACTIONS.map(action => (
            <button key={action.label} className="pa-sec-btn" title={action.label}>
              {action.label}
            </button>
          ))}
          <button className="pa-sec-btn pa-sec-btn-more">&#x22EF;</button>
        </div>
        <div className="pa-cmd-right">
          <button className="pa-sec-btn">&#x1F50D; Search this view</button>
          <button className="pa-sec-btn pa-sec-btn-funnel">&#x25BD;</button>
        </div>
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
                    {item.expandable && <span className="pa-sidebar-chevron">&#8964;</span>}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Main Content */}
        <div className="pa-main">
          {/* Page title bar */}
          <div className="pa-page-title-bar">
            <h2 className="pa-page-title">
              {PAGE_TITLES[currentTab] || 'Dashboard'}
            </h2>
          </div>

          {/* View selector + tabs (Summary / Details / Related) */}
          <div className="pa-view-bar">
            <div className="pa-view-left">
              <span className="pa-view-dropdown">
                {PAGE_SUBTITLES[currentTab] || 'My Active'} &#9662;
              </span>
            </div>
            <div className="pa-view-tabs">
              <button className="pa-tab pa-tab-active">Summary</button>
              <button className="pa-tab">Details</button>
              <button className="pa-tab">Related &#9662;</button>
            </div>
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
