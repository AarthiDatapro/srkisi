from pydantic import BaseModel, ConfigDict, Field


class ResumeAnalysis(BaseModel):
    """Resume analysis without a job description."""

    model_config = ConfigDict(extra="forbid")

    candidate_name: str | None = None
    target_role: str | None = None
    professional_summary: str
    total_experience: str
    current_or_recent_role: str | None = None

    skills: list[str] = Field(default_factory=list)
    technical_skills: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)

    education: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)

    strengths: list[str] = Field(default_factory=list)
    areas_for_improvement: list[str] = Field(default_factory=list)
    missing_resume_sections: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)

    clarity_score: float = Field(ge=0, le=100)
    completeness_score: float = Field(ge=0, le=100)
    impact_score: float = Field(ge=0, le=100)
    overall_score: float = Field(ge=0, le=100)

    feedback: str


class JobMatchAnalysis(BaseModel):
    """Resume comparison against a job description."""

    model_config = ConfigDict(extra="forbid")

    candidate_name: str | None = None
    target_role: str | None = None

    professional_summary: str
    total_experience: str

    matched_skills: list[str] = Field(default_factory=list)
    partially_matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)

    relevant_experience: list[str] = Field(default_factory=list)
    relevant_projects: list[str] = Field(default_factory=list)

    education_match: str

    strengths_for_role: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)

    keyword_coverage_score: float = Field(ge=0, le=100)
    experience_match_score: float = Field(ge=0, le=100)
    skills_match_score: float = Field(ge=0, le=100)
    overall_match_score: float = Field(ge=0, le=100)

    feedback: str