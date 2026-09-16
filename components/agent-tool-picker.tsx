"use client";

import "./agent-tool-picker.css";
import { Checkbox } from "@/components/ui/checkbox";
import { MCP_TOOL_COUNT, MCP_TOOL_GROUPS } from "@/lib/mcp-tool-catalog";

export function AgentToolPicker({
  selected,
  onChange,
}: {
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}) {
  const allTools = MCP_TOOL_GROUPS.flatMap((group) => [...group.tools]);

  function toggleTool(tool: string, enabled: boolean) {
    const next = new Set(selected);
    if (enabled) next.add(tool);
    else next.delete(tool);
    onChange(next);
  }

  function toggleGroup(tools: readonly string[], enabled: boolean) {
    const next = new Set(selected);
    for (const tool of tools) {
      if (enabled) next.add(tool);
      else next.delete(tool);
    }
    onChange(next);
  }

  return (
    <div className="agent-tool-picker">
      <div className="agent-tool-picker__toolbar">
        <p className="agent-tool-picker__summary">
          {selected.size} de {MCP_TOOL_COUNT} ferramentas habilitadas
        </p>
        <div className="agent-tool-picker__bulk">
          <button type="button" className="agent-tool-picker__bulk-btn" onClick={() => onChange(new Set(allTools))}>
            Marcar todas
          </button>
          <button type="button" className="agent-tool-picker__bulk-btn" onClick={() => onChange(new Set())}>
            Desmarcar todas
          </button>
        </div>
      </div>
      <div className="agent-tool-picker__groups">
        {MCP_TOOL_GROUPS.map((group) => {
          const groupTools = [...group.tools];
          const enabledCount = groupTools.filter((tool) => selected.has(tool)).length;
          const allEnabled = enabledCount === groupTools.length;
          const noneEnabled = enabledCount === 0;
          return (
            <details key={group.id} className="agent-tool-picker__group">
              <summary className="agent-tool-picker__group-head">
                <span className="agent-tool-picker__group-toggle" aria-hidden="true" />
                <div
                  className="agent-tool-picker__group-select"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={allEnabled ? true : noneEnabled ? false : "indeterminate"}
                    onCheckedChange={(value) => toggleGroup(groupTools, value === true)}
                    aria-label={`Marcar todas as ferramentas de ${group.label}`}
                  />
                  <span className="agent-tool-picker__group-title">{group.label}</span>
                </div>
                <span className="agent-tool-picker__group-count">
                  {enabledCount}/{groupTools.length}
                </span>
              </summary>
              <ul className="agent-tool-picker__list">
                {groupTools.map((tool) => (
                  <li key={tool}>
                    <label className="agent-tool-picker__item">
                      <Checkbox
                        checked={selected.has(tool)}
                        onCheckedChange={(value) => toggleTool(tool, value === true)}
                      />
                      <code>{tool}</code>
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
