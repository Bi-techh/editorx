'use client'

import React, { useState } from 'react'
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Code2,
  GitCompare,
  Download,
  FolderGit2,
  Ruler,
  Magnet,
  Play,
  History,
  Sun,
  Moon,
  Sparkles,
  Check,
  Plus,
  RotateCcw,
  Eye,
} from 'lucide-react'
import {
  BreakpointMode,
  ImportedProject,
  VersionSnapshot,
} from '@/lib/editor-types'

interface TopToolbarProps {
  project: ImportedProject
  breakpoint: BreakpointMode
  onBreakpointChange: (bp: BreakpointMode) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  showRulers: boolean
  onToggleRulers: () => void
  showGuides: boolean
  onToggleGuides: () => void
  viewMode: 'canvas' | 'split' | 'diff'
  onViewModeChange: (mode: 'canvas' | 'split' | 'diff') => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  changedFilesCount: number
  snapshots: VersionSnapshot[]
  onCreateSnapshot: (label: string) => void
  onRestoreSnapshot: (snapshot: VersionSnapshot) => void
  onOpenImport: () => void
  onOpenExport: () => void
  onReplayAnimations: () => void
  isDark: boolean
  onToggleTheme: () => void
}

export function TopToolbar({
  project,
  breakpoint,
  onBreakpointChange,
  zoom,
  onZoomChange,
  showRulers,
  onToggleRulers,
  showGuides,
  onToggleGuides,
  viewMode,
  onViewModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  changedFilesCount,
  snapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  onOpenImport,
  onOpenExport,
  onReplayAnimations,
  isDark,
  onToggleTheme,
}: TopToolbarProps) {
  const [showSnapshotsMenu, setShowSnapshotsMenu] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')

  const handleSaveSnapshot = (e: React.FormEvent) => {
    e.preventDefault()
    const label = snapshotName.trim() || `Snapshot #${snapshots.length + 1}`
    onCreateSnapshot(label)
    setSnapshotName('')
  }

  return (
    <header className="h-12 border-b border-border bg-sidebar px-3 flex items-center justify-between gap-2 shrink-0 z-30">
      {/* Left: Brand + Active Project + Stack Badge + Import Trigger */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 pr-2 border-r border-border">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-sm">
            M
          </div>
          <span className="font-semibold text-xs tracking-tight hidden sm:inline">
            Morph
          </span>
        </div>

        <button
          onClick={onOpenImport}
          className="flex items-center gap-2 rounded-md border border-border bg-background/70 hover:bg-accent px-2.5 py-1 text-xs transition-colors max-w-[260px]"
          title="Switch or Import Project (ZIP, Folder, GitHub)"
        >
          <FolderGit2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-mono font-medium truncate">{project.name}</span>
          <span className="rounded bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase shrink-0">
            {project.stack}
          </span>
        </button>

        <div className="hidden xl:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
          <Check className="h-3 w-3" />
          <span>2-Way AST Synced</span>
        </div>
      </div>

      {/* Center: Breakpoint Switcher + Zoom + Rulers/Guides + Animation Replay */}
      <div className="flex items-center gap-2">
        {/* Responsive Breakpoints */}
        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
          <button
            onClick={() => onBreakpointChange('desktop')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              breakpoint === 'desktop'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Desktop Breakpoint (1280px)"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Desktop</span>
          </button>
          <button
            onClick={() => onBreakpointChange('tablet')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              breakpoint === 'tablet'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Tablet Breakpoint (768px)"
          >
            <Tablet className="h-3.5 w-3.5" />
            <span className="hidden md:inline">768</span>
          </button>
          <button
            onClick={() => onBreakpointChange('mobile')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              breakpoint === 'mobile'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Mobile Breakpoint (390px)"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden md:inline">390</span>
          </button>
        </div>

        {/* Zoom Selector */}
        <select
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          aria-label="Canvas Zoom"
          className="h-7 rounded-md border border-border bg-background px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value={0.65}>65%</option>
          <option value={0.8}>80%</option>
          <option value={0.9}>90%</option>
          <option value={1}>100%</option>
          <option value={1.15}>115%</option>
        </select>

        {/* Rulers & Snap Guides */}
        <div className="hidden lg:flex items-center rounded-md border border-border bg-background p-0.5">
          <button
            onClick={onToggleRulers}
            className={`p-1.5 rounded text-xs transition-colors ${
              showRulers
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle Pixel Rulers"
          >
            <Ruler className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleGuides}
            className={`p-1.5 rounded text-xs transition-colors ${
              showGuides
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle Smart Snap Guides"
          >
            <Magnet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onReplayAnimations}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-primary hover:bg-primary/10 transition-colors"
            title="Preview Element Animations on Canvas"
          >
            <Play className="h-3 w-3 fill-current" />
            <span className="text-[11px] font-medium">Run IX</span>
          </button>
        </div>
      </div>

      {/* Right: Undo/Redo + Snapshots + Split Code / Diff View + Theme + Export */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-35 transition-colors"
            title="Undo (⌘Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-35 transition-colors"
            title="Redo (⇧⌘Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Version Snapshots Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSnapshotsMenu((v) => !v)}
            className="flex items-center gap-1 rounded-md border border-border bg-background hover:bg-accent px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Version Snapshots & Restore"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden xl:inline text-[11px]">{snapshots.length}</span>
          </button>

          {showSnapshotsMenu && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-3 z-50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Version Snapshots</span>
                <span className="text-[10px] text-emerald-400 font-mono">Autosave On</span>
              </div>
              <form onSubmit={handleSaveSnapshot} className="flex gap-1.5">
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="Snapshot label..."
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Save
                </button>
              </form>
              <div className="max-h-44 overflow-y-auto space-y-1 pt-1 border-t border-border">
                {snapshots.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground py-2 text-center">
                    No manual snapshots yet. Create one before major layout changes.
                  </p>
                ) : (
                  snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent text-xs"
                    >
                      <div>
                        <div className="font-medium text-[11px]">{snap.label}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {snap.timestamp}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onRestoreSnapshot(snap)
                          setShowSnapshotsMenu(false)
                        }}
                        className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <RotateCcw className="h-2.5 w-2.5" /> Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* View Mode Switcher: Visual Canvas | 2-Way Code Split | Git Diff */}
        <div className="flex items-center rounded-md border border-border bg-background p-0.5">
          <button
            onClick={() => onViewModeChange('canvas')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'canvas'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Visual Canvas Only"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Visual</span>
          </button>
          <button
            onClick={() => onViewModeChange('split')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'split'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="2-Way Split View (Visual Canvas + Live Source Code)"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">2-Way Code</span>
          </button>
          <button
            onClick={() => onViewModeChange('diff')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'diff'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Inspect Changed Files Diff"
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Diff</span>
            {changedFilesCount > 0 && (
              <span className="ml-0.5 rounded-full bg-amber-500/20 text-amber-400 px-1.5 py-0 text-[10px] font-mono font-semibold">
                {changedFilesCount}
              </span>
            )}
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
          title="Toggle Dark / Light Studio Theme"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* Export / GitHub Push Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export / Push</span>
        </button>
      </div>
    </header>
  )
}
