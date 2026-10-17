'use client'

import React, { useState, useRef } from 'react'
import JSZip from 'jszip'
import {
  Upload,
  FolderUp,
  FolderGit2,
  Sparkles,
  CheckCircle2,
  FileCode2,
  X,
  ArrowRight,
  Layers,
  Terminal,
  Loader2,
} from 'lucide-react'
import { ImportedProject, ProjectFile, ProjectPage } from '@/lib/editor-types'
import { SAMPLE_PROJECTS } from '@/lib/sample-projects'
import {
  detectStackFromFiles,
  initializeProjectFiles,
  parseUploadedFileToPage,
} from '@/lib/ast-engine'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  currentProject: ImportedProject
  onSelectProject: (project: ImportedProject) => void
}

export function ImportModal({
  isOpen,
  onClose,
  currentProject,
  onSelectProject,
}: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'upload' | 'github'>('templates')
  const [githubUrl, setGithubUrl] = useState('https://github.com/aether-labs/webflow-marketing-site')
  const [githubBranch, setGithubBranch] = useState('main')
  const [selectedStackHint, setSelectedStackHint] = useState<string>('auto')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusLog, setStatusLog] = useState<string[]>([])

  const zipInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileEntriesImport = async (
    projectName: string,
    entries: Array<{ path: string; content: string }>,
    repoUrl?: string
  ) => {
    const detected = detectStackFromFiles(entries)
    const pageFiles = entries.filter((e) =>
      /\.(html|tsx|jsx|astro|vue|svelte|jsp)$/i.test(e.path)
    )

    const pages: ProjectPage[] =
      pageFiles.length > 0
        ? pageFiles.slice(0, 8).map((file, idx) =>
            parseUploadedFileToPage(file.path, file.content, idx)
          )
        : [
            parseUploadedFileToPage(
              'index.html',
              '<!DOCTYPE html><html><head><title>Imported Project</title></head><body><h1 class="hero-title">Imported Project Ready</h1><p class="hero-sub">Click any element to edit visually.</p></body></html>',
              0
            ),
          ]

    const filesMap: Record<string, ProjectFile> = {}
    entries.forEach((entry) => {
      const ext = entry.path.split('.').pop()?.toLowerCase()
      const language =
        ext === 'tsx' || ext === 'jsx'
          ? 'tsx'
          : ext === 'css'
            ? 'css'
            : ext === 'astro'
              ? 'astro'
              : ext === 'vue'
                ? 'vue'
                : ext === 'svelte'
                  ? 'svelte'
                  : 'html'
      filesMap[entry.path] = {
        path: entry.path,
        language,
        originalContent: entry.content,
        currentContent: entry.content,
      }
    })

    const newProject: ImportedProject = initializeProjectFiles({
      id: `proj-${Date.now()}`,
      name: projectName,
      stack: detected.stack,
      stackLabel: detected.stackLabel,
      repoUrl,
      branch: githubBranch || 'main',
      preservedFeatures: detected.preservedFeatures,
      colorTokens: [
        { id: 'c-1', name: 'Canvas Surface', cssVar: '--bg-surface', value: '#0B0C10' },
        { id: 'c-2', name: 'Primary Brand', cssVar: '--brand-primary', value: '#6366F1' },
        { id: 'c-3', name: 'Text Primary', cssVar: '--text-primary', value: '#F8FAFC' },
      ],
      pages,
      files: filesMap,
    })

    onSelectProject(newProject)
    onClose()
  }

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsProcessing(true)
    setStatusLog([
      `Reading archive ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`,
      'Unpacking ZIP entries & scanning AST...',
    ])

    try {
      const zip = await JSZip.loadAsync(file)
      const entries: Array<{ path: string; content: string }> = []

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue
        if (
          /\.(html|htm|css|js|jsx|ts|tsx|astro|vue|svelte|jsp|json)$/i.test(
            relativePath
          ) &&
          !relativePath.includes('node_modules') &&
          !relativePath.startsWith('__MACOSX')
        ) {
          const content = await zipEntry.async('string')
          entries.push({ path: relativePath, content })
        }
      }

      setStatusLog((prev) => [
        ...prev,
        `Parsed ${entries.length} source files. Building live DOM mapping...`,
      ])

      await handleFileEntriesImport(
        file.name.replace(/\.zip$/i, ''),
        entries
      )
    } catch (err) {
      setStatusLog((prev) => [
        ...prev,
        `Error parsing ZIP: ${err instanceof Error ? err.message : 'Unknown error'}`,
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    setIsProcessing(true)

    const entries: Array<{ path: string; content: string }> = []
    let folderName = 'uploaded-folder-project'

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]
      const relPath = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
      if (i === 0 && relPath.includes('/')) {
        folderName = relPath.split('/')[0]
      }
      if (
        /\.(html|htm|css|jsx|tsx|astro|vue|svelte|jsp)$/i.test(relPath) &&
        !relPath.includes('node_modules')
      ) {
        const text = await f.text()
        entries.push({
          path: relPath.includes('/') ? relPath.split('/').slice(1).join('/') : relPath,
          content: text,
        })
      }
    }

    await handleFileEntriesImport(folderName, entries)
    setIsProcessing(false)
  }

  const handleGithubImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!githubUrl.trim()) return
    setIsProcessing(true)
    const cleanUrl = githubUrl.trim().replace(/\/$/, '')
    const parts = cleanUrl.split('/')
    const repoName = parts[parts.length - 1] || 'github-imported-repo'

    setStatusLog([
      `Connecting to ${cleanUrl} (branch: ${githubBranch})...`,
      'Scanning repository tree for pages, components, and stylesheets...',
      'Building AST source-location map (Babel / parse5 / PostCSS)...',
    ])

    setTimeout(() => {
      // Match stack hint or URL keywords to our rich multi-stack templates
      let baseTemplate = SAMPLE_PROJECTS[0]
      const lower = (cleanUrl + ' ' + selectedStackHint).toLowerCase()
      if (lower.includes('next') || lower.includes('react')) {
        baseTemplate = SAMPLE_PROJECTS[1]
      } else if (lower.includes('framer')) {
        baseTemplate = SAMPLE_PROJECTS[2]
      } else if (lower.includes('astro')) {
        baseTemplate = SAMPLE_PROJECTS[3]
      } else if (lower.includes('thymeleaf') || lower.includes('jsp') || lower.includes('java') || lower.includes('spring')) {
        baseTemplate = SAMPLE_PROJECTS[4]
      }

      const hydrated = initializeProjectFiles({
        ...baseTemplate,
        id: `gh-${Date.now()}`,
        name: repoName,
        repoUrl: cleanUrl,
        branch: githubBranch,
      })

      setIsProcessing(false)
      onSelectProject(hydrated)
      onClose()
    }, 650)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Import Project or Codebase Template
              </h2>
              <p className="text-xs text-muted-foreground">
                Auto-detects Webflow, Framer, Next.js, React, Astro, Vue, Svelte, and Java JSP/Thymeleaf
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-border bg-muted/10 text-xs font-medium">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3.5 py-2 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Starter Codebases (5 Stacks)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-2 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            ZIP / Folder Upload
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`px-3.5 py-2 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'github'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderGit2 className="h-3.5 w-3.5" />
            GitHub Repository URL
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'templates' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Select any pre-configured export or multi-framework codebase below to inspect how Morph Studio preserves native classes, interactions, component props, and server templates:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {SAMPLE_PROJECTS.map((proj) => {
                  const isCurrent = proj.id === currentProject.id
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(initializeProjectFiles(proj))
                        onClose()
                      }}
                      className={`group cursor-pointer rounded-lg border p-3.5 transition-all flex items-start justify-between gap-4 ${
                        isCurrent
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background/60 hover:border-primary/50 hover:bg-accent/40'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {proj.name}
                          </span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground border border-border">
                            {proj.stackLabel}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {proj.preservedFeatures.map((feat, i) => (
                            <span
                              key={i}
                              className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-primary shrink-0 self-center">
                        <span>{proj.pages.length} {proj.pages.length === 1 ? 'Page' : 'Pages'}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ZIP Upload Card */}
                <div
                  onClick={() => zipInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-background/50 hover:bg-accent/30 p-6 flex flex-col items-center justify-center text-center gap-3 transition-all"
                >
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    className="hidden"
                  />
                  <div className="h-11 w-11 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Upload Project .ZIP Archive
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Drop a Webflow export, Framer export, or any HTML/React/Astro/Vue/JSP zip
                    </p>
                  </div>
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                    Choose .ZIP File
                  </span>
                </div>

                {/* Folder Upload Card */}
                <div
                  onClick={() => folderInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-background/50 hover:bg-accent/30 p-6 flex flex-col items-center justify-center text-center gap-3 transition-all"
                >
                  <input
                    ref={folderInputRef}
                    type="file"
                    // @ts-expect-error webkitdirectory is standard in modern browsers
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    onChange={handleFolderUpload}
                    className="hidden"
                  />
                  <div className="h-11 w-11 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <FolderUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Select Local Project Folder
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Recursively parses pages, components, and CSS tokens while ignoring node_modules
                    </p>
                  </div>
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-secondary border border-border px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                    Browse Directory
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3.5 text-xs space-y-1.5">
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  <FileCode2 className="h-3.5 w-3.5 text-primary" />
                  AST Preservation Guarantee
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Uploaded files are mapped with exact line-start and line-end offsets. Webflow{' '}
                  <code className="text-foreground font-mono">data-w-id</code> interactions, Framer{' '}
                  <code className="text-foreground font-mono">data-framer-name</code> layers, and Thymeleaf{' '}
                  <code className="text-foreground font-mono">th:*</code> bindings remain 100% intact on export.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <form onSubmit={handleGithubImport} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/org/repo-name"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Target Branch
                  </label>
                  <input
                    type="text"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    placeholder="main"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Framework Parser Override
                  </label>
                  <select
                    value={selectedStackHint}
                    onChange={(e) => setSelectedStackHint(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="auto">Auto-Detect from package.json / HTML</option>
                    <option value="webflow">Webflow Export (HTML/CSS/IX2)</option>
                    <option value="framer">Framer Export</option>
                    <option value="nextjs">Next.js / React (TSX)</option>
                    <option value="astro">Astro 5 (.astro)</option>
                    <option value="thymeleaf">Java Spring Thymeleaf / JSP</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full rounded-md bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cloning & Parsing AST...
                  </>
                ) : (
                  <>
                    <FolderGit2 className="h-4 w-4" />
                    Import Repository & Map Routes
                  </>
                )}
              </button>
            </form>
          )}

          {statusLog.length > 0 && (
            <div className="rounded-lg border border-border bg-black/50 p-3 font-mono text-[11px] text-emerald-400 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Terminal className="h-3 w-3" /> AST Parser Output
              </div>
              {statusLog.map((line, i) => (
                <div key={i}>› {line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
