import React from 'react';
import { Target, CheckCircle2, AlertTriangle, Lightbulb, Sparkles, AlertCircle, BookOpen, ExternalLink, Clock, Award } from 'lucide-react';

export default function MatchStats({ recommendation }) {
  if (!recommendation) return null;

  const {
    career_goal,
    match_percentage,
    match_calculation_explanation,
    acquired_skills,
    missing_skills,
    recommended_next_skill,
    course,
    ml_model_insights,
    total_required_skills,
    is_fuzzy_matched,
    original_query,
    unknown_career,
    suggested_alternative_careers
  } = recommendation;

  return (
    <div>
      {/* Unknown or Fuzzy Career Warning */}
      {is_fuzzy_matched && (
        <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
          <AlertCircle size={18} />
          <div>
            <strong>Career Goal Mapped:</strong> "{original_query}" was matched to the closest canonical track: <strong>{career_goal}</strong>.
            {unknown_career && suggested_alternative_careers && suggested_alternative_careers.length > 0 && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '0.78rem' }}>
                Other close tracks: {suggested_alternative_careers.map(c => `${c.career} (${c.similarity}%)`).join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recommended Course Hero Card */}
      {course && (
        <div className="ui-card" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', border: '1.5px solid #BFDBFE', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.74rem', background: '#2563EB', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Recommended Course Track
                </span>
                <span style={{ fontSize: '0.76rem', color: '#1E40AF', fontWeight: 600 }}>
                  Platform: <strong>{course.platform}</strong>
                </span>
              </div>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {course.title}
              </h3>
            </div>

            {course.url && (
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Go to Verified Course</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>

          <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            {course.description}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.78rem', color: '#334155' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} color="#2563EB" />
              Duration: <strong>{course.duration || '120 hours'}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={13} color="#2563EB" />
              Level: <strong>{course.difficulty || 'Intermediate'}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BookOpen size={13} color="#2563EB" />
              Curriculum: <strong>{total_required_skills || (course.skills ? course.skills.length : 10)} core competencies</strong>
            </span>
          </div>
        </div>
      )}

      {/* Main Stats Banner */}
      <div className="stats-banner">
        <div className="stats-grid">
          <div className="gauge-box">
            <div className="gauge-pct">{match_percentage}%</div>
            <div className="gauge-label">Course Match</div>
          </div>

          <div className="stats-details">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  {career_goal}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Skill Gap & Curriculum Readiness
                </span>
              </div>

              <div className="stats-counts-row">
                <span className="count-badge acquired">
                  <CheckCircle2 size={14} />
                  {acquired_skills.length} Acquired
                </span>
                <span className="count-badge missing">
                  <AlertTriangle size={14} />
                  {missing_skills.length} Missing
                </span>
                <span className="count-badge total">
                  <Target size={14} />
                  {total_required_skills} Required
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${match_percentage}%`,
                  background: match_percentage >= 70 ? 'linear-gradient(90deg, #10B981, #059669)' :
                              match_percentage >= 40 ? 'linear-gradient(90deg, #4F46E5, #06B6D4)' :
                              'linear-gradient(90deg, #F59E0B, #EA580C)',
                  borderRadius: '999px',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>

            {/* Explanation of how match percentage is calculated */}
            <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4, background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <strong>Match Calculation Formula:</strong> (Acquired Skills / Total Course Skills) × 100% = ({acquired_skills.length}/{total_required_skills}) × 100% = <strong>{match_percentage}%</strong>. {match_calculation_explanation || ''}
            </div>

            {/* Missing Skills Tags List */}
            {missing_skills && missing_skills.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#B91C1C', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={13} />
                  Missing Skills to Learn for this Course ({missing_skills.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {missing_skills.map((ms) => (
                    <span
                      key={ms}
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#B91C1C',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.76rem',
                        fontWeight: 600
                      }}
                    >
                      {ms}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Immediate Next Skill Prediction Card */}
        {recommended_next_skill ? (
          <div className="next-skill-hero" style={{ marginTop: '16px' }}>
            <div className="next-skill-left">
              <div className="next-skill-icon">
                <Lightbulb size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={13} />
                  ML Recommendation & Next Immediate Milestone
                </span>
                <div className="next-skill-name">{recommended_next_skill}</div>
                <div className="next-skill-sub">
                  Highest impact priority following prerequisite sequencing
                </div>
              </div>
            </div>

            {ml_model_insights && (
              <div style={{ textAlign: 'right' }}>
                <div className="confidence-pill">
                  ML Confidence: {ml_model_insights.confidence_score}%
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="alert alert-info" style={{ marginTop: '16px', background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
            <CheckCircle2 size={20} color="#10B981" />
            <div>
              <strong>Outstanding Achievement!</strong> You already possess 100% of all required core skills for <strong>{career_goal}</strong>! Check out advanced project ideas below.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
