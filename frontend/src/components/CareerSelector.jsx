import React, { useState } from 'react';
import { Briefcase, HelpCircle, Edit3 } from 'lucide-react';

export default function CareerSelector({ careers, selectedCareer, setSelectedCareer }) {
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const currentCareerObj = careers.find(c => c.name.toLowerCase() === selectedCareer?.toLowerCase());

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustom(true);
      setSelectedCareer(customInput || '');
    } else {
      setIsCustom(false);
      setSelectedCareer(val);
    }
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomInput(val);
    setSelectedCareer(val);
  };

  return (
    <div className="form-group">
      <div className="form-label">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Briefcase size={16} color="#4F46E5" />
          Target Career Goal
        </span>
        <button
          type="button"
          onClick={() => {
            setIsCustom(!isCustom);
            if (!isCustom) {
              setCustomInput(selectedCareer);
            }
          }}
          style={{ fontSize: '0.74rem', color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '3px' }}
        >
          <Edit3 size={12} />
          {isCustom ? 'Choose standard career' : 'Type custom/unknown career'}
        </button>
      </div>

      {!isCustom ? (
        <select
          className="form-select"
          value={selectedCareer}
          onChange={handleSelectChange}
        >
          <option value="" disabled>-- Select Your Target Career Goal --</option>
          {careers.map((career) => (
            <option key={career.name} value={career.name}>
              {career.name} ({career.skill_count} skills)
            </option>
          ))}
          <option value="__custom__">Custom / Other Career Path...</option>
        </select>
      ) : (
        <div>
          <input
            type="text"
            className="form-input"
            placeholder="Type a career goal (e.g. AI Architect, Blockchain Dev, Game Dev)..."
            value={customInput}
            onChange={handleCustomChange}
          />
          <small style={{ color: '#64748B', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>
            Enter any target role to find matching skill roadmaps.
          </small>
        </div>
      )}

      {/* Required Skills Preview */}
      {currentCareerObj && (
        <div style={{ marginTop: '10px', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Career Curriculum ({currentCareerObj.skill_count} Skills in Prerequisite Order):
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
            {currentCareerObj.required_skills.map((s, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.72rem',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                {idx + 1}. {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
