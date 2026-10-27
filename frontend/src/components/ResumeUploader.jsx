import React, { useState, useRef } from 'react';
import { FileUp, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadResume } from '../services/api';

export default function ResumeUploader({ onSkillsExtracted }) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF document (.pdf).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadResume(file);
      if (data.success) {
        setResult(data);
        if (onSkillsExtracted) {
          onSkillsExtracted(data.skills);
        }
      } else {
        setError(data.error || 'Could not parse resume.');
      }
    } catch (err) {
      setError('Failed to upload and parse resume. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      <div
        className={`resume-box ${isDragging ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="resume-upload-label">
          {loading ? (
            <Loader2 className="animate-spin" size={26} color="#4F46E5" />
          ) : (
            <FileUp size={26} color="#4F46E5" />
          )}

          <div>
            <span>{loading ? 'Analyzing resume with PDF parser...' : 'Upload Resume PDF to Auto-Extract Skills'}</span>
            <small style={{ display: 'block', marginTop: '2px' }}>
              Drag & drop or click to browse (PDF only). Skills can be manually reviewed and edited below.
            </small>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '8px', padding: '8px 12px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="alert alert-info" style={{ marginTop: '8px', padding: '8px 12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <span>Extracted <strong>{result.skills_count}</strong> technical skills from your resume!</span>
          </div>
          <span style={{ fontSize: '0.74rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #C7D2FE' }}>
            {result.word_count} words scanned
          </span>
        </div>
      )}
    </div>
  );
}
