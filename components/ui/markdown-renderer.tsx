import React from "react";

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];
  
  let currentListItems: React.ReactNode[] = [];
  let listKey = 0;

  const parseInlineStyles = (text: string) => {
    // Basic bold parser (**text**)
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className="font-bold text-slate-900 bg-sky-50/50 px-1 py-0.5 rounded">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-${listKey++}`} className="list-disc pl-5 mb-3 space-y-1.5 text-slate-700">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a bullet item
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      const cleanLine = line.trim().substring(2);
      currentListItems.push(
        <li key={`li-${i}`} className="text-sm leading-6">
          {parseInlineStyles(cleanLine)}
        </li>
      );
    } else {
      // Flush list if we transition to non-list lines
      flushList();

      if (line.trim() === "") {
        renderedElements.push(<div key={`br-${i}`} className="h-2" />);
      } else if (line.trim().startsWith("###")) {
        const cleanLine = line.replace(/^###\s*/, "");
        renderedElements.push(
          <h4 key={`h-${i}`} className="text-sm font-bold text-slate-900 mt-4 mb-2 pl-1.5 border-l-2 border-sky-500">
            {parseInlineStyles(cleanLine)}
          </h4>
        );
      } else if (line.trim().startsWith("##")) {
        const cleanLine = line.replace(/^##\s*/, "");
        renderedElements.push(
          <h3 key={`h-${i}`} className="text-base font-bold text-slate-900 mt-5 mb-2.5">
            {parseInlineStyles(cleanLine)}
          </h3>
        );
      } else {
        renderedElements.push(
          <p key={`p-${i}`} className="text-sm leading-6 text-slate-750">
            {parseInlineStyles(line)}
          </p>
        );
      }
    }
  }

  // Flush any remaining list items
  flushList();

  return <div className="space-y-1">{renderedElements}</div>;
}
