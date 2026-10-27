import React from 'react';
import { Sparkles } from 'lucide-react';

export default function SampleProfiles({ samples, onSelectSample }) {
  if (!samples || samples.length === 0) return null;

  return (
    <div className="samples-wrapper">
      <div className="samples-header">
        <Sparkles size={13} style={{ display: 'inline', marginRight: '4px' }} />
        Quick Test Profiles:
      </div>
      <div className="samples-chips">
        {samples.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className="sample-btn"
            onClick={() => onSelectSample(sample)}
            title={sample.description}
          >
            {sample.title}
          </button>
        ))}
      </div>
    </div>
  );
}
