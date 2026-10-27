import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  apiGetAdminStats, 
  apiGetAdminUsers, 
  apiUpdateUserStatus 
} from '../services/api';
import UserDetailModal from '../components/UserDetailModal';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Sparkles, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  LogOut, 
  Eye, 
  Shield, 
  TrendingUp, 
  Compass, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  LayoutDashboard,
  Target
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Stats & Charts
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users Table
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination, Filtering & Sorting
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // User details modal
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Active sidebar tab
  const [activeNav, setActiveNav] = useState('users'); // 'overview' | 'users'

  // Load stats
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await apiGetAdminStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load users table
  const loadUsers = async () => {
    setUsersLoading(true);
    setError('');
    try {
      const res = await apiGetAdminUsers({
        search,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        per_page: perPage
      });

      if (res.success) {
        setUsers(res.users);
        setTotalCount(res.total);
        setTotalPages(res.total_pages || 1);
      } else {
        setError(res.error || 'Failed to fetch users list.');
      }
    } catch (err) {
      setError('Error communicating with server.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [search, sortBy, sortDir, page, perPage]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleToggleStatus = async (userItem) => {
    const nextStatus = userItem.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await apiUpdateUserStatus(userItem.id, nextStatus);
      if (res.success) {
        setUsers(users.map(u => u.id === userItem.id ? { ...u, status: nextStatus } : u));
        loadStats(); // refresh stats count
      } else {
        alert(res.error || 'Failed to update status.');
      }
    } catch (err) {
      alert('Error updating user status.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  // Calculate highest chart value for SVG scaling
  const maxRegValue = stats?.registration_chart 
    ? Math.max(...stats.registration_chart.map(d => Math.max(d.registrations, d.recommendations)), 5) 
    : 10;

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div>
          {/* Admin Header Brand */}
          <div className="admin-sidebar-brand">
            <div className="admin-brand-icon">
              <Shield size={20} />
            </div>
            <div>
              <div className="admin-brand-text">Admin Console</div>
              <div className="admin-brand-sub">SkillsAI Platform</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="admin-nav">
            <button
              className={`admin-nav-item ${activeNav === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveNav('overview')}
            >
              <LayoutDashboard size={18} />
              Platform Overview
            </button>

            <button
              className={`admin-nav-item ${activeNav === 'users' ? 'active' : ''}`}
              onClick={() => setActiveNav('users')}
            >
              <Users size={18} />
              User Management
            </button>

            <Link to="/" className="admin-nav-item" style={{ marginTop: '12px' }}>
              <Compass size={18} />
              Learner Portal
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer User Info & Logout */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div className="admin-user-name" title={user?.full_name}>
                {user?.full_name || 'Administrator'}
              </div>
              <div className="admin-user-email" title={user?.email}>
                {user?.email}
              </div>
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleLogout}
            className="admin-logout-btn"
            title="Log out of Administrator Console"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Top Navbar */}
        <header className="admin-topbar">
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
              {activeNav === 'overview' ? 'Platform Analytics & Summary' : 'User Accounts & Access Management'}
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#64748B' }}>
              Monitor system activity, learner progress, and verified user registrations.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn-secondary"
              onClick={() => { loadStats(); loadUsers(); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Refresh Data
            </button>
          </div>
        </header>

        {/* Summary Statistics Cards */}
        <div className="admin-stats-grid">
          {/* Card 1: Total Registered Users */}
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
              <Users size={22} />
            </div>
            <div className="admin-stat-content">
              <span className="admin-stat-label">Total Registered Users</span>
              <div className="admin-stat-value">
                {statsLoading ? <Loader2 className="animate-spin" size={20} /> : stats?.total_users ?? 0}
              </div>
              <span className="admin-stat-hint">All accounts across platform</span>
            </div>
          </div>

          {/* Card 2: Total Active Users */}
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
              <UserCheck size={22} />
            </div>
            <div className="admin-stat-content">
              <span className="admin-stat-label">Active Users</span>
              <div className="admin-stat-value" style={{ color: '#059669' }}>
                {statsLoading ? <Loader2 className="animate-spin" size={20} /> : stats?.active_users ?? 0}
              </div>
              <span className="admin-stat-hint">Accounts in active status</span>
            </div>
          </div>

          {/* Card 3: New Registrations (7 Days) */}
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <UserPlus size={22} />
            </div>
            <div className="admin-stat-content">
              <span className="admin-stat-label">New Registrations</span>
              <div className="admin-stat-value" style={{ color: '#2563EB' }}>
                {statsLoading ? <Loader2 className="animate-spin" size={20} /> : stats?.new_registrations ?? 0}
              </div>
              <span className="admin-stat-hint">Joined in the last 7 days</span>
            </div>
          </div>

          {/* Card 4: Total Skill Recommendations */}
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
              <Sparkles size={22} />
            </div>
            <div className="admin-stat-content">
              <span className="admin-stat-label">Skill Recommendations</span>
              <div className="admin-stat-value" style={{ color: '#D97706' }}>
                {statsLoading ? <Loader2 className="animate-spin" size={20} /> : stats?.total_recommendations ?? 0}
              </div>
              <span className="admin-stat-hint">Roadmaps & gaps generated</span>
            </div>
          </div>
        </div>

        {/* OVERVIEW TAB: CHARTS & INSIGHTS */}
        {activeNav === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Chart 1: Registration & Assessment Activity Timeline */}
            <div className="ui-card">
              <div className="ui-card-header">
                <div className="ui-card-title">
                  <TrendingUp size={18} color="#4F46E5" />
                  Recent Activity (Last 7 Days)
                </div>
              </div>
              <div className="ui-card-body">
                {stats?.registration_chart && (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', background: '#4F46E5', borderRadius: '2px' }} />
                        New Users
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', background: '#F59E0B', borderRadius: '2px' }} />
                        Skill Assessments
                      </span>
                    </div>

                    {/* Visual Bar Chart */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
                      {stats.registration_chart.map((day, idx) => {
                        const userBarHeight = Math.max(6, (day.registrations / maxRegValue) * 120);
                        const recBarHeight = Math.max(6, (day.recommendations / maxRegValue) * 120);
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                              <div
                                style={{
                                  width: '14px',
                                  height: `${userBarHeight}px`,
                                  background: '#4F46E5',
                                  borderRadius: '3px 3px 0 0',
                                  transition: 'height 0.3s ease'
                                }}
                                title={`${day.registrations} user registrations on ${day.label}`}
                              />
                              <div
                                style={{
                                  width: '14px',
                                  height: `${recBarHeight}px`,
                                  background: '#F59E0B',
                                  borderRadius: '3px 3px 0 0',
                                  transition: 'height 0.3s ease'
                                }}
                                title={`${day.recommendations} assessments on ${day.label}`}
                              />
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '8px' }}>
                              {day.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Popular Target Career Goals */}
            <div className="ui-card">
              <div className="ui-card-header">
                <div className="ui-card-title">
                  <Target size={18} color="#4F46E5" />
                  Popular Learner Career Goals
                </div>
              </div>
              <div className="ui-card-body">
                {stats?.top_careers && stats.top_careers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {stats.top_careers.map((c, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{c.career_goal}</span>
                          <span style={{ color: '#64748B', fontWeight: 700 }}>{c.count} learners</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${Math.min(100, (c.count / (stats.total_users || 1)) * 100)}%`,
                              background: '#4F46E5',
                              borderRadius: '4px'
                            }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94A3B8', fontSize: '0.88rem', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                    No career goals logged yet by users.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* USERS TABLE SECTION */}
        <div className="ui-card">
          <div className="ui-card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
            <div className="ui-card-title">
              <Users size={18} color="#4F46E5" />
              Registered Users Directory ({totalCount})
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '380px' }}>
              <div className="auth-input-wrapper" style={{ margin: 0, width: '100%' }}>
                <Search size={16} className="auth-input-icon" />
                <input
                  type="text"
                  className="form-input auth-input"
                  style={{ padding: '7px 12px 7px 36px', fontSize: '0.86rem' }}
                  placeholder="Search by full name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="ui-card-body" style={{ padding: 0 }}>
            {error && (
              <div className="alert alert-danger" style={{ margin: '16px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Table Container */}
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                      <div className="th-content">
                        User ID <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>
                      <div className="th-content">
                        Full Name <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                      <div className="th-content">
                        Email Address <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th>Role</th>
                    <th>Target Goal</th>
                    <th>Progress</th>
                    <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                      <div className="th-content">
                        Registration Date <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('last_login')} style={{ cursor: 'pointer' }}>
                      <div className="th-content">
                        Last Login <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '50px 20px' }}>
                        <Loader2 className="animate-spin" size={32} color="#4F46E5" style={{ margin: '0 auto 10px auto' }} />
                        <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Loading users directory...</span>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
                        <Users size={40} style={{ margin: '0 auto 10px auto', color: '#CBD5E1' }} />
                        <h4 style={{ color: '#0F172A', marginBottom: '4px' }}>No Users Found</h4>
                        <p style={{ fontSize: '0.84rem' }}>
                          {search ? `No accounts matched your search for "${search}".` : "No registered users in the database yet."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        {/* User ID */}
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#4F46E5' }}>
                          #{u.id}
                        </td>

                        {/* Full Name */}
                        <td>
                          <strong style={{ color: '#0F172A' }}>{u.full_name}</strong>
                        </td>

                        {/* Email */}
                        <td style={{ color: '#475569' }}>
                          {u.email}
                        </td>

                        {/* Role */}
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>

                        {/* Career Goal */}
                        <td style={{ fontSize: '0.82rem', color: '#334155' }}>
                          {u.career_goal || <span style={{ color: '#94A3B8' }}>None</span>}
                        </td>

                        {/* Progress */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '50px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  height: '100%', 
                                  width: `${u.progress_percentage || 0}%`, 
                                  background: '#10B981' 
                                }} 
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                              {u.progress_percentage || 0}%
                            </span>
                          </div>
                        </td>

                        {/* Registration Date */}
                        <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Last Login */}
                        <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                            {u.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                              onClick={() => setSelectedUserId(u.id)}
                              title="View full user profile, career goal & progress"
                            >
                              <Eye size={13} /> View
                            </button>

                            {u.role !== 'admin' && (
                              <button
                                type="button"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #E2E8F0',
                                  color: u.status === 'active' ? '#EF4444' : '#10B981',
                                  background: '#FFFFFF'
                                }}
                                onClick={() => handleToggleStatus(u)}
                                title={u.status === 'active' ? "Deactivate account" : "Activate account"}
                              >
                                {u.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="admin-pagination">
              <div style={{ fontSize: '0.84rem', color: '#64748B' }}>
                Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total users)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 12px' }}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 12px' }}
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* User Details Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={() => {
            loadUsers();
            loadStats();
          }}
        />
      )}
    </div>
  );
}
