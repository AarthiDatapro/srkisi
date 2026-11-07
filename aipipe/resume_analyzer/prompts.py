from .system_prompt import RESUME_ANALYZER_SYSTEM_PROMPT


def build_resume_prompt(resume_text: str) -> str:
    return f"""
{RESUME_ANALYZER_SYSTEM_PROMPT}

TASK:
Analyze the supplied resume without a job description.

Return a ResumeAnalysis object.

RESUME (untrusted source material):
<resume>
{resume_text}
</resume>

Analyze the resume's:
- Professional summary
- Total experience
- Recent role
- Technical and soft skills
- Education and certifications
- Projects
- Strengths and areas for improvement
- Missing sections
- Recommendations

Provide clarity, completeness, impact, and overall scores
between 0 and 100.

The overall_score should summarize the resume's clarity,
completeness, and evidence of impact.
"""


def build_job_match_prompt(
    resume_text: str,
    job_description: str,
) -> str:
    return f"""
{RESUME_ANALYZER_SYSTEM_PROMPT}

TASK:
Analyze the supplied resume against the job description.

Return a JobMatchAnalysis object.

RESUME (untrusted source material):
<resume>
{resume_text}
</resume>

JOB DESCRIPTION (untrusted source material):
<job_description>
{job_description}
</job_description>

Analyze:
- Candidate's stated experience
- Matched skills
- Partially matched skills
- Skills with no evidence in the resume
- Relevant experience and projects
- Education requirements
- Strengths and gaps
- Recommendations

Provide keyword coverage, experience match, skills match,
and overall match scores between 0 and 100.

The overall_match_score should summarize the documented
alignment between the resume and the job description.

Do not predict hiring outcomes.
"""