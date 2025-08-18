export default function TablaPreview({ rows }) {
  if (!rows.length) return null;
  return (
    <table border="1">
      <thead>
        <tr>
          {rows[0].map((_, idx) => (
            <th key={idx}>Col {idx + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
