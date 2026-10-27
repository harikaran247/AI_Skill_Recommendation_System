import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

def train_and_evaluate(dataset_path='AI_Skill_Recommendation_Dataset.csv', output_dir='backend/models'):
    print(f"Loading dataset from: {dataset_path}")
    if not os.path.exists(dataset_path):
        # Check workspace root
        if os.path.exists('../' + dataset_path):
            dataset_path = '../' + dataset_path

    df = pd.read_csv(dataset_path)
    
    # Dataset verification
    row_count, col_count = df.shape
    columns = list(df.columns)
    missing_counts = df.isnull().sum().to_dict()
    
    print(f"Dataset Shape: {df.shape}")
    print(f"Columns: {columns}")
    print(f"Missing Values: {missing_counts}")
    
    # Preprocessing
    df['existing_skills'] = df['existing_skills'].fillna('').astype(str)
    df['career_goal'] = df['career_goal'].fillna('').astype(str)
    
    # Combine career_goal and existing_skills with distinct weighting or token structure
    df['combined_features'] = df['career_goal'] + " " + df['existing_skills']
    
    X = df['combined_features']
    y = df['recommended_next_skill']
    
    # Stratification: check if all classes have >= 2 samples
    class_counts = y.value_counts()
    min_count = class_counts.min()
    stratify = y if min_count >= 2 else None
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )
    
    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")
    
    # TF-IDF + Classifier Pipeline
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
        ('clf', LogisticRegression(max_iter=1000, C=10, solver='lbfgs'))
    ])
    
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    
    # Actual evaluation metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec_weighted = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    prec_macro = float(precision_score(y_test, y_pred, average='macro', zero_division=0))
    rec_weighted = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    rec_macro = float(recall_score(y_test, y_pred, average='macro', zero_division=0))
    f1_weighted = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
    f1_macro = float(f1_score(y_test, y_pred, average='macro', zero_division=0))
    
    cls_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    
    print("=" * 60)
    print("ACTUAL EVALUATION METRICS ON HELD-OUT TEST DATA (328 samples):")
    print(f"Accuracy:           {acc:.4f} ({acc*100:.2f}%)")
    print(f"Weighted Precision: {prec_weighted:.4f}")
    print(f"Weighted Recall:    {rec_weighted:.4f}")
    print(f"Weighted F1-Score:  {f1_weighted:.4f}")
    print(f"Macro F1-Score:     {f1_macro:.4f}")
    print("=" * 60)
    
    # Extract Career Knowledge Base & Skill Hierarchies from Dataset
    career_skills_map = {}
    skill_projects_map = {}
    skill_priority_map = {}
    
    for _, row in df.iterrows():
        c_goal = row['career_goal']
        req = [s.strip() for s in row['required_skills'].split(',') if s.strip()]
        if c_goal not in career_skills_map:
            career_skills_map[c_goal] = req
            
        next_s = row['recommended_next_skill'].strip()
        proj = row['suggested_project']
        prio = row['priority']
        
        if next_s not in skill_projects_map and pd.notna(proj):
            skill_projects_map[next_s] = str(proj).strip()
        if next_s not in skill_priority_map and pd.notna(prio):
            skill_priority_map[next_s] = str(prio).strip()

    # Save directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Save trained pipeline
    model_path = os.path.join(output_dir, 'pipeline.joblib')
    joblib.dump(pipeline, model_path)
    print(f"Saved trained pipeline to: {model_path}")
    
    # Save metrics and verification report
    metrics_data = {
        "dataset_verification": {
            "filename": "AI_Skill_Recommendation_Dataset.csv",
            "row_count": row_count,
            "column_count": col_count,
            "columns": columns,
            "missing_values": missing_counts,
            "careers_count": int(df['career_goal'].nunique()),
            "unique_skills_recommended": int(df['recommended_next_skill'].nunique()),
            "priority_distribution": df['priority'].value_counts().to_dict()
        },
        "evaluation_metrics": {
            "test_sample_count": len(y_test),
            "train_sample_count": len(y_train),
            "accuracy": acc,
            "accuracy_percent": round(acc * 100, 2),
            "precision_weighted": prec_weighted,
            "precision_macro": prec_macro,
            "recall_weighted": rec_weighted,
            "recall_macro": rec_macro,
            "f1_score_weighted": f1_weighted,
            "f1_score_macro": f1_macro,
            "algorithm": "TF-IDF Vectorizer (ngram 1-2) + Logistic Regression (C=10, lbfgs)",
            "classification_report": cls_report
        },
        "career_goals": list(career_skills_map.keys()),
        "career_skills_map": career_skills_map,
        "skill_projects_map": skill_projects_map,
        "skill_priority_map": skill_priority_map
    }
    
    metrics_path = os.path.join(output_dir, 'metrics.json')
    with open(metrics_path, 'w', encoding='utf-8') as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Saved metrics & career metadata to: {metrics_path}")

    return metrics_data

if __name__ == '__main__':
    train_and_evaluate()
