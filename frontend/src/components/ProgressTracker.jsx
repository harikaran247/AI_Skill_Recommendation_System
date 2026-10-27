import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchProfiles, 
  fetchProfileProgress, 
  updateSkillProgress, 
  deleteProfile 
} from '../services/api';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2, 
  User, 
  Award, 
  FolderCheck, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';

export default function ProgressTracker({ selectedProfileId, onProfileSelect }) {
  const [profiles, setProfiles] = useState([]);
  const [currentProfileId, setCurrentProfileId] = useState(selectedProfileId || null);
  const [progressData, setProgressData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetchProfiles();
      if (res.success && res.profiles) {
        setProfiles(res.profiles);
        if (!currentProfileId && res.profiles.length > 0) {
          setCurrentProfileId(res.profiles[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading profiles:", err);
    }
  }, [currentProfileId]);

  const loadProgress = useCallback(async (id, isInitial = false) => {
    if (!id) return;
    if (isInitial) {
      setInitialLoading(true);
    }
    try {
      const res = await fetchProfileProgress(id);
      if (res.success) {
        setProgressData(res);
      }
    } catch (err) {
      console.error("Error loading progress:", err);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (selectedProfileId) {
      setCurrentProfileId(selectedProfileId);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    if (currentProfileId) {
      loadProgress(currentProfileId, true);
    }
  }, [currentProfileId, loadProgress]);

  // Optimistic instant update for skill completion checkbox
  const handleStatusChange = async (item, newStatus) => {
    const isCompleted = newStatus === 'completed';
    const newProjectCompleted = isCompleted ? (item.project_completed || 1) : item.project_completed;

    // 1. Optimistic UI update without reloading
    setProgressData(prev => {
      if (!prev || !prev.skills_progress) return prev;
      const updatedList = prev.skills_progress.map(p => {
        if (p.id === item.id) {
          return {
            ...p,
            status: newStatus,
            project_completed: newProjectCompleted
          };
        }
        return p;
      });

      const total_skills_tracked = updatedList.length;
      const completed = updatedList.filter(p => p.status === 'completed').length;
      const in_progress = updatedList.filter(p => p.status === 'in_progress').length;
      const progress_percentage = total_skills_tracked > 0 
        ? Math.round((completed / total_skills_tracked) * 1000) / 10 
        : 0.0;

      return {
        ...prev,
        skills_progress: updatedList,
        metrics: {
          total_skills_tracked,
          completed,
          in_progress,
          not_started: total_skills_tracked - (completed + in_progress),
          progress_percentage
        }
      };
    });

    setUpdatingId(item.id);

    try {
      await updateSkillProgress(item.id, {
        status: newStatus,
        project_completed: newProjectCompleted
      });
      // Silently refresh progress without unmounting
      await loadProgress(currentProfileId, false);
    } catch (err) {
      console.error("Error updating progress:", err);
      await loadProgress(currentProfileId, false);
    } finally {
      setUpdatingId(null);
    }
  };

  // Optimistic instant update for project toggle
  const handleProjectToggle = async (item, isChecked) => {
    setProgressData(prev => {
      if (!prev || !prev.skills_progress) return prev;
      const updatedList = prev.skills_progress.map(p => {
        if (p.id === item.id) {
          return { ...p, project_completed: isChecked ? 1 : 0 };
        }
        return p;
      });
      return { ...prev, skills_progress: updatedList };
    });

    setUpdatingId(item.id);

    try {
      await updateSkillProgress(item.id, {
        status: item.status,
        project_completed: isChecked ? 1 : 0
      });
      await loadProgress(currentProfileId, false);
    } catch (err) {
      console.error("Error updating project toggle:", err);
      await loadProgress(currentProfileId, false);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this profile and all its tracked progress?")) {
      await deleteProfile(id);
      setCurrentProfileId(null);
      setProgressData(null);
      await loadProfiles();
    }
  };

  return (
    <div className="ui-card">
      <div className="ui-card-header">
        <div className="ui-card-title">
          <Award size={20} color="#4F46E5" />
          Skill-Completion Tracking & Progress Dashboard
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            loadProfiles();
            if (currentProfileId) loadProgress(currentProfileId, false);
          }}
          title="Refresh Data"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="ui-card-body">
        {profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
            <User size={48} style={{ margin: '0 auto 12px auto', color: '#CBD5E1' }} />
            <h3 style={{ color: '#0F172A', marginBottom: '6px' }}>No Saved Profiles Yet</h3>
            <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto' }}>
              Generate recommendations from the first tab and click <strong>"Save Profile & Track Progress"</strong> to start tracking your completion journey!
            </p>
          </div>
        ) : (
          <div>
            {/* Profile Selector Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 700 }}>Select Saved Learner Profile:</label>
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '220px' }}
                  value={currentProfileId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setCurrentProfileId(id);
                    if (onProfileSelect) onProfileSelect(id);
                  }}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.career_goal} ({p.match_percentage}%)
                    </option>
                  ))}
                </select>
              </div>

              {currentProfileId && (
                <button
                  type="button"
                  onClick={() => handleDelete(currentProfileId)}
                  style={{ color: '#EF4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                >
                  <Trash2 size={14} /> Delete Profile
                </button>
              )}
            </div>

            {initialLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin" size={32} color="#4F46E5" style={{ margin: '0 auto' }} />
              </div>
            ) : progressData ? (
              <div>
                {/* Progress Overview Card */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 24px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                        {progressData.profile.name}
                      </h2>
                      <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                        Target: <strong>{progressData.profile.career_goal}</strong> &bull; Initial Match: {progressData.profile.match_percentage}%
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                        {progressData.metrics.progress_percentage}%
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                        Overall Progress
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${progressData.metrics.progress_percentage}%`,
                        background: 'linear-gradient(90deg, #10B981, #059669)',
                        borderRadius: '999px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="count-badge acquired">
                      <CheckCircle2 size={13} /> {progressData.metrics.completed} Completed
                    </span>
                    <span className="count-badge total">
                      <Clock size={13} /> {progressData.metrics.in_progress} In Progress
                    </span>
                    <span className="count-badge missing">
                      <Circle size={13} /> {progressData.metrics.not_started} Not Started
                    </span>
                  </div>
                </div>

                {/* Skills Interactive Checklist */}
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '14px', color: '#0F172A' }}>
                  Skills & Suggested Projects Checklist
                </h3>

                <div className="progress-list">
                  {progressData.skills_progress.map((item) => (
                    <div
                      key={item.id}
                      className={`progress-item ${item.status === 'completed' ? 'completed' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        {/* Real Controlled Checkbox for Marking Completed */}
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                          <input
                            type="checkbox"
                            checked={item.status === 'completed'}
                            disabled={updatingId === item.id}
                            onChange={(e) => {
                              const next = e.target.checked ? 'completed' : 'not_started';
                              handleStatusChange(item, next);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#10B981'
                            }}
                            title={item.status === 'completed' ? "Mark as not completed" : "Mark as completed"}
                          />
                        </label>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.94rem', color: '#0F172A', textDecoration: item.status === 'completed' ? 'line-through' : 'none' }}>
                              {item.skill_name}
                            </strong>
                            <span className={`priority-badge ${item.priority ? item.priority.toLowerCase() : 'high'}`}>
                              {item.priority || 'High'}
                            </span>
                          </div>

                          {item.suggested_project && (
                            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FolderCheck size={13} color="#4F46E5" />
                              <span>Project: <strong>{item.suggested_project}</strong></span>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px', cursor: 'pointer', color: item.project_completed ? '#059669' : '#64748B' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.project_completed)}
                                  disabled={updatingId === item.id}
                                  onChange={(e) => handleProjectToggle(item, e.target.checked)}
                                  style={{ accentColor: '#10B981' }}
                                />
                                Project Built
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Selector Dropdown */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          className="form-select"
                          style={{ padding: '5px 10px', fontSize: '0.78rem', width: 'auto' }}
                          value={item.status}
                          disabled={updatingId === item.id}
                          onChange={(e) => handleStatusChange(item, e.target.value)}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
