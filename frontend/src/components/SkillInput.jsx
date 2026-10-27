import React, { useState } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';

export default function SkillInput({ skills, setSkills, allAvailableSkills }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const addSkill = (skillToAdd) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;

    // Check if comma-separated list was pasted or entered
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(s => s.strip ? s.strip() : s.trim()).filter(Boolean);
      const uniqueNew = parts.filter(p => !skills.some(s => s.toLowerCase() === p.toLowerCase()));
      if (uniqueNew.length > 0) {
        setSkills([...skills, ...uniqueNew]);
      }
      setInputValue('');
      setSuggestions([]);
      return;
    }

    // Single skill
    const alreadyExists = skills.some(s => s.toLowerCase() === trimmed.toLowerCase());
    if (!alreadyExists) {
      setSkills([...skills, trimmed]);
    }
    setInputValue('');
    setSuggestions([]);
  };

  const removeSkill = (indexToRemove) => {
    setSkills(skills.filter((_, idx) => idx !== indexToRemove));
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const trimmed = val.trim();
    if (trimmed.length >= 1 && allAvailableSkills && allAvailableSkills.length > 0) {
      const filtered = allAvailableSkills.filter(
        s => s.toLowerCase().includes(trimmed.toLowerCase()) &&
             !skills.some(existing => existing.toLowerCase() === s.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addSkill(suggestions[0]);
      } else {
        addSkill(inputValue);
      }
    }
  };

  return (
    <div className="form-group">
      <div className="form-label">
        <span>Existing Skills ({skills.length})</span>
        {skills.length > 0 && (
          <button
            type="button"
            onClick={() => setSkills([])}
            style={{ fontSize: '0.74rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Trash2 size={13} /> Clear all
          </button>
        )}
      </div>

      {/* Tags Box */}
      <div className="tags-container">
        {skills.length === 0 ? (
          <span style={{ color: '#94A3B8', fontSize: '0.84rem', margin: 'auto 0' }}>
            No skills entered yet. Type below, select suggestions, or upload a resume PDF to auto-detect.
          </span>
        ) : (
          skills.map((skill, idx) => (
            <span key={idx} className="skill-tag">
              {skill}
              <button type="button" onClick={() => removeSkill(idx)} title="Remove skill">
                <X size={12} />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Input Row */}
      <div className="tag-input-row" style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Type a skill (e.g. JavaScript, Python, Docker) or paste comma-separated list..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => addSkill(inputValue)}
          style={{ flexShrink: 0 }}
        >
          <Plus size={16} /> Add
        </button>

        {/* Autocomplete Dropdown */}
        {suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            marginTop: '4px',
            zIndex: 30,
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {suggestions.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 14px',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseDown={() => addSkill(item)}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
              >
                <span>{item}</span>
                <span style={{ fontSize: '0.72rem', color: '#6366F1' }}>+ Select</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
