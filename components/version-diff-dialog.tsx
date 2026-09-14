"use client";

import { useMemo, useState } from "react";
import { GitCompareArrows, Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentRecord, DocumentRelease } from "@/lib/documents";
import {
  compareVersions,
  formatVersionDiffSummaryStats,
  releaseSideId,
  resolveRestoreableRelease,
  resolveVersionDiffSource,
  versionDiffContentSummary,
  type VersionDiffLine,
  type VersionDiffSideId,
} from "@/lib/version-diff";
import { cn } from "@/lib/utils";

function VersionDiffContent({ lines, collapseUnchanged }: { lines: VersionDiffLine[]; collapseUnchanged: boolean }) {
  const visibleLines = useMemo(() => {
    if (!collapseUnchanged) return lines.map((line, index) => ({ line, index }));

    const rendered: Array<{ line: VersionDiffLine; index: number }> = [];
    let unchangedRun = 0;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.type === "unchanged") {
        unchangedRun += 1;
        continue;
      }

      if (unchangedRun > 0) {
        rendered.push({
          line: { type: "unchanged", line: `… ${unchangedRun} ${unchangedRun === 1 ? "linha igual" : "linhas iguais"} …` },
          index: index - unchangedRun,
        });
        unchangedRun = 0;
      }

      rendered.push({ line, index });
    }

    if (unchangedRun > 0) {
      rendered.push({
        line: { type: "unchanged", line: `… ${unchangedRun} ${unchangedRun === 1 ? "linha igual" : "linhas iguais"} …` },
        index: lines.length - unchangedRun,
      });
    }

    return rendered;
  }, [collapseUnchanged, lines]);

  return (
    <div className="version-diff-content" role="region" aria-label="Diferenças no conteúdo Markdown">
      {visibleLines.map(({ line, index }) => (
        <div
          className={cn(
            "version-diff-line",
            line.type === "added" && "added",
            line.type === "removed" && "removed",
            line.type === "unchanged" && line.line.startsWith("…") && "version-diff-collapsed",
          )}
          key={`${index}-${line.type}-${line.line.slice(0, 24)}`}
          aria-label={
            line.type === "added"
              ? `Linha adicionada: ${line.line}`
              : line.type === "removed"
                ? `Linha removida: ${line.line}`
                : undefined
          }
        >
          <span className="version-diff-gutter" aria-hidden="true">
            {line.type === "added" ? "+" : line.type === "removed" ? "−" : ""}
          </span>
          <span className="version-diff-text">{line.line}</span>
        </div>
      ))}
    </div>
  );
}

export function VersionDiffDialog({
  open,
  onOpenChange,
  document,
  releases,
  initialLeft,
  initialRight,
  canRestore = false,
  restorePending = false,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRecord;
  releases: DocumentRelease[];
  initialLeft: VersionDiffSideId;
  initialRight: VersionDiffSideId;
  canRestore?: boolean;
  restorePending?: boolean;
  onRestore?: (releaseId: string, version: number) => void;
}) {
  const sideOptions = useMemo(
    () => [
      { id: "draft" as const, label: "Rascunho atual" },
      ...releases.map((release) => ({
        id: releaseSideId(release.id),
        label: `v${release.version}${release.disabled ? " · desativada" : ""}`,
      })),
    ],
    [releases],
  );

  const [leftSideId, setLeftSideId] = useState<VersionDiffSideId>(initialLeft);
  const [rightSideId, setRightSideId] = useState<VersionDiffSideId>(initialRight);
  const [collapseUnchanged, setCollapseUnchanged] = useState(true);

  const diff = useMemo(() => {
    const left = resolveVersionDiffSource(leftSideId, document, releases);
    const right = resolveVersionDiffSource(rightSideId, document, releases);
    if (!left || !right) return null;
    return compareVersions(left, right);
  }, [document, leftSideId, releases, rightSideId]);

  const contentSummary = useMemo(
    () => (diff ? versionDiffContentSummary(diff.contentLines) : { added: 0, removed: 0 }),
    [diff],
  );

  const summaryStats = useMemo(
    () =>
      diff
        ? formatVersionDiffSummaryStats(diff.fieldChanges.length, contentSummary, diff.hasChanges)
        : null,
    [contentSummary, diff],
  );

  const restoreableRelease = useMemo(
    () => resolveRestoreableRelease(leftSideId, rightSideId, releases),
    [leftSideId, releases, rightSideId],
  );

  const swapSides = () => {
    setLeftSideId(rightSideId);
    setRightSideId(leftSideId);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) {
          setLeftSideId(initialLeft);
          setRightSideId(initialRight);
        }
      }}
    >
      <DialogContent className="version-diff-dialog w-[min(96vw,72rem)] max-w-[min(96vw,72rem)] sm:max-w-[min(96vw,72rem)]">
        <DialogHeader>
          <DialogTitle>Comparar versões</DialogTitle>
          <DialogDescription>
            Veja o que mudou entre duas versões. A <strong>base</strong> é o ponto de partida; linhas com <strong>−</strong> saíram dela e linhas com <strong>+</strong> existem só na outra versão.
          </DialogDescription>
        </DialogHeader>

        <div className="version-diff-controls">
          <Label htmlFor="version-diff-left" className="version-diff-control-label">
            Base
          </Label>
          <span className="version-diff-control-spacer" aria-hidden="true" />
          <Label htmlFor="version-diff-right" className="version-diff-control-label">
            Comparar com
          </Label>

          <Select value={leftSideId} onValueChange={(value) => setLeftSideId(value as VersionDiffSideId)}>
            <SelectTrigger id="version-diff-left" className="version-diff-control-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sideOptions.map((option) => (
                <SelectItem key={option.id} value={option.id} disabled={option.id === rightSideId}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" size="icon" className="version-diff-control-swap" onClick={swapSides} aria-label="Inverter lados">
            <GitCompareArrows />
          </Button>

          <Select value={rightSideId} onValueChange={(value) => setRightSideId(value as VersionDiffSideId)}>
            <SelectTrigger id="version-diff-right" className="version-diff-control-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sideOptions.map((option) => (
                <SelectItem key={option.id} value={option.id} disabled={option.id === leftSideId}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="version-diff-legend" aria-hidden="true">
          <span className="removed">− removido</span>
          <span className="added">+ adicionado</span>
        </div>

        {diff ? (
          <div className="version-diff-body">
            <div className="version-diff-summary">
              <strong>
                {diff.left.label} → {diff.right.label}
              </strong>
              <span>{diff.hasChanges ? summaryStats : "Conteúdo idêntico nestes campos"}</span>
            </div>

            {diff.fieldChanges.length ? (
              <section className="version-diff-fields" aria-label="Diferenças nos metadados">
                <header>Metadados</header>
                <dl>
                  {diff.fieldChanges.map((change) => (
                    <div key={change.key}>
                      <dt>{change.label}</dt>
                      <dd>
                        <div className="version-diff-field-value removed">
                          <span className="version-diff-field-label">Na base</span>
                          <span>{change.left || "—"}</span>
                        </div>
                        <div className="version-diff-field-value added">
                          <span className="version-diff-field-label">Na comparação</span>
                          <span>{change.right || "—"}</span>
                        </div>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <section className="version-diff-markdown" aria-label="Diferenças no conteúdo Markdown">
              <header>
                <span>Conteúdo Markdown</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCollapseUnchanged((current) => !current)}>
                  {collapseUnchanged ? "Mostrar linhas iguais" : "Ocultar linhas iguais"}
                </Button>
              </header>
              <VersionDiffContent lines={diff.contentLines} collapseUnchanged={collapseUnchanged} />
            </section>
          </div>
        ) : (
          <p className="version-diff-empty" role="status">
            Não foi possível carregar a comparação. Verifique as versões selecionadas.
          </p>
        )}

        <DialogFooter className="version-diff-footer">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {canRestore && restoreableRelease && onRestore ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" disabled={restorePending}>
                  <Undo2 />
                  Restaurar v{restoreableRelease.version} no rascunho
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar v{restoreableRelease.version} no rascunho?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O conteúdo, metadados e gabarito desta versão publicada substituirão o rascunho atual. As versões já publicadas não são alteradas — use Publicar depois para registrar uma nova release.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRestore(restoreableRelease.id, restoreableRelease.version)}>
                    Restaurar no rascunho
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
