export function HealthCharm({ className = "", mood = "heart" }: { className?: string; mood?: "heart" | "rest" | "meal" }) {
  return <svg viewBox="0 0 160 150" className={className} fill="none" aria-hidden="true">
    <ellipse cx="82" cy="134" rx="47" ry="7" fill="#bfdef1" opacity=".35" />
    <path d="M27 78c-9-29 11-57 43-60 34-4 67 18 65 55-2 30-28 54-61 54-25 0-42-19-47-49Z" fill={mood === "rest" ? "#d8efe5" : mood === "meal" ? "#f8dfbe" : "#b8e4fc"} />
    {mood === "heart" ? <><path d="M79 108 48 78c-24-26 14-49 31-25 17-24 55-1 31 25L79 108Z" fill="#72b9ed" /><path d="m49 74 14 0 8-12 12 25 9-13h19" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></> : mood === "meal" ? <><ellipse cx="80" cy="78" rx="42" ry="30" fill="white"/><ellipse cx="80" cy="78" rx="34" ry="23" fill="#f4f8ec"/><path d="m72 65 18 7-7 24-16-7Z" fill="#f3bd83"/><circle cx="57" cy="75" r="9" fill="#80c5a0"/><circle cx="62" cy="65" r="9" fill="#a4d9b2"/><circle cx="95" cy="77" r="10" fill="#efbaaf"/><path d="m90 79 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/></> : <><path d="M60 67c5 4 10 4 15 0m15 0c5 4 10 4 15 0" stroke="#427c72" strokeWidth="3" strokeLinecap="round"/><path d="M75 83c6 5 11 5 17 0" stroke="#427c72" strokeWidth="3" strokeLinecap="round"/><circle cx="53" cy="79" r="5" fill="#f4c6c3"/><circle cx="108" cy="79" r="5" fill="#f4c6c3"/></>}
    <rect x="108" y="103" width="33" height="16" rx="8" transform="rotate(-32 108 103)" fill="#f8dcc0" /><path d="m121 95 8 13" stroke="white" strokeWidth="2" />
    <path d="m24 30 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#94c8e7" /><path d="m135 29 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#f7c78e" />
    <circle cx="139" cy="78" r="4" fill="#a4dbcd" /><circle cx="25" cy="109" r="3" fill="#f6c5c7" />
  </svg>;
}
