import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Milestone, 
  FolderGit2, 
  Compass, 
  Save, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Circle,
  Loader2,
  BookOpen,
  LayoutDashboard,
  Check,
  Award
} from 'lucide-react';
import { saveUserProfile, apiSaveUserRoadmap, apiUpdateUserSkills, apiToggleProgressTopic } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function RecommendationsView({ recommendation, onProfileSaved, onSelectCourseRoadmap }) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('roadmap');
  const [userName, setUserName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Roadmap skills interactive completion state (saved without page reload)
  const [completedSkills, setCompletedSkills] = useState(new Set());
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  useEffect(() => {
    if (user && user.full_name) {
      setUserName(user.full_name);
    }
  }, [user]);

  // Reset completion state when a new recommendation is loaded
  useEffect(() => {
    setCompletedSkills(new Set());
  }, [recommendation]);

  if (!recommendation) return null;

  const {
    career_goal,
    match_percentage,
    missing_skills,
    recommended_next_skill,
    learning_roadmap,
    career_fit_breakdown,
    matching_courses,
    course,
    user_skills
  } = recommendation;

  const toggleSkillCompleted = async (skillName) => {
    const isNowCompleted = !completedSkills.has(skillName);
    setCompletedSkills(prev => {
      const next = new Set(prev);
      if (next.has(skillName)) {
        next.delete(skillName);
      } else {
        next.add(skillName);
      }
      return next;
    });

    setFeedbackNotice(
      isNowCompleted 
        ? `✓ Marked "${skillName}" as completed! Progress saved.` 
        : `Unmarked "${skillName}".`
    );
    setTimeout(() => setFeedbackNotice(null), 3000);

    // Save progress without refreshing the page
    if (user) {
      try {
        await apiToggleProgressTopic({
          skill_name: skillName,
          career_goal: career_goal,
          completed: isNowCompleted
        });
      } catch (err) {
        console.warn("Could not sync skill with user profile:", err);
      }
    }
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    const nameToSave = userName.trim() || user?.full_name || 'Anonymous User';

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        name: nameToSave,
        career_goal: career_goal,
        existing_skills: user_skills,
        match_percentage: match_percentage,
        recommended_next_skill: recommended_next_skill || '',
        roadmap: {
          learning_roadmap: learning_roadmap
        }
      };

      const res = await saveUserProfile(payload);
      if (res.success) {
        if (user) {
          try {
            await apiSaveUserRoadmap(payload);
          } catch (err) {
            // Background sync handled
          }
        }
        setSaveSuccess(true);
        if (onProfileSaved) {
          onProfileSaved(res.profile_id);
        }
      } else {
        setSaveError(res.error || 'Failed to save profile.');
      }
    } catch (err) {
      setSaveError('Server error while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ui-card">
      <div className="ui-card-header">
        <div className="view-tabs" style={{ margin: 0, border: 'none', padding: 0 }}>
          <button
            type="button"
            className={`view-tab-btn ${activeSubTab === 'roadmap' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('roadmap')}
          >
            <Milestone size={16} />
            Learning Roadmap ({missing_skills.length})
          </button>

          <button
            type="button"
            className={`view-tab-btn ${activeSubTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('courses')}
          >
            <BookOpen size={16} />
            Courses & Resources ({matching_courses?.length || 1})
          </button>

          <button
            type="button"
            className={`view-tab-btn ${activeSubTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('projects')}
          >
            <FolderGit2 size={16} />
            Suggested Projects
          </button>

          <button
            type="button"
            className={`view-tab-btn ${activeSubTab === 'career_fit' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('career_fit')}
          >
            <Compass size={16} />
            Career Fit Explorer
          </button>

          <button
            type="button"
            className={`view-tab-btn ${activeSubTab === 'save' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('save')}
          >
            <Save size={16} />
            Save Profile & Track Progress
          </button>
        </div>
      </div>

      <div className="ui-card-body">
        {/* SUBTAB 1: ROADMAP */}
        {activeSubTab === 'roadmap' && (
          <div>
            {/* Non-blocking instant feedback notice */}
            {feedbackNotice && (
              <div 
                className="alert alert-info" 
                style={{ 
                  background: '#ECFDF5', 
                  borderColor: '#A7F3D0', 
                  color: '#065F46', 
                  padding: '8px 14px', 
                  marginBottom: '14px', 
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={16} color="#10B981" />
                <span>{feedbackNotice}</span>
              </div>
            )}

            {learning_roadmap.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: '#059669' }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto 12px auto' }} />
                <h3>No Missing Skills!</h3>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                  You have already mastered all required skills for this career path.
                </p>
              </div>
            ) : (
              <div>
                {/* Roadmap Progress Bar */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      Roadmap Completion Progress:
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669' }}>
                      {completedSkills.size} of {learning_roadmap.length} topics completed ({learning_roadmap.length > 0 ? Math.round((completedSkills.size / learning_roadmap.length) * 100) : 0}%) • {Math.max(0, learning_roadmap.length - completedSkills.size)} topics remaining
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${learning_roadmap.length > 0 ? (completedSkills.size / learning_roadmap.length) * 100 : 0}%`, 
                        background: '#10B981', 
                        borderRadius: '999px',
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Click "Mark Complete" on any milestone to track your learning progress without refreshing the page.
                  </span>
                </div>

                <div className="roadmap-timeline">
                  {learning_roadmap.map((item) => {
                    const isCompleted = completedSkills.has(item.skill);
                    return (
                      <div
                        key={item.step}
                        className={`roadmap-card ${item.is_next_immediate ? 'is-next' : ''}`}
                        style={{
                          borderColor: isCompleted ? '#A7F3D0' : undefined,
                          background: isCompleted ? '#F0FDF4' : undefined,
                          transition: 'all 0.25s ease'
                        }}
                      >
                        <div 
                          className="step-indicator"
                          style={{
                            background: isCompleted ? '#10B981' : undefined,
                            color: isCompleted ? '#FFFFFF' : undefined
                          }}
                        >
                          {isCompleted ? <Check size={18} /> : item.step}
                        </div>

                        <div className="step-content">
                          <h3>
                            <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? '#065F46' : undefined }}>
                              {item.skill}
                            </span>
                            <span className={`priority-badge ${item.priority.toLowerCase()}`}>
                              {item.priority} Priority
                            </span>
                            <span style={{ fontSize: '0.72rem', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                              {item.progression_level || 'Beginner'}
                            </span>
                            {item.is_next_immediate && !isCompleted && (
                              <span style={{ fontSize: '0.72rem', background: '#4F46E5', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                Immediate Next Step
                              </span>
                            )}
                            {isCompleted && (
                              <span style={{ fontSize: '0.72rem', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={11} /> Mastered
                              </span>
                            )}
                          </h3>

                          <p className="prereq-note">
                            <strong>Prerequisite Order:</strong> {item.prerequisite_status}
                          </p>

                          <p style={{ fontSize: '0.83rem', color: '#475569', marginBottom: '8px' }}>
                            {item.resource?.description}
                          </p>

                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                            {item.resource?.url && (
                              <a
                                href={item.resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resource-pill"
                              >
                                <BookOpen size={12} />
                                {item.resource.title} ({item.resource.platform})
                                <ExternalLink size={11} />
                              </a>
                            )}

                            <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              Est Study Time: ~{item.estimated_hours || item.resource?.est_hours || 15} hours
                            </span>

                            <span style={{ fontSize: '0.74rem', color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                              Difficulty: {item.resource?.difficulty || item.progression_level || 'Intermediate'}
                            </span>
                          </div>

                          {item.practical_exercise && (
                            <div style={{ marginTop: '10px', padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.79rem', color: '#334155' }}>
                              <strong style={{ color: '#0F172A' }}>🛠️ Practical Exercise:</strong> {item.practical_exercise}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minWidth: '170px' }}>
                          <button
                            type="button"
                            onClick={() => toggleSkillCompleted(item.skill)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: isCompleted ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                              background: isCompleted ? '#ECFDF5' : '#FFFFFF',
                              color: isCompleted ? '#065F46' : '#475569',
                              cursor: 'pointer',
                              marginBottom: '10px',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                            title={isCompleted ? "Click to unmark as completed" : "Mark as completed without refreshing the page"}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 size={15} color="#10B981" />
                                <span>Completed</span>
                              </>
                            ) : (
                              <>
                                <Circle size={15} color="#94A3B8" />
                                <span>Mark Complete</span>
                              </>
                            )}
                          </button>

                          <div style={{ textAlign: 'right', width: '100%' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: '3px' }}>
                              Suggested Project:
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'inline-block' }}>
                              {item.suggested_project}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB: COURSES & RESOURCES */}
        {activeSubTab === 'courses' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Curated & Verified Courses for {career_goal}
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Reliable learning resources from Coursera, freeCodeCamp, and official documentation matching your target competencies.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {(matching_courses && matching_courses.length > 0 ? matching_courses : [
                {
                  career_goal: career_goal,
                  match_percentage: match_percentage,
                  course_title: course?.title || `${career_goal} Professional Certification`,
                  platform: course?.platform || 'Coursera / freeCodeCamp',
                  duration: course?.duration || '4 - 6 months',
                  difficulty: course?.difficulty || 'Intermediate',
                  url: course?.url || '#'
                }
              ]).map((c, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: c.career_goal === career_goal ? '#F8FAFC' : '#FFFFFF',
                    border: c.career_goal === career_goal ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#EEF2FF', color: '#4F46E5', padding: '3px 8px', borderRadius: '4px' }}>
                        {c.platform || 'Verified Platform'}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>
                        {c.match_percentage}% Match
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px', lineHeight: 1.35 }}>
                      {c.course_title}
                    </h4>

                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.76rem', color: '#64748B', marginBottom: '14px' }}>
                      <span><strong>Duration:</strong> {c.duration}</span>
                      <span>&bull;</span>
                      <span><strong>Level:</strong> {c.difficulty}</span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '16px' }}>
                      Domain: <strong>{c.career_goal}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem', padding: '8px 12px', textDecoration: 'none' }}
                      >
                        Course Link <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1.2, justifyContent: 'center', fontSize: '0.78rem', padding: '8px 12px' }}
                      onClick={() => {
                        if (onSelectCourseRoadmap) {
                          onSelectCourseRoadmap(c.career_goal);
                        }
                      }}
                    >
                      View Complete Roadmap
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 2: SUGGESTED PROJECTS */}
        {activeSubTab === 'projects' && (
          <div>
            <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '16px' }}>
              These hands-on portfolio projects solidify your practical skills for <strong>{career_goal}</strong>:
            </p>

            <div className="projects-grid">
              {learning_roadmap.map((item) => (
                <div key={item.step} className="project-card">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase' }}>
                        Step {item.step} Project
                      </span>
                      <span className={`priority-badge ${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    </div>

                    <div className="project-title">{item.suggested_project}</div>
                    <p className="project-desc">{item.project_description}</p>
                  </div>

                  <div className="project-footer">
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      Focus Skill: <strong>{item.skill}</strong>
                    </span>

                    {item.resource?.url && (
                      <a
                        href={item.resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: '#4F46E5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Docs & Guides <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 3: CAREER FIT EXPLORER */}
        {activeSubTab === 'career_fit' && (
          <div>
            <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '16px' }}>
              Based on your {user_skills.length} existing skills, here is your readiness match across alternative career paths:
            </p>

            <div className="fit-list">
              {career_fit_breakdown && career_fit_breakdown.map((fit, idx) => (
                <div key={idx} className="fit-item">
                  <div>
                    <div className="fit-career-name">{fit.career_goal}</div>
                    <div className="fit-career-sub">
                      {fit.acquired_count} of {fit.total_required} skills acquired &bull; {fit.missing_count} skills to learn
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="fit-bar-wrapper">
                      <div className="fit-bar-fill" style={{ width: `${fit.match_percentage}%` }} />
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', minWidth: '46px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {fit.match_percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 4: SAVE PROFILE & TRACK */}
        {activeSubTab === 'save' && (
          <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px', textAlign: 'center' }}>
              Save Your Profile & Roadmap
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748B', textAlign: 'center', marginBottom: '20px' }}>
              Persist your profile to track your learning progress, check off completed skills and portfolio projects, and monitor completion rates.
            </p>

            {saveSuccess && (
              <div className="alert alert-info" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
                <CheckCircle2 size={18} color="#10B981" />
                <div>
                  Profile saved successfully!{' '}
                  {user ? (
                    <Link to="/dashboard" style={{ fontWeight: 700, textDecoration: 'underline' }}>
                      Go to My Dashboard &rarr;
                    </Link>
                  ) : (
                    <span>Switch to the <strong>Saved Profiles</strong> tab to start tracking.</span>
                  )}
                </div>
              </div>
            )}

            {saveError && (
              <div className="alert alert-danger">
                <span>{saveError}</span>
              </div>
            )}

            {user ? (
              <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <LayoutDashboard size={18} color="#4F46E5" />
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>
                    Sync directly to your account: {user.full_name}
                  </strong>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
                  <div><strong>Career Goal:</strong> {career_goal}</div>
                  <div><strong>Match Score:</strong> {match_percentage}%</div>
                  <div><strong>Roadmap Milestones:</strong> {missing_skills.length} skills to master</div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving to your account...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save to My Dashboard
                    </>
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Learner Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your name (e.g. Alex Chen)"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '18px', fontSize: '0.84rem' }}>
                  <div><strong>Career Goal:</strong> {career_goal}</div>
                  <div><strong>Match Percentage:</strong> {match_percentage}%</div>
                  <div><strong>Skills to Track:</strong> {missing_skills.length} missing skills</div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Profile & Start Tracking
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
