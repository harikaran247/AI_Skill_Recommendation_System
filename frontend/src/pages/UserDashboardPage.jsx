import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  apiGetUserDashboard, 
  apiUpdateUserProgress,
  apiUpdateUserSkills,
  apiUpdateUserCareerGoal,
  fetchAllSkills
} from '../services/api';
import Navbar from '../components/Navbar';
import { 
  Award, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  FolderCheck, 
  Loader2, 
  RefreshCw, 
  AlertCircle,
  Plus,
  X,
  Edit2,
  Check,
  ExternalLink,
  BookOpen,
  ArrowRight
} from 'lucide-react';

const ALL_CAREER_DOMAINS = [
  'AI Engineer',
  'Data Scientist',
  'Full Stack Developer',
  'Data Analyst',
  'DevOps Engineer',
  'Cloud Engineer',
  'Cybersecurity Analyst',
  'UI/UX Designer',
  'Product Manager',
  'Mobile App Developer',
  'Machine Learning Engineer'
];

const DASHBOARD_SUGGESTIONS = {
  'AI Engineer': ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'SQL'],
  'Data Scientist': ['Python', 'SQL', 'Pandas', 'Scikit-Learn', 'Statistics', 'Data Visualization'],
  'Full Stack Developer': ['JavaScript', 'HTML', 'CSS', 'React', 'Node.js', 'Git and GitHub'],
  'Data Analyst': ['SQL', 'Excel', 'Tableau', 'Power BI', 'Python'],
  'DevOps Engineer': ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'Git and GitHub', 'AWS'],
  'Cloud Engineer': ['AWS', 'Linux', 'Networking', 'Terraform', 'Python'],
  'Cybersecurity Analyst': ['Network Security', 'Linux', 'Cryptography', 'SIEM', 'Ethical Hacking'],
  'UI/UX Designer': ['Figma', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
  'Product Manager': ['Agile/Scrum', 'Product Strategy', 'Roadmapping', 'User Research'],
  'Mobile App Developer': ['Flutter', 'React Native', 'Kotlin', 'Swift', 'REST APIs'],
  'Machine Learning Engineer': ['Python', 'Scikit-Learn', 'PyTorch', 'MLOps', 'Docker']
};

export default function UserDashboardPage() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Edit states for Known Skills and Career Domain
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [newSkillText, setNewSkillText] = useState('');
  const [availableSkills, setAvailableSkills] = useState([]);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    }
    try {
      const [res, skillsRes] = await Promise.all([
        apiGetUserDashboard(),
        fetchAllSkills()
      ]);

      if (skillsRes?.skills) {
        setAvailableSkills(skillsRes.skills);
      }

      if (res?.success) {
        setDashboardData(res);
        if (res.user?.career_goal) {
          setSelectedGoal(res.user.career_goal);
        }
      }
    } catch (err) {
      console.error("Error loading user dashboard:", err);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Show temporary feedback toast without reloading
  const showFeedback = (text, type = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  // Add a skill directly with duplicate prevention
  const handleAddSkill = async (skillToAdd) => {
    const s = (skillToAdd || newSkillText).trim();
    if (!s) return;

    const alreadyExists = dashboardData?.skills?.some(
      existing => existing.skill_name.toLowerCase() === s.toLowerCase()
    );
    if (alreadyExists) {
      showFeedback(`"${s}" is already in your known skills list!`, 'error');
      setNewSkillText('');
      return;
    }

    setSavingAction(true);
    try {
      const res = await apiUpdateUserSkills({ add_skill: s });
      if (res.success) {
        setDashboardData(prev => ({
          ...prev,
          skills: res.skills,
          progress: res.progress,
          metrics: res.metrics,
          recommendation: res.recommendation || prev?.recommendation
        }));
        setNewSkillText('');
        showFeedback(`Added "${s}" to your known skills! Learning roadmap regenerated.`);
      } else {
        showFeedback(res.error || 'Failed to add skill.', 'error');
      }
    } catch (err) {
      showFeedback('Network error while adding skill.', 'error');
    } finally {
      setSavingAction(false);
    }
  };

  // Remove a skill
  const handleRemoveSkill = async (skillName) => {
    setSavingAction(true);
    try {
      const res = await apiUpdateUserSkills({ remove_skill: skillName });
      if (res.success) {
        setDashboardData(prev => ({
          ...prev,
          skills: res.skills,
          progress: res.progress,
          metrics: res.metrics,
          recommendation: res.recommendation || prev?.recommendation
        }));
        showFeedback(`Removed "${skillName}". Learning roadmap regenerated.`);
      } else {
        showFeedback(res.error || 'Failed to remove skill.', 'error');
      }
    } catch (err) {
      showFeedback('Network error while removing skill.', 'error');
    } finally {
      setSavingAction(false);
    }
  };

  // Update target career domain
  const handleSaveCareerGoal = async () => {
    if (!selectedGoal || selectedGoal === dashboardData?.user?.career_goal) {
      setIsEditingGoal(false);
      return;
    }
    setSavingAction(true);
    try {
      const res = await apiUpdateUserCareerGoal({ career_goal: selectedGoal });
      if (res.success) {
        setDashboardData(prev => ({
          ...prev,
          user: res.user,
          progress: res.progress,
          metrics: res.metrics,
          recommendation: res.recommendation || prev?.recommendation
        }));
        setIsEditingGoal(false);
        showFeedback(`Domain updated to "${selectedGoal}"! Learning roadmap refreshed.`);
      } else {
        showFeedback(res.error || 'Failed to update domain.', 'error');
      }
    } catch (err) {
      showFeedback('Network error while updating domain.', 'error');
    } finally {
      setSavingAction(false);
    }
  };

  // Helper to optimistically update progress, move skill to Known Skills, and recalculate match %
  const updateProgressAndRecalculate = (prev, item, nextStatus, nextProjectCompleted) => {
    if (!prev) return prev;
    const isCompleted = nextStatus === 'completed';

    // 1. Update checklist items
    const updatedProgress = (prev.progress || []).map(p => {
      if (p.id === item.id) {
        return { ...p, status: nextStatus, project_completed: nextProjectCompleted };
      }
      return p;
    });

    // 2. Move to Known Skills if completed, or remove if uncompleted
    let updatedSkills = prev.skills ? [...prev.skills] : [];
    if (isCompleted) {
      const alreadyKnown = updatedSkills.some(
        s => s.skill_name.toLowerCase() === item.skill_name.toLowerCase()
      );
      if (!alreadyKnown) {
        updatedSkills.push({
          id: Date.now(),
          skill_name: item.skill_name,
          proficiency_level: 'Intermediate',
          created_at: new Date().toISOString()
        });
      }
    } else {
      updatedSkills = updatedSkills.filter(
        s => s.skill_name.toLowerCase() !== item.skill_name.toLowerCase()
      );
    }

    // 3. Update missing skills (never show known skills)
    const oldMissing = prev.recommendation?.missing_skills || [];
    let updatedMissing = oldMissing;
    if (isCompleted) {
      updatedMissing = oldMissing.filter(m => m.toLowerCase() !== item.skill_name.toLowerCase());
    } else {
      if (!oldMissing.some(m => m.toLowerCase() === item.skill_name.toLowerCase())) {
        updatedMissing = [...oldMissing, item.skill_name];
      }
    }

    // 4. Formula: Skill Match (%) = (Acquired required skills / Total required skills for selected domain) × 100
    const totalRequired = prev.recommendation?.total_required_skills || 
      (updatedSkills.length + updatedMissing.length) || 11;
    const acquiredRequiredCount = Math.max(0, totalRequired - updatedMissing.length);
    const newMatchPct = Math.round((acquiredRequiredCount / totalRequired) * 1000) / 10;

    // 5. Update next recommended skill
    const nextRecCandidate = updatedMissing.length > 0 ? updatedMissing[0] : null;

    const total = updatedProgress.length;
    const completed = updatedProgress.filter(p => p.status === 'completed').length;
    const in_progress = updatedProgress.filter(p => p.status === 'in_progress').length;
    const progressPct = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0.0;

    return {
      ...prev,
      skills: updatedSkills,
      progress: updatedProgress,
      metrics: {
        total,
        completed,
        in_progress,
        not_started: total - (completed + in_progress),
        progress_percentage: progressPct
      },
      recommendation: prev.recommendation ? {
        ...prev.recommendation,
        match_percentage: newMatchPct,
        missing_skills: updatedMissing,
        recommended_next_skill: nextRecCandidate,
        total_acquired: acquiredRequiredCount
      } : prev.recommendation
    };
  };

  // Immediate optimistic update for marking skill completed/uncompleted
  const handleSkillToggle = async (item, isChecked) => {
    const nextStatus = isChecked ? 'completed' : 'not_started';
    const nextProjectCompleted = isChecked ? (item.project_completed || 1) : 0;

    // 1. Optimistic local state update (instant UI response, NO page reload)
    setDashboardData(prev => updateProgressAndRecalculate(prev, item, nextStatus, nextProjectCompleted));
    setUpdatingId(item.id);

    try {
      const res = await apiUpdateUserProgress(item.id, {
        status: nextStatus,
        project_completed: nextProjectCompleted
      });

      if (res.success) {
        showFeedback(
          isChecked 
            ? `"${item.skill_name}" completed! Moved to Known Skills and Match % updated.` 
            : `"${item.skill_name}" marked as uncompleted.`,
          'success'
        );
        // Synchronize authoritative backend response
        setDashboardData(prev => prev ? {
          ...prev,
          metrics: res.metrics || prev.metrics,
          progress: res.progress || prev.progress,
          skills: res.skills || prev.skills,
          recommendation: res.recommendation || prev.recommendation
        } : prev);
      } else {
        await loadData(false);
        showFeedback('Could not update skill progress. Please try again.', 'error');
      }
    } catch (err) {
      await loadData(false);
      showFeedback('Network error while updating progress.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle status selector dropdown change
  const handleStatusSelectChange = async (item, newStatus) => {
    const newProjectCompleted = newStatus === 'completed' ? 1 : (item.project_completed || 0);

    // Optimistic local state update
    setDashboardData(prev => updateProgressAndRecalculate(prev, item, newStatus, newProjectCompleted));
    setUpdatingId(item.id);

    try {
      const res = await apiUpdateUserProgress(item.id, {
        status: newStatus,
        project_completed: newProjectCompleted
      });

      if (res.success) {
        showFeedback(
          newStatus === 'completed'
            ? `"${item.skill_name}" marked as completed! Moved to Known Skills.`
            : `Status updated to "${newStatus}".`,
          'success'
        );
        setDashboardData(prev => prev ? {
          ...prev,
          metrics: res.metrics || prev.metrics,
          progress: res.progress || prev.progress,
          skills: res.skills || prev.skills,
          recommendation: res.recommendation || prev.recommendation
        } : prev);
      } else {
        await loadData(false);
        showFeedback('Failed to update status.', 'error');
      }
    } catch (err) {
      await loadData(false);
      showFeedback('Network error updating status.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Immediate optimistic update for project completion checkbox
  const handleProjectCheckboxChange = async (item, isChecked) => {
    setDashboardData(prev => {
      if (!prev || !prev.progress) return prev;
      const updatedList = prev.progress.map(p => {
        if (p.id === item.id) {
          return { ...p, project_completed: isChecked ? 1 : 0 };
        }
        return p;
      });
      return { ...prev, progress: updatedList };
    });

    setUpdatingId(item.id);

    try {
      const res = await apiUpdateUserProgress(item.id, {
        project_completed: isChecked ? 1 : 0
      });

      if (!res.success) {
        await loadData(false);
      }
    } catch (err) {
      await loadData(false);
    } finally {
      setUpdatingId(null);
    }
  };

  const careerGoal = dashboardData?.user?.career_goal || 'AI Engineer';
  const knownSkills = dashboardData?.skills || [];
  const knownSkillNames = new Set(knownSkills.map(s => s.skill_name.toLowerCase()));

  // Ensure missing skills strictly excludes any known skills
  const missingSkills = (dashboardData?.recommendation?.missing_skills || []).filter(
    m => !knownSkillNames.has(m.toLowerCase())
  );

  const nextSkill = dashboardData?.recommendation?.recommended_next_skill && 
    !knownSkillNames.has(dashboardData.recommendation.recommended_next_skill.toLowerCase())
      ? dashboardData.recommendation.recommended_next_skill
      : (missingSkills.length > 0 ? missingSkills[0] : null);

  const totalRequired = dashboardData?.recommendation?.total_required_skills || 
    (knownSkills.length + missingSkills.length) || 11;
  const acquiredCount = Math.max(0, totalRequired - missingSkills.length);
  const matchPercentage = dashboardData?.recommendation?.match_percentage !== undefined
    ? dashboardData.recommendation.match_percentage
    : (totalRequired > 0 ? Math.round((acquiredCount / totalRequired) * 1000) / 10 : 0);

  const completedCount = (dashboardData?.progress || []).filter(p => p.status === 'completed').length;
  const remainingCount = Math.max(0, (dashboardData?.progress || []).length - completedCount);

  // Suggested course and projects
  const suggestedCourse = dashboardData?.recommendation?.course || {
    title: `${careerGoal} Professional Specialization`,
    platform: 'Coursera / DeepLearning.AI',
    difficulty: 'Intermediate',
    duration: '80 hours',
    url: 'https://www.coursera.org/'
  };

  return (
    <div className="app-wrapper">
      <Navbar />

      <main className="main-content" style={{ maxWidth: '1120px', margin: '0 auto', padding: '24px 16px' }}>
        {/* 1. Welcome Message & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Welcome back, {dashboardData?.user?.full_name || user?.full_name || 'Learner'}!
            </h1>
            <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Your personalized learning roadmap, skill match progress, and project portfolio for <strong>{careerGoal}</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => loadData(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px' }}
              title="Refresh your learning progress"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              to="/recommender"
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px' }}
            >
              <Sparkles size={14} /> AI Recommender
            </Link>
          </div>
        </div>

        {/* Temporary Feedback Toast */}
        {feedbackMsg && (
          <div 
            className={`alert ${feedbackMsg.type === 'error' ? 'alert-danger' : 'alert-info'}`}
            style={{ 
              marginBottom: '16px', 
              padding: '10px 14px', 
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {feedbackMsg.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle2 size={16} color="#10B981" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {initialLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loader2 className="animate-spin" size={36} color="#4F46E5" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Loading your personalized learning path...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 2 & 3. Domain & Known Skills Card */}
            <div className="ui-card" style={{ padding: '20px 24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
                {/* Selected Career Domain */}
                <div>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 700 }}>
                    Selected Career Domain
                  </span>
                  {!isEditingGoal ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                        {careerGoal}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoal(careerGoal);
                          setIsEditingGoal(true);
                        }}
                        className="btn-secondary"
                        style={{ padding: '3px 9px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={12} /> Change Domain
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <select
                        className="form-select"
                        style={{ fontSize: '0.82rem', padding: '4px 8px', borderRadius: '6px' }}
                        value={selectedGoal}
                        disabled={savingAction}
                        onChange={(e) => setSelectedGoal(e.target.value)}
                      >
                        {ALL_CAREER_DOMAINS.map(domain => (
                          <option key={domain} value={domain}>{domain}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        disabled={savingAction}
                        onClick={handleSaveCareerGoal}
                      >
                        {savingAction ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />} Save
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                        disabled={savingAction}
                        onClick={() => setIsEditingGoal(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Known Skills Toggle Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#4F46E5', fontWeight: 700, background: '#EEF2FF', padding: '3px 10px', borderRadius: '999px', border: '1px solid #C7D2FE' }}>
                    {knownSkills.length} Known Skill{knownSkills.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingSkills(!isEditingSkills)}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={12} /> {isEditingSkills ? 'Done Editing' : 'Edit Known Skills'}
                  </button>
                </div>
              </div>

              {/* Known Skills Display (Direct display when saved, edit mode only when requested) */}
              {knownSkills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'center' }}>
                  {knownSkills.map((s) => (
                    <span 
                      key={s.id || s.skill_name} 
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '999px',
                        padding: '4px 11px',
                        fontSize: '0.82rem',
                        color: '#0F172A',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{s.skill_name}</span>
                      {isEditingSkills && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s.skill_name)}
                          disabled={savingAction}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={`Remove ${s.skill_name}`}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Initial Skill Setup Form ONLY if user has 0 known skills, or when user clicks Edit Known Skills */}
              {(isEditingSkills || knownSkills.length === 0) && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #E2E8F0' }}>
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddSkill();
                      }}
                      style={{ display: 'flex', gap: '8px' }}
                    >
                      <input
                        type="text"
                        placeholder="Type a skill you know (e.g. Python, SQL, React)..."
                        className="form-input"
                        style={{ fontSize: '0.84rem', padding: '7px 12px', flex: 1, borderRadius: '6px' }}
                        value={newSkillText}
                        disabled={savingAction}
                        onChange={(e) => setNewSkillText(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '0 16px', fontSize: '0.82rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}
                        disabled={savingAction || !newSkillText.trim()}
                      >
                        {savingAction ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Add Skill
                      </button>
                    </form>

                    {/* Autocomplete Dropdown */}
                    {newSkillText.trim().length >= 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: '110px',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          zIndex: 50,
                          marginTop: '4px',
                          maxHeight: '180px',
                          overflowY: 'auto'
                        }}
                      >
                        {availableSkills
                          .filter(sk => 
                            sk.toLowerCase().includes(newSkillText.toLowerCase().trim()) &&
                            !knownSkills.some(s => s.skill_name.toLowerCase() === sk.toLowerCase())
                          )
                          .slice(0, 8)
                          .map((suggested) => (
                            <div
                              key={suggested}
                              onClick={() => handleAddSkill(suggested)}
                              style={{
                                padding: '7px 12px',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                color: '#1E293B',
                                borderBottom: '1px solid #F1F5F9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                            >
                              <span>{suggested}</span>
                              <span style={{ fontSize: '0.72rem', color: '#4F46E5', fontWeight: 600 }}>+ Add</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Suggestions for Domain */}
                  {DASHBOARD_SUGGESTIONS[careerGoal] && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                        Popular for {careerGoal}:
                      </span>
                      {DASHBOARD_SUGGESTIONS[careerGoal]
                        .filter(sk => !knownSkills.some(s => s.skill_name.toLowerCase() === sk.toLowerCase()))
                        .slice(0, 6)
                        .map(suggested => (
                          <button
                            key={suggested}
                            type="button"
                            disabled={savingAction}
                            onClick={() => handleAddSkill(suggested)}
                            style={{
                              fontSize: '0.74rem',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              border: '1px solid #C7D2FE',
                              background: '#FFFFFF',
                              color: '#4F46E5',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            + {suggested}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Skill-Match Percentage & Progress Bar Card */}
            <div className="ui-card" style={{ padding: '20px 24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 700 }}>
                    Skill-Match Percentage
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)' }}>
                      {matchPercentage}%
                    </span>
                    <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
                      ({acquiredCount} of {totalRequired} required skills acquired)
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {nextSkill && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EEF2FF', border: '1px solid #C7D2FE', padding: '4px 12px', borderRadius: '999px' }}>
                      <Sparkles size={14} color="#4F46E5" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4F46E5' }}>
                        Next Recommended: {nextSkill}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                    <strong>{completedCount}</strong> Completed • <strong>{remainingCount}</strong> Remaining
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '9px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden', margin: '8px 0 10px 0' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, matchPercentage)}%`,
                    background: '#10B981',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                Formula: Skill Match (%) = ({acquiredCount} Acquired required skills ÷ {totalRequired} Total required skills for {careerGoal}) × 100
              </div>
            </div>

            {/* 5. Missing Skills Section (Never show skills user already knows) */}
            {missingSkills.length > 0 ? (
              <div className="ui-card" style={{ padding: '16px 20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Target size={18} color="#DC2626" />
                  <strong style={{ fontSize: '0.92rem', color: '#991B1B' }}>
                    Missing Skills for {careerGoal} ({missingSkills.length} remaining)
                  </strong>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {missingSkills.map((ms) => (
                    <span 
                      key={ms} 
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #FECACA',
                        color: '#B91C1C',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}
                    >
                      {ms}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ui-card" style={{ padding: '16px 20px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#059669" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065F46' }}>
                  Congratulations! You have acquired all required competencies for {careerGoal}!
                </span>
              </div>
            )}

            {/* 6 & 7. Saved Learning Roadmap with Priority Levels & Completed/Remaining Skills */}
            <div className="ui-card" style={{ padding: '20px 24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="#4F46E5" />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Saved Learning Roadmap & Projects
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.76rem' }}>
                  <span style={{ background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> {completedCount} Done
                  </span>
                  <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {remainingCount} Remaining
                  </span>
                </div>
              </div>

              {/* Progress Checklist */}
              {(dashboardData?.progress || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748B' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem' }}>No roadmap items currently active.</p>
                  <Link to="/recommender" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                    <Sparkles size={14} /> Generate Roadmap
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dashboardData.progress.map((item) => {
                    const isDone = item.status === 'completed';
                    const priorityColor = item.priority === 'High' 
                      ? { bg: '#FEE2E2', text: '#991B1B' } 
                      : item.priority === 'Medium' 
                        ? { bg: '#FEF3C7', text: '#92400E' } 
                        : { bg: '#E0E7FF', text: '#3730A3' };

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: isDone ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                          background: isDone ? '#F0FDF4' : '#FFFFFF',
                          transition: 'all 0.2s ease',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isDone}
                            disabled={updatingId === item.id}
                            onChange={(e) => handleSkillToggle(item, e.target.checked)}
                            style={{
                              width: '18px',
                              height: '18px',
                              marginTop: '2px',
                              cursor: 'pointer',
                              accentColor: '#10B981'
                            }}
                            title={isDone ? "Mark as not completed" : "Mark as completed"}
                          />

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{
                                fontSize: '0.9rem',
                                color: '#0F172A',
                                textDecoration: isDone ? 'line-through' : 'none'
                              }}>
                                {item.skill_name}
                              </strong>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '1px 7px',
                                borderRadius: '999px',
                                background: priorityColor.bg,
                                color: priorityColor.text
                              }}>
                                {item.priority || 'High'}
                              </span>
                            </div>

                            {item.suggested_project && (
                              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <FolderCheck size={13} color="#4F46E5" />
                                <span>Project: <strong>{item.suggested_project}</strong></span>
                                <label style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginLeft: '4px',
                                  cursor: 'pointer',
                                  color: item.project_completed ? '#059669' : '#64748B',
                                  fontWeight: 600
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(item.project_completed)}
                                    disabled={updatingId === item.id}
                                    onChange={(e) => handleProjectCheckboxChange(item, e.target.checked)}
                                    style={{ accentColor: '#10B981' }}
                                  />
                                  Built in Portfolio
                                </label>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            className="form-select"
                            style={{ padding: '4px 8px', fontSize: '0.76rem', width: 'auto', borderRadius: '6px' }}
                            value={item.status}
                            disabled={updatingId === item.id}
                            onChange={(e) => handleStatusSelectChange(item, e.target.value)}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 8. Suggested Courses and Projects */}
            <div className="ui-card" style={{ padding: '20px 24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <BookOpen size={18} color="#4F46E5" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Suggested Courses & Projects for {careerGoal}
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {/* Course Recommendation */}
                <div style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#4F46E5', fontWeight: 700, marginBottom: '4px' }}>
                    Recommended Curriculum
                  </div>
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    {suggestedCourse.title || `${careerGoal} Professional Program`}
                  </strong>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '10px' }}>
                    Platform: <strong>{suggestedCourse.platform || 'Coursera'}</strong> • Duration: {suggestedCourse.duration || '60 hours'} • {suggestedCourse.difficulty || 'Intermediate'}
                  </div>
                  {suggestedCourse.url && (
                    <a
                      href={suggestedCourse.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: '0.76rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ExternalLink size={12} /> Open Course <ArrowRight size={12} />
                    </a>
                  )}
                </div>

                {/* Practical Projects */}
                <div style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#059669', fontWeight: 700, marginBottom: '4px' }}>
                    Target Portfolio Projects
                  </div>
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Hands-on Project Portfolio
                  </strong>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                    Build end-to-end applications to prove domain readiness. Each roadmap skill includes an associated portfolio project.
                  </p>
                  <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FolderCheck size={14} /> Check "Built in Portfolio" on completed items above!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
