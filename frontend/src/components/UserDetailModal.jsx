import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  Target, 
  Award, 
  CheckCircle2, 
  Circle, 
  FolderCheck, 
  Loader2,
  Shield,
  Activity,
  History
} from 'lucide-react';
import { apiGetAdminUserDetail, apiUpdateUserStatus } from '../services/api';

export default function UserDetailModal({ userId, onClose, onUserUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function fetchDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await apiGetAdminUserDetail(userId);
        if (res.success) {
          setData(res);
        } else {
          setError(res.error || 'Failed to fetch user details.');
        }
      } catch (err) {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [userId]);

  const handleToggleStatus = async () => {
    if (!data?.user) return;
    const nextStatus = data.user.status === 'active' ? 'inactive' : 'active';
    setTogglingStatus(true);
    try {
      const res = await apiUpdateUserStatus(data.user.id, nextStatus);
      if (res.success) {
        setData(prev => ({
          ...prev,
          user: { ...prev.user, status: nextStatus }
        }));
        if (onUserUpdated) onUserUpdated(data.user.id, nextStatus);
      } else {
        alert(res.error || 'Failed to update status.');
      }
    } catch (err) {
      alert('Error updating status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-container" 
        style={{ maxWidth: '780px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={20} />
            </div>
            <div>
              <h2 className="modal-title">User Profile Details</h2>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>User ID: #{userId}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Loader2 className="animate-spin" size={36} color="#4F46E5" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Loading user data...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger">
              <span>{error}</span>
            </div>
          ) : data ? (
            <div>
              {/* Top Banner / Summary */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                        {data.user.full_name}
                      </h3>
                      <span className={`badge ${data.user.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                        {data.user.role.toUpperCase()}
                      </span>
                      <span className={`badge ${data.user.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {data.user.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.84rem', color: '#64748B' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Mail size={14} /> {data.user.email}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> Registered: {data.user.created_at ? new Date(data.user.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} /> Last Login: {data.user.last_login ? new Date(data.user.last_login).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Account Status Button */}
                  {data.user.role !== 'admin' && (
                    <button
                      type="button"
                      className={data.user.status === 'active' ? 'btn-secondary' : 'btn-primary'}
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                      onClick={handleToggleStatus}
                      disabled={togglingStatus}
                    >
                      {togglingStatus ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : data.user.status === 'active' ? (
                        'Deactivate Account'
                      ) : (
                        'Activate Account'
                      )}
                    </button>
                  )}
                </div>

                {/* Progress Metric Bar */}
                <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                      <Target size={16} color="#4F46E5" />
                      Target Goal: <span style={{ color: '#4F46E5' }}>{data.user.career_goal || 'None specified'}</span>
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                      {data.metrics.progress_percentage}% Completed
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${data.metrics.progress_percentage}%`, 
                        background: 'linear-gradient(90deg, #10B981, #059669)',
                        borderRadius: '999px' 
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* Skills Inventory */}
              <div style={{ marginBottom: '22px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={16} color="#4F46E5" />
                  Recorded Skills ({data.skills.length})
                </h4>

                {data.skills.length === 0 ? (
                  <p style={{ fontSize: '0.84rem', color: '#94A3B8', fontStyle: 'italic' }}>
                    No skills registered yet by this user.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {data.skills.map((s) => (
                      <span key={s.id} className="skill-pill">
                        {s.skill_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Learning Progress Checklist */}
              <div style={{ marginBottom: '22px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={16} color="#4F46E5" />
                  Learning Roadmap Tasks ({data.learning_progress.length})
                </h4>

                {data.learning_progress.length === 0 ? (
                  <p style={{ fontSize: '0.84rem', color: '#94A3B8', fontStyle: 'italic' }}>
                    User has not initialized any roadmap milestones yet.
                  </p>
                ) : (
                  <div className="progress-list">
                    {data.learning_progress.map((item) => (
                      <div 
                        key={item.id} 
                        className={`progress-item ${item.status === 'completed' ? 'completed' : ''}`}
                        style={{ padding: '10px 14px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {item.status === 'completed' ? (
                            <CheckCircle2 size={16} color="#10B981" />
                          ) : (
                            <Circle size={16} color="#94A3B8" />
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '0.88rem' }}>{item.skill_name}</strong>
                              <span className={`priority-badge ${item.priority ? item.priority.toLowerCase() : 'high'}`}>
                                {item.priority || 'High'}
                              </span>
                            </div>
                            {item.suggested_project && (
                              <div style={{ fontSize: '0.76rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                <FolderCheck size={12} color="#4F46E5" />
                                Project: {item.suggested_project} {item.project_completed ? ' (Built)' : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className={`badge ${
                          item.status === 'completed' ? 'badge-success' : item.status === 'in_progress' ? 'badge-primary' : 'badge-neutral'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assessment History */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <History size={16} color="#4F46E5" />
                  Recent Recommendation Assessments ({data.assessment_history.length})
                </h4>

                {data.assessment_history.length === 0 ? (
                  <p style={{ fontSize: '0.84rem', color: '#94A3B8', fontStyle: 'italic' }}>
                    No assessments generated yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.assessment_history.map((hist) => (
                      <div 
                        key={hist.id}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.84rem'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0F172A' }}>{hist.career_goal}</strong>
                          <div style={{ color: '#64748B', fontSize: '0.78rem' }}>
                            Next skill: {hist.recommended_next_skill || 'N/A'} &bull; {new Date(hist.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span style={{ fontWeight: 800, color: '#4F46E5', fontFamily: 'var(--font-mono)' }}>
                          {hist.match_percentage}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
