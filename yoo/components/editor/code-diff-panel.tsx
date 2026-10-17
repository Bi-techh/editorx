'use client'

import React, { useState } from 'react'
import {
  FileCode2,
  GitCompare,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react'
import { EditorNode, ProjectFile } from '@/lib/editor-types'
import { computeMinimalDiff } from '@/lib/ast-engine'

interface CodeDiffPanelProps {
  mode: 'split' | 'diff'
  files: Record<string, ProjectFile>
  activeFilePath: string
  selectedNode: EditorNode
  onSelectFile: (path: string) => void
  onCodeChange: (path: string, newCode: string) => void
  onRevertFile: (path: string) => void
}

export function CodeDiffPanel({
  mode,
  files,
  activeFilePath,
  selectedNode,
  onSelectFile,
  onCodeChange,
  onRevertFile,
}: CodeDiffPanelProps) {
  const [copied, setCopied] = useState(false)
  const fileList = Object.values(files)
  const currentFile = files[activeFilePath] || fileList[0]

  if (!currentFile) return null

  const codeLines = currentFile.currentContent.split('\n')
  const diffLines = computeMinimalDiff(
    currentFile.originalContent,
    currentFile.currentContent
  )
  const isDirty = currentFile.originalContent !== currentFile.currentContent

  const highlightStart =
    selectedNode.sourceLocation.file === currentFile.path
      ? selectedNode.sourceLocation.lineStart
      : -1
  const highlightEnd =
    selectedNode.sourceLocation.file === currentFile.path
      ? selectedNode.sourceLocation.lineEnd
      : -1

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.currentContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex-1 flex flex-col border-l border-border bg-[#0D0E14] text-slate-100 min-w-[360px] max-w-full overflow-hidden">
      {/* Top File Tab Bar */}
      <div className="h-9 border-b border-white/10 bg-[#12141C] px-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {fileList.map((file) => {
            const fileModified = file.originalContent !== file.currentContent
            const isSelected = file.path === currentFile.path
            return (
              <button
                key={file.path}
                onClick={() => onSelectFile(file.path)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-mono transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-primary/20 text-white border border-primary/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <FileCode2 className="h-3 w-3 text-primary" />
                <span>{file.path}</span>
                {fileModified && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-400"
                    title="Modified via AST Sync"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isDirty && (
            <button
              onClick={() => onRevertFile(currentFile.path)}
              className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px] font-mono text-amber-300 transition-colors"
              title="Revert file to original imported state"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Revert
            </button>
          )}
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1 rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px] font-mono text-slate-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-2.5 w-2.5 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-2.5 w-2.5" /> Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selected Element AST Line Indicator Banner */}
      <div className="px-3 py-1.5 border-b border-white/10 bg-[#151824] flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>
            Selected AST Node:{' '}
            <strong className="text-white">&lt;{selectedNode.tag}&gt;</strong>
          </span>
          {highlightStart > 0 && (
            <span className="rounded bg-primary/20 text-primary px-1.5 py-0.2 text-[10px]">
              Lines {highlightStart}–{highlightEnd}
            </span>
          )}
        </div>
        <span className="text-[10px] text-emerald-400">
          {mode === 'diff' ? 'Minimal AST Git Diff' : 'Live 2-Way Monaco Sync'}
        </span>
      </div>

      {/* Editor or Diff Body */}
      {mode === 'split' ? (
        <div className="flex-1 relative flex overflow-auto font-mono text-xs leading-5">
          {/* Line Numbers + AST Range Highlight Gutter */}
          <div className="select-none py-3 px-2 text-right bg-[#0A0B10] border-r border-white/10 text-slate-500 shrink-0">
            {codeLines.map((_, idx) => {
              const lineNum = idx + 1
              const isHighlighted =
                lineNum >= highlightStart && lineNum <= highlightEnd
              return (
                <div
                  key={lineNum}
                  className={`px-1.5 ${
                    isHighlighted
                      ? 'bg-primary/25 text-primary font-bold rounded-xs'
                      : ''
                  }`}
                >
                  {lineNum}
                </div>
              )
            })}
          </div>

          {/* Editable Two-Way Code Textarea */}
          <textarea
            value={currentFile.currentContent}
            onChange={(e) => onCodeChange(currentFile.path, e.target.value)}
            spellCheck={false}
            aria-label="Live Source Code Editor"
            className="flex-1 w-full py-3 px-3 bg-transparent text-slate-100 font-mono text-xs leading-5 focus:outline-none resize-none overflow-x-auto whitespace-pre"
          />
        </div>
      ) : (
        /* Minimal Changed-Files Diff View */
        <div className="flex-1 overflow-auto font-mono text-xs leading-5 p-3 space-y-1">
          {!isDirty ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-2">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              <div className="text-xs font-semibold text-slate-200">
                No uncommitted changes in {currentFile.path}
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs font-sans">
                Edit any element on the visual canvas or tweak properties in the right inspector to see minimal surgical source diffs here.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 overflow-hidden bg-[#0A0B10]">
              {diffLines.map((dLine, idx) => (
                <div
                  key={idx}
                  className={`flex items-start px-3 py-0.5 whitespace-pre overflow-x-auto ${
                    dLine.type === 'add'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : dLine.type === 'remove'
                        ? 'bg-rose-500/15 text-rose-300 line-through opacity-80'
                        : 'text-slate-400'
                  }`}
                >
                  <span className="w-8 shrink-0 text-[10px] opacity-50 select-none">
                    {dLine.oldLineNumber ?? ' '}
                  </span>
                  <span className="w-8 shrink-0 text-[10px] opacity-50 select-none">
                    {dLine.newLineNumber ?? ' '}
                  </span>
                  <span className="w-4 shrink-0 select-none font-bold">
                    {dLine.type === 'add'
                      ? '+'
                      : dLine.type === 'remove'
                        ? '-'
                        : ' '}
                  </span>
                  <span>{dLine.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
