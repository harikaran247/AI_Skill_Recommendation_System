import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import CareerSelector from '../components/CareerSelector';
import SampleProfiles from '../components/SampleProfiles';
import ResumeUploader from '../components/ResumeUploader';
import SkillInput from '../components/SkillInput';
import MatchStats from '../components/MatchStats';
import RecommendationsView from '../components/RecommendationsView';
import ProgressTracker from '../components/ProgressTracker';
import { 
  fetchCareers, 
  fetchAllSkills, 
  fetchSampleProfiles, 
  getRecommendations,
  apiGetUserDashboard
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Compass, 
  BookOpen, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight,
  GraduationCap
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('recommend');
  const [careers, setCareers] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [sampleProfiles, setSampleProfiles] = useState([]);
  
  // Two Options for Skill Input:
  // 'option_a': Select a target domain and enter known skills
  // 'option_b': Enter only the skills they already know, without selecting a domain
  const [inputOption, setInputOption] = useState('option_a');
  
  const [selectedCareer, setSelectedCareer] = useState(user?.career_goal || 'AI Engineer');
  const [skills, setSkills] = useState([]);
  
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  // Initial data loading
  useEffect(() => {
    async function init() {
      try {
        const [careersRes, skillsRes, samplesRes] = await Promise.all([
          fetchCareers(),
          fetchAllSkills(),
          fetchSampleProfiles()
        ]);

        if (careersRes?.careers) setCareers(careersRes.careers);
        if (skillsRes?.skills) setAllSkills(skillsRes.skills);
        if (samplesRes?.samples) setSampleProfiles(samplesRes.samples);

        let initialCareer = user?.career_goal || 'AI Engineer';
        let initialSkills = [];

        if (user) {
          try {
            const dashRes = await apiGetUserDashboard();
            if (dashRes?.success) {
              if (dashRes.user?.career_goal) {
                initialCareer = dashRes.user.career_goal;
              }
              if (dashRes.skills && dashRes.skills.length > 0) {
                initialSkills = dashRes.skills.map(s => s.skill_name);
              }
            }
          } catch (dashErr) {
            console.warn("Could not load user profile skills:", dashErr);
          }
        }

        setSelectedCareer(initialCareer);
        setSkills(initialSkills);
        // Initially, do NOT auto-run recommendation. Wait for user to click button.
        setRecommendation(null);
        setHasGenerated(false);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }
    init();
  }, [user]);

  // If user switches between Option A and Option B, reset results
  const handleOptionSwitch = (opt) => {
    if (opt !== inputOption) {
      setInputOption(opt);
      setRecommendation(null);
      setHasGenerated(false);
      setError(null);
    }
  };

  // Requirement: If the user changes career goal, reset old results until generated again
  const handleCareerChange = (newCareer) => {
    setSelectedCareer(newCareer);
    setRecommendation(null);
    setHasGenerated(false);
    setError(null);
  };

  // Requirement: If the user adds/removes known skills, reset old results until generated again
  const handleSkillsChange = (newSkills) => {
    setSkills(newSkills);
    setRecommendation(null);
    setHasGenerated(false);
    setError(null);
  };

  const runRecommendation = async (career, skillList) => {
    // If Option A, require a career goal
    if (inputOption === 'option_a' && (!career || !career.trim())) {
      setError('Please select or enter your target career domain.');
      return;
    }

    if (!skillList || skillList.length === 0) {
      setError('Please enter at least one skill you currently know.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In Option B, career is null/empty to infer from skills
      const targetCareer = (inputOption === 'option_a' && career) ? career : (career || null);
      const res = await getRecommendations(targetCareer, skillList);
      if (res.success) {
        setRecommendation(res);
        setHasGenerated(true);
      } else {
        setError(res.error || 'Failed to generate recommendations.');
        setHasGenerated(false);
      }
    } catch (err) {
      setError('Could not connect to recommendation engine. Please ensure the backend is running.');
      setHasGenerated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    const careerToUse = inputOption === 'option_a' ? selectedCareer : null;
    runRecommendation(careerToUse, skills);
  };

  const handleSelectSample = (sample) => {
    setSelectedCareer(sample.career_goal);
    setSkills(sample.skills);
    setInputOption('option_a');
    setRecommendation(null);
    setHasGenerated(false);
    setError(null);
  };

  const handleSkillsFromResume = (extracted) => {
    const lowerExisting = new Set(skills.map(s => s.toLowerCase()));
    const newItems = extracted.filter(s => !lowerExisting.has(s.toLowerCase()));
    const updated = [...skills, ...newItems];
    setSkills(updated);
    setRecommendation(null);
    setHasGenerated(false);
    setError(null);
  };

  // When user clicks "View Complete Roadmap" for a specific course or inferred domain
  const handleSelectCourseRoadmap = (targetGoal) => {
    setSelectedCareer(targetGoal);
    setInputOption('option_a');
    runRecommendation(targetGoal, skills);
  };

  const handleProfileSaved = (profileId) => {
    setSelectedProfileId(profileId);
  };

  return (
    <div className="app-wrapper">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {/* Streamlined Header */}
        <div style={{ marginBottom: '22px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
            Skill Recommendation & Learning Resources
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
            Discover personalized learning roadmaps, verified courses, and hands-on exercises tailored to your known competencies.
          </p>
        </div>

        {/* Tab 1: Recommender Dashboard */}
        {activeTab === 'recommend' ? (
          <div>
            {/* Initially, show ONLY the configuration card. Hide all results until user clicks button */}
            {!hasGenerated || !recommendation ? (
              <div style={{ maxWidth: '820px', margin: '0 auto' }}>
                <div className="ui-card">
                  <div className="ui-card-header" style={{ paddingBottom: '12px' }}>
                    <div className="ui-card-title">
                      <Sparkles size={18} color="#4F46E5" />
                      Configure Your Skill Input
                    </div>
                  </div>

                  <div className="ui-card-body">
                    {/* Option A / Option B Selector Tabs */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      <button
                        type="button"
                        onClick={() => handleOptionSwitch('option_a')}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: inputOption === 'option_a' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                          background: inputOption === 'option_a' ? '#EEF2FF' : '#F8FAFC',
                          color: inputOption === 'option_a' ? '#4F46E5' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <GraduationCap size={16} />
                        <strong>Option A:</strong> Target Domain & Skills
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOptionSwitch('option_b')}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: inputOption === 'option_b' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                          background: inputOption === 'option_b' ? '#EEF2FF' : '#F8FAFC',
                          color: inputOption === 'option_b' ? '#4F46E5' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Compass size={16} />
                        <strong>Option B:</strong> Skills Only (Infer Paths)
                      </button>
                    </div>

                    {/* Explanatory note */}
                    <p style={{ fontSize: '0.83rem', color: '#64748B', marginBottom: '16px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      {inputOption === 'option_a' 
                        ? 'Select a target domain and enter your known skills to evaluate curriculum readiness, missing skills, and course recommendations.'
                        : 'Enter the skills you currently possess without picking a domain. The system will infer relevant career paths and recommend verified courses.'}
                    </p>

                    {/* Sample Profiles Quick Load */}
                    {inputOption === 'option_a' && (
                      <SampleProfiles
                        samples={sampleProfiles}
                        onSelectSample={handleSelectSample}
                      />
                    )}

                    {/* Resume PDF Upload */}
                    <ResumeUploader onSkillsExtracted={handleSkillsFromResume} />

                    <form onSubmit={handleFormSubmit}>
                      {/* Option A: Career Goal Selector */}
                      {inputOption === 'option_a' && (
                        <CareerSelector
                          careers={careers}
                          selectedCareer={selectedCareer}
                          setSelectedCareer={handleCareerChange}
                        />
                      )}

                      {/* Skill Tags Input with Autocomplete from 1+ chars */}
                      <SkillInput
                        skills={skills}
                        setSkills={handleSkillsChange}
                        allAvailableSkills={allSkills}
                      />

                      {error && (
                        <div className="alert alert-danger" style={{ marginTop: '14px' }}>
                          <AlertCircle size={16} />
                          <span>{error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ 
                          marginTop: '20px', 
                          width: '100%', 
                          justifyContent: 'center', 
                          padding: '12px 24px', 
                          fontSize: '0.96rem', 
                          fontWeight: 700 
                        }}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            Analyzing Competencies & Finding Resources...
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            Find Learning Resources
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              /* Displayed ONLY after clicking Find Learning Resources */
              <div>
                {/* Check if Option B returned inferred paths */}
                {recommendation?.is_skills_only ? (
                  <div>
                    {/* Option B Top 3 Recommended Domains View */}
                    <div style={{ marginBottom: '22px' }}>
                      <div className="alert alert-info" style={{ background: '#EEF2FF', borderColor: '#C7D2FE', color: '#3730A3', padding: '16px 20px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Compass size={22} color="#4F46E5" />
                            <strong style={{ fontSize: '1.1rem', color: '#1E1B4B' }}>
                              Top 3 Recommended Career Domains for You
                            </strong>
                          </div>
                          <span style={{ fontSize: '0.78rem', background: '#FFFFFF', color: '#4F46E5', border: '1px solid #C7D2FE', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>
                            Ranked by Skill Match %
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.86rem', color: '#4338CA', lineHeight: 1.5 }}>
                          Based on your <strong>{skills.length} known competencies</strong>, our AI engine analyzed all 11 technical tracks using the objective formula:
                          <br />
                          <code style={{ background: '#E0E7FF', padding: '2px 6px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#312E81' }}>
                            Skill Match (%) = (Number of acquired required skills ÷ Total required skills for domain) × 100
                          </code>
                        </p>
                      </div>
                    </div>

                    {/* Top 3 Domain Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '26px' }}>
                      {(recommendation.top_3_domains || recommendation.courses || []).slice(0, 3).map((domain, idx) => {
                        const rankLabels = ["🥇 #1 Best Match", "🥈 #2 Strong Fit", "🥉 #3 Recommended Track"];
                        const rankLabel = rankLabels[idx] || `#${idx + 1} Match`;
                        const isTop = idx === 0;
                        const matchingList = domain.matching_skills || domain.acquired_skills || [];
                        const missingList = domain.missing_skills || [];

                        return (
                          <div
                            key={idx}
                            className="ui-card"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              padding: '22px',
                              border: isTop ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                              borderRadius: '14px',
                              background: isTop ? '#FAFAFF' : '#FFFFFF',
                              boxShadow: isTop ? '0 8px 20px -4px rgba(79, 70, 229, 0.15)' : '0 2px 6px rgba(0,0,0,0.04)',
                              position: 'relative'
                            }}
                          >
                            <div>
                              {/* Header & Badges */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  background: isTop ? '#4F46E5' : '#F1F5F9',
                                  color: isTop ? '#FFFFFF' : '#475569',
                                  padding: '4px 10px',
                                  borderRadius: '6px'
                                }}>
                                  {rankLabel}
                                </span>
                                <span style={{
                                  fontSize: '1rem',
                                  fontWeight: 800,
                                  color: '#059669',
                                  background: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  padding: '4px 12px',
                                  borderRadius: '8px',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  {domain.match_percentage}% Match
                                </span>
                              </div>

                              {/* Domain Name */}
                              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                                {domain.domain_name || domain.career_goal}
                              </h2>

                              {/* Match Progress Bar */}
                              <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden', marginBottom: '8px' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(100, domain.match_percentage)}%`,
                                    background: isTop ? '#4F46E5' : '#10B981',
                                    borderRadius: '999px',
                                    transition: 'width 0.4s ease'
                                  }}
                                />
                              </div>

                              <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '14px' }}>
                                <strong>{matchingList.length}</strong> of {domain.total_required} required skills acquired • <strong>{missingList.length}</strong> to learn
                              </p>

                              {/* Matching Known Skills */}
                              <div style={{ marginBottom: '14px' }}>
                                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                  ✓ Matching Known Skills ({matchingList.length}):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                  {matchingList.length === 0 ? (
                                    <span style={{ fontSize: '0.76rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                      No required competencies acquired yet.
                                    </span>
                                  ) : (
                                    matchingList.map((sk) => (
                                      <span
                                        key={sk}
                                        style={{
                                          background: '#ECFDF5',
                                          border: '1px solid #A7F3D0',
                                          color: '#065F46',
                                          fontSize: '0.74rem',
                                          padding: '2px 8px',
                                          borderRadius: '999px',
                                          fontWeight: 600
                                        }}
                                      >
                                        ✓ {sk}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Missing Required Skills */}
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                  ○ Missing Skills to Learn ({missingList.length}):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                  {missingList.slice(0, 6).map((sk) => (
                                    <span
                                      key={sk}
                                      style={{
                                        background: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        color: '#991B1B',
                                        fontSize: '0.74rem',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontWeight: 600
                                      }}
                                    >
                                      ○ {sk}
                                    </span>
                                  ))}
                                  {missingList.length > 6 && (
                                    <span style={{ fontSize: '0.74rem', color: '#64748B', alignSelf: 'center' }}>
                                      +{missingList.length - 6} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{
                                  width: '100%',
                                  justifyContent: 'center',
                                  fontSize: '0.88rem',
                                  fontWeight: 700,
                                  padding: '11px 16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                                onClick={() => handleSelectCourseRoadmap(domain.domain_name || domain.career_goal)}
                              >
                                Select Domain & View Roadmap <ArrowRight size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setRecommendation(null);
                          setHasGenerated(false);
                        }}
                      >
                        &larr; Update Known Skills or Change Input Option
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Option A (or Option B chosen course): Detailed Roadmap & Stats */
                  <div className="dashboard-grid">
                    {/* Left Column: Form & Inputs */}
                    <div>
                      <div className="ui-card">
                        <div className="ui-card-header">
                          <div className="ui-card-title">
                            <Sparkles size={18} color="#4F46E5" />
                            Target Domain & Known Skills
                          </div>
                        </div>

                        <div className="ui-card-body">
                          {/* Option Switcher in Sidebar */}
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                            <button
                              type="button"
                              onClick={() => handleOptionSwitch('option_a')}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: inputOption === 'option_a' ? '1.5px solid #4F46E5' : '1px solid #E2E8F0',
                                background: inputOption === 'option_a' ? '#EEF2FF' : '#F8FAFC',
                                color: inputOption === 'option_a' ? '#4F46E5' : '#64748B',
                                fontWeight: 700,
                                fontSize: '0.76rem',
                                cursor: 'pointer'
                              }}
                            >
                              Domain + Skills
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOptionSwitch('option_b')}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: inputOption === 'option_b' ? '1.5px solid #4F46E5' : '1px solid #E2E8F0',
                                background: inputOption === 'option_b' ? '#EEF2FF' : '#F8FAFC',
                                color: inputOption === 'option_b' ? '#4F46E5' : '#64748B',
                                fontWeight: 700,
                                fontSize: '0.76rem',
                                cursor: 'pointer'
                              }}
                            >
                              Skills Only
                            </button>
                          </div>

                          <form onSubmit={handleFormSubmit}>
                            {inputOption === 'option_a' && (
                              <CareerSelector
                                careers={careers}
                                selectedCareer={selectedCareer}
                                setSelectedCareer={handleCareerChange}
                              />
                            )}

                            <SkillInput
                              skills={skills}
                              setSkills={handleSkillsChange}
                              allAvailableSkills={allSkills}
                            />

                            {error && (
                              <div className="alert alert-danger" style={{ marginTop: '14px' }}>
                                <AlertCircle size={16} />
                                <span>{error}</span>
                              </div>
                            )}

                            <button
                              type="submit"
                              className="btn-primary"
                              disabled={loading}
                              style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="animate-spin" size={18} />
                                  Analyzing Profile...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={18} />
                                  Find Learning Resources
                                </>
                              )}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Recommendations, Stats & Roadmap */}
                    <div>
                      {loading ? (
                        <div className="ui-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                          <Loader2 className="animate-spin" size={36} color="#4F46E5" style={{ margin: '0 auto 16px auto' }} />
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>Analyzing Prerequisites & Skill Readiness...</h3>
                          <p style={{ color: '#64748B', fontSize: '0.86rem', marginTop: '4px' }}>
                            Comparing profile with {selectedCareer} curriculum and ML probability weights.
                          </p>
                        </div>
                      ) : (
                        <div>
                          {/* Displays Skill Match Percentage, Verified Course Hero Card, and Missing Skills */}
                          <MatchStats recommendation={recommendation} />
                          {/* Displays Learning Roadmap (with interactive completion), Courses Tab, and Suggested Projects */}
                          <RecommendationsView 
                            recommendation={recommendation} 
                            onProfileSaved={handleProfileSaved} 
                            onSelectCourseRoadmap={handleSelectCourseRoadmap}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Progress Tracker & Saved Profiles */
          <ProgressTracker 
            selectedProfileId={selectedProfileId}
            onProfileSelect={(id) => setSelectedProfileId(id)}
          />
        )}
      </main>
    </div>
  );
}
