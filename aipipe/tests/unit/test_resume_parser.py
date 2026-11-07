from resume_analyzer.parser import parse_structured_result
from resume_analyzer.schemas import JobMatchAnalysis


def test_parse_structured_result_unwraps_nested_job_match_payload():
    payload = {
        "job_match_analysis": {
            "candidate_name": "Jane Doe",
            "target_role": "Senior Data Engineer",
            "professional_summary": "Strong background in Python, SQL, and analytics workflows.",
            "total_experience": "6 years",
            "matched_skills": ["Python", "SQL", "ETL"],
            "partially_matched_skills": ["Airflow"],
            "missing_skills": ["Spark"],
            "relevant_experience": ["Built data pipelines for product analytics"],
            "relevant_projects": ["Migrated warehouse reporting pipeline"],
            "education_match": "Bachelor's in Computer Science",
            "strengths_for_role": ["Strong data engineering experience"],
            "gaps": ["Need distributed processing exposure"],
            "recommendations": ["Add Spark and orchestration experience"],
            "keyword_coverage_score": 92,
            "experience_match_score": 90,
            "skills_match_score": 88,
            "overall_match_score": 92,
            "feedback": "Good fit with a few gaps.",
        }
    }

    result = parse_structured_result(payload, JobMatchAnalysis)

    assert isinstance(result, JobMatchAnalysis)
    assert result.professional_summary == "Strong background in Python, SQL, and analytics workflows."
    assert result.overall_match_score == 92
    assert result.matched_skills == ["Python", "SQL", "ETL"]
