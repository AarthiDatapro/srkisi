import "../theme/interview.css";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../../constants/english/student_mock_interview_constants_english.js";

const TONE_KEYS = [
  ["clarity", ENGLISH.clarity],
  ["fluency_of_expression", ENGLISH.fluency],
  ["answer_structure", ENGLISH.structure],
  ["logical_flow", ENGLISH.logical_flow],
  ["articulation", ENGLISH.articulation],
  ["relevance", ENGLISH.relevance],
  ["conciseness", ENGLISH.conciseness],
  ["explanation_ability", ENGLISH.explanation]
];

const WORD_KEYS = [
  ["vocabulary_richness", ENGLISH.richness],
  ["vocabulary_variety", ENGLISH.variety],
  ["technical_vocabulary", ENGLISH.technical_terms],
  ["professional_language", ENGLISH.professional_language],
  ["grammar", ENGLISH.grammar],
  ["sentence_construction", ENGLISH.sentences]
];

function score_of(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function title_of(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Meters({ source, keys, max = 10 }) {
  const rows = keys.
    map(([key, label]) => ({ label, value: score_of(source?.[key]) })).
    filter((row) => row.value != null);
  if (!rows.length) return null;
  return (
    <ul className="snt_meters">
      {rows.map((row) =>
        <li key={row.label}>
          <span>{row.label}</span>
          <i><b style={{ width: `${Math.max(0, Math.min(100, (row.value / max) * 100))}%` }} /></i>
          <em>{row.value}/{max}</em>
        </li>
      )}
    </ul>
  );
}

function Lines({ items, empty }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return empty ? <p className="snt_muted">{empty}</p> : null;
  return (
    <ul className="snt_lines">
      {list.map((line) => <li key={line}>{line}</li>)}
    </ul>
  );
}

export function Sentiment_Panel({ analysis }) {
  if (!analysis || analysis.status === "failed" || analysis.status === "unavailable") {
    return <p className="snt_muted">{analysis?.message || ENGLISH.sentiment_analysis_is_not_available_for_this_interview}</p>;
  }
  const sentiment = analysis.sentiment_analysis || {};
  const communication = analysis.communication_analysis || {};
  const vocabulary = analysis.vocabulary_analysis || {};
  const overall = analysis.overall_assessment || {};
  const positive = score_of(sentiment.positive_percentage) || 0;
  const neutral = score_of(sentiment.neutral_percentage) || 0;
  const negative = score_of(sentiment.negative_percentage) || 0;
  const mix = positive + neutral + negative || 1;
  const answers = Array.isArray(sentiment.answer_sentiments) ? sentiment.answer_sentiments : [];

  return (
    <div className="snt">
      <section className="snt_card is_mood">
        <div className="snt_hero">
          <div
            className="snt_donut"
            style={{
              "--snt-pos-end": `${(positive / mix) * 100}%`,
              "--snt-mid-end": `${((positive + neutral) / mix) * 100}%`
            }}>
            <div>
              <strong>{title_of(sentiment.overall_sentiment) || "—"}</strong>
            </div>
          </div>
          <ul className="snt_legend">
            <li className="is_pos"><b>{positive}%</b><span>{ENGLISH.positive}</span></li>
            <li className="is_mid"><b>{neutral}%</b><span>{ENGLISH.neutral}</span></li>
            <li className="is_neg"><b>{negative}%</b><span>{ENGLISH.negative}</span></li>
          </ul>
        </div>
        {sentiment.expressed_confidence ?
          <p className="snt_confidence">{ENGLISH.confidence}{title_of(sentiment.expressed_confidence)}</p> :
          null}
        {sentiment.sentiment_summary ? <p className="snt_quote">{sentiment.sentiment_summary}</p> : null}
        {answers.length ?
          <ol className="snt_answers">
            {answers.map((item) =>
              <li key={item.question_number} className={`snt_answer is_${item.sentiment || "neutral"}`}>
                <b>{ENGLISH.q}{item.question_number}</b>
                <span>{title_of(item.sentiment)}</span>
                <small>{item.explanation}</small>
              </li>
            )}
          </ol> :
          null}
      </section>

      <section className="snt_card">
        <header>
          <h3>{ENGLISH.communication_analysis}</h3>
          {score_of(communication.communication_score) != null ? <b>{communication.communication_score}/10</b> : null}
        </header>
        <Meters source={communication} keys={TONE_KEYS} />
        <div className="snt_two">
          <div className="snt_block is_good">
            <h4>{ENGLISH.strengths}</h4>
            <Lines items={communication.strengths} empty={ENGLISH.none_noted} />
          </div>
          <div className="snt_block is_gap">
            <h4>{ENGLISH.weaknesses}</h4>
            <Lines items={communication.weaknesses} empty={ENGLISH.none_noted} />
          </div>
        </div>
        {Array.isArray(communication.improvement_suggestions) && communication.improvement_suggestions.length ?
          <div className="snt_block">
            <h4>{ENGLISH.how_to_improve}</h4>
            <Lines items={communication.improvement_suggestions} />
          </div> :
          null}
      </section>

      <section className="snt_card">
        <header>
          <h3>{ENGLISH.vocabulary_analysis}</h3>
          {score_of(vocabulary.vocabulary_score) != null ? <b>{vocabulary.vocabulary_score}/10</b> : null}
        </header>
        <Meters source={vocabulary} keys={WORD_KEYS} />
        {Array.isArray(vocabulary.frequently_repeated_words) && vocabulary.frequently_repeated_words.length ?
          <p className="snt_chips"><span>{ENGLISH.often_repeated}</span>{vocabulary.frequently_repeated_words.map((word) => <em key={word}>{word}</em>)}</p> :
          null}
        {Array.isArray(vocabulary.recommended_professional_words) && vocabulary.recommended_professional_words.length ?
          <p className="snt_chips is_good"><span>{ENGLISH.try_these_words}</span>{vocabulary.recommended_professional_words.map((word) => <em key={word}>{word}</em>)}</p> :
          null}
        {Array.isArray(vocabulary.improvement_tips) && vocabulary.improvement_tips.length ?
          <div className="snt_block">
            <Lines items={vocabulary.improvement_tips} />
          </div> :
          null}
      </section>

      <section className="snt_card">
        <header>
          <h3>{ENGLISH.overall_assessment}</h3>
          {score_of(overall.confidence_in_expression_score) != null ? <b>{ENGLISH.expression}{overall.confidence_in_expression_score}/10</b> : null}
        </header>
        {overall.overall_interview_assessment ? <p className="snt_quote">{overall.overall_interview_assessment}</p> : null}
        {overall.final_candidate_feedback ? <p className="snt_quote">{overall.final_candidate_feedback}</p> : null}
        <div className="snt_two">
          <div className="snt_block is_good">
            <h4>{ENGLISH.top_strengths}</h4>
            <Lines items={overall.top_strengths} />
          </div>
          <div className="snt_block is_gap">
            <h4>{ENGLISH.areas_to_improve}</h4>
            <Lines items={overall.areas_for_improvement} />
          </div>
        </div>
        {Array.isArray(overall.personalized_recommendations) && overall.personalized_recommendations.length ?
          <div className="snt_block">
            <h4>{ENGLISH.what_to_do_next}</h4>
            <Lines items={overall.personalized_recommendations} />
          </div> :
          null}
      </section>
    </div>
  );
}
