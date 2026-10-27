import io
import re
from typing import List, Dict, Any
from pypdf import PdfReader
try:
    from recommender import SKILL_ALIASES, SKILL_RESOURCES
except ImportError:
    from backend.recommender import SKILL_ALIASES, SKILL_RESOURCES

def extract_skills_from_pdf(pdf_bytes_or_file) -> Dict[str, Any]:
    """
    Extract text from uploaded resume PDF and match against comprehensive
    technical skill keywords and aliases.
    """
    try:
        reader = PdfReader(pdf_bytes_or_file)
        full_text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                full_text += " " + extracted
        
        if not full_text.strip():
            return {
                "success": False,
                "error": "Could not extract readable text from PDF. The file may be image-only or encrypted."
            }

        # Normalize text for searching
        text_lower = full_text.lower()
        
        # Word boundary and phrase matching
        detected_skills = set()
        matched_tokens = []
        
        # Sort aliases by length descending so longer phrases match first
        sorted_aliases = sorted(SKILL_ALIASES.keys(), key=lambda x: len(x), reverse=True)
        
        for alias in sorted_aliases:
            canon = SKILL_ALIASES[alias]
            if canon in detected_skills:
                continue
                
            # Regex with word boundaries
            # Handle special characters like C++, C#, .NET, .js
            escaped = re.escape(alias)
            pattern = rf'(?:^|[\s,;:\(\)\[\]\/\-\|]){escaped}(?:$|[\s,;:\(\)\[\]\/\-\|\.\?])'
            
            if re.search(pattern, text_lower):
                detected_skills.add(canon)
                matched_tokens.append({"token": alias, "canonical": canon})

        # Also check direct canon names
        for canon in SKILL_RESOURCES.keys():
            if canon not in detected_skills:
                escaped = re.escape(canon.lower())
                pattern = rf'(?:^|[\s,;:\(\)\[\]\/\-\|]){escaped}(?:$|[\s,;:\(\)\[\]\/\-\|\.\?])'
                if re.search(pattern, text_lower):
                    detected_skills.add(canon)
                    matched_tokens.append({"token": canon, "canonical": canon})

        skills_list = sorted(list(detected_skills))

        return {
            "success": True,
            "skills": skills_list,
            "skills_count": len(skills_list),
            "matched_details": matched_tokens,
            "char_count": len(full_text),
            "word_count": len(full_text.split()),
            "message": f"Successfully detected {len(skills_list)} technical skills from resume."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error parsing PDF file: {str(e)}"
        }
