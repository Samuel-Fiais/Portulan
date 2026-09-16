"use client";

export function CoordinationKindStamps({
  value,
  onChange,
  blockerHint,
}: {
  value: boolean;
  onChange: (isBlocker: boolean) => void;
  blockerHint: string;
}) {
  return (
    <div className="rumo-kind">
      <div className="rumo-kind__stamps" role="radiogroup" aria-label="Tipo do fio">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          className="rumo-kind__stamp"
          onClick={() => onChange(false)}
        >
          Conversa
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value}
          className="rumo-kind__stamp rumo-kind__stamp--blocker"
          onClick={() => onChange(true)}
        >
          Maré contrária
        </button>
      </div>
      {value ? <p className="rumo-kind__hint">{blockerHint}</p> : null}
    </div>
  );
}
