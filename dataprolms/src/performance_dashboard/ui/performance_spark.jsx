export function Performance_Spark({ points = [] }) {
  const values = points.map((item) => Number(item.value) || 0);
  const max = Math.max(...values, 1);
  const width = 280;
  const height = 64;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const dots = values.map((value, index) => {
    const x = index * step;
    const y = height - value / max * (height - 16) - 8;
    return { x, y };
  });
  const line = dots.map((dot) => `${dot.x},${dot.y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg className="po_spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="po_spark_fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#po_spark_fill)" points={area} />
      <polyline fill="none" stroke="#7dd3fc" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={line} />
      {dots.map((dot, index) =>
      <circle key={index} cx={dot.x} cy={dot.y} r="3.2" fill="#ffffff" stroke="#7dd3fc" strokeWidth="2" />
      )}
    </svg>);

}
