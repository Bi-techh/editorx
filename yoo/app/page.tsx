'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  BreakpointMode,
  EditorNode,
  ImportedProject,
  PageMeta,
  VersionSnapshot,
} from '@/lib/editor-types'
import { SAMPLE_PROJECTS, DEFAULT_ANIMATION } from '@/lib/sample-projects'
import {
  cloneTree,
  deleteNodeById,
  duplicateNodeById,
  findNodeById,
  generatePageSourceCode,
  initializeProjectFiles,
  moveNodeInTree,
  syncSourceCodeToPageTree,
  updateNodeById,
} from '@/lib/ast-engine'
import { TopToolbar } from '@/components/editor/top-toolbar'
import { LeftSidebar } from '@/components/editor/left-sidebar'
import { VisualCanvas } from '@/components/editor/visual-canvas'
import { RightInspector } from '@/components/editor/right-inspector'
import { CodeDiffPanel } from '@/components/editor/code-diff-panel'
import { ImportModal } from '@/components/editor/import-modal'
import { ExportModal } from '@/components/editor/export-modal'

export default function MorphStudioPage() {
  const [project, setProject] = useState<ImportedProject>(() =>
    initializeProjectFiles(SAMPLE_PROJECTS[0])
  )
  const [activePageId, setActivePageId] = useState<string>(
    SAMPLE_PROJECTS[0].pages[0].id
  )
  const [selectedNodeId, setSelectedNodeId] = useState<string>('wf-h1')
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [breakpoint, setBreakpoint] = useState<BreakpointMode>('desktop')
  const [zoom, setZoom] = useState<number>(1)
  const [showRulers, setShowRulers] = useState<boolean>(true)
  const [showGuides, setShowGuides] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<'canvas' | 'split' | 'diff'>('split')
  const [activeCodeFile, setActiveCodeFile] = useState<string>('index.html')
  const [animationReplayKey, setAnimationReplayKey] = useState<number>(1)
  const [isDark, setIsDark] = useState<boolean>(true)

  // Undo / Redo history stacks
  const [pastStates, setPastStates] = useState<ImportedProject[]>([])
  const [futureStates, setFutureStates] = useState<ImportedProject[]>([])

  // Named Version Snapshots
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([
    {
      id: 'snap-initial',
      label: 'Initial Import Baseline',
      timestamp: 'Just now',
      pages: cloneTree(SAMPLE_PROJECTS[0].pages),
      files: initializeProjectFiles(SAMPLE_PROJECTS[0]).files,
    },
  ])

  // Modals
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false)
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false)

  const activePage =
    project.pages.find((p) => p.id === activePageId) || project.pages[0]

  const selectedNode =
    findNodeById(activePage.rootNode, selectedNodeId) || activePage.rootNode

  // Toggle dark/light class on <html>
  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next)
        document.documentElement.classList.toggle('light', !next)
      }
      return next
    })
  }

  // Commit a project mutation with Undo/Redo history and Two-Way AST Code Sync
  const commitProjectChange = useCallback(
    (updater: (current: ImportedProject) => ImportedProject) => {
      setProject((prev) => {
        const next = updater(cloneTree(prev))

        // Re-serialize active pages to their source files so Two-Way Sync stays instantaneous
        for (const page of next.pages) {
          const { code, updatedRoot } = generatePageSourceCode(page, next.stack)
          page.rootNode = updatedRoot
          if (next.files[page.filePath]) {
            next.files[page.filePath] = {
              ...next.files[page.filePath],
              currentContent: code,
            }
          } else {
            next.files[page.filePath] = {
              path: page.filePath,
              language:
                next.stack === 'nextjs' || next.stack === 'react'
                  ? 'tsx'
                  : next.stack === 'astro'
                    ? 'astro'
                    : 'html',
              originalContent: code,
              currentContent: code,
            }
          }
        }

        setPastStates((h) => [...h.slice(-24), prev])
        setFutureStates([])
        return next
      })
    },
    []
  )

  const handleUndo = useCallback(() => {
    setPastStates((past) => {
      if (past.length === 0) return past
      const previous = past[past.length - 1]
      setFutureStates((f) => [project, ...f])
      setProject(previous)
      return past.slice(0, -1)
    })
  }, [project])

  const handleRedo = useCallback(() => {
    setFutureStates((future) => {
      if (future.length === 0) return future
      const next = future[0]
      setPastStates((p) => [...p, project])
      setProject(next)
      return future.slice(1)
    })
  }, [project])

  // Keyboard shortcuts: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Backspace/Delete
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  // Switch active page
  const handleSelectPage = (pageId: string) => {
    setActivePageId(pageId)
    const targetPage = project.pages.find((p) => p.id === pageId)
    if (targetPage) {
      setSelectedNodeId(targetPage.rootNode.id)
      setActiveCodeFile(targetPage.filePath)
    }
  }

  // Select newly imported project
  const handleSelectProject = (newProj: ImportedProject) => {
    setProject(newProj)
    const firstPage = newProj.pages[0]
    setActivePageId(firstPage.id)
    const firstChild = firstPage.rootNode.children[0] || firstPage.rootNode
    setSelectedNodeId(firstChild.id)
    setActiveCodeFile(firstPage.filePath)
    setPastStates([])
    setFutureStates([])
  }

  // Update selected or targeted node
  const handleUpdateSelectedNode = (updater: (node: EditorNode) => EditorNode) => {
    commitProjectChange((curr) => ({
      ...curr,
      pages: curr.pages.map((p) =>
        p.id === activePage.id
          ? {
              ...p,
              rootNode: updateNodeById(p.rootNode, selectedNode.id, updater),
            }
          : p
      ),
    }))
  }

  const handleUpdateNodeText = (nodeId: string, newText: string) => {
    commitProjectChange((curr) => ({
      ...curr,
      pages: curr.pages.map((p) =>
        p.id === activePage.id
          ? {
              ...p,
              rootNode: updateNodeById(p.rootNode, nodeId, (n) => ({
                ...n,
                textContent: newText,
              })),
            }
          : p
      ),
    }))
  }

  const handleToggleHideNode = (nodeId: string) => {
    commitProjectChange((curr) => ({
      ...curr,
      pages: curr.pages.map((p) =>
        p.id === activePage.id
          ? {
              ...p,
              rootNode: updateNodeById(p.rootNode, nodeId, (n) => ({
                ...n,
                hidden: !n.hidden,
              })),
            }
          : p
      ),
    }))
  }

  const handleDuplicateNode = (nodeId: string) => {
    commitProjectChange((curr) => ({
      ...curr,
      pages: curr.pages.map((p) =>
        p.id === activePage.id
          ? {
              ...p,
              rootNode: duplicateNodeById(p.rootNode, nodeId),
            }
          : p
      ),
    }))
  }

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === activePage.rootNode.id) return
    commitProjectChange((curr) => ({
      ...curr,
      pages: curr.pages.map((p) =>
        p.id === activePage.id
          ? {
              ...p,
              rootNode: deleteNodeById(p.rootNode, nodeId),
            }
          : p
      ),
    }))
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(activePage.rootNode.id)
    }
  }

  const handleMoveNode = (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => {
    commitProjectChange((curr) => ({
      ...curr,
      pages: curr.pages.map((p) =>
        p.id === activePage.id
          ? {
              ...p,
              rootNode: moveNodeInTree(p.rootNode, draggedId, targetId, position),
            }
          : p
      ),
    }))
  }

  const handleAddChildNode = (parentId: string, newNode: EditorNode) => {
    commitProjectChange((curr) => ({
      ...curr,
      pages: curr.pages.map((p) =>
        p.id === activePage.id
          ? {
              ...p,
              rootNode: updateNodeById(p.rootNode, parentId, (parent) => ({
                ...parent,
                children: [...parent.children, newNode],
              })),
            }
          : p
      ),
    }))
    setSelectedNodeId(newNode.id)
  }

  // Page Meta & New Page creation
  const handleUpdatePageMeta = (pageId: string, meta: PageMeta) => {
    commitProjectChange((curr) => ({
      ...curr,
      pages: curr.pages.map((p) => (p.id === pageId ? { ...p, meta } : p)),
    }))
  }

  const handleAddPage = (name: string, route: string) => {
    const ext =
      project.stack === 'nextjs' || project.stack === 'react'
        ? 'tsx'
        : project.stack === 'astro'
          ? 'astro'
          : 'html'
    const slugClean = route.replace(/^\//, '') || 'new-page'
    const filePath =
      project.stack === 'nextjs'
        ? `app/${slugClean}/page.tsx`
        : project.stack === 'astro'
          ? `src/pages/${slugClean}.astro`
          : `${slugClean}.${ext}`

    const newPageId = `page-${Date.now()}`
    commitProjectChange((curr) => ({
      ...curr,
      pages: [
        ...curr.pages,
        {
          id: newPageId,
          name,
          route,
          filePath,
          meta: {
            title: `${name} — ${curr.name}`,
            description: `Created visually in Morph Studio`,
            slug: route,
            ogImage:
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
            pageTransition: 'fade',
          },
          rootNode: {
            id: `${newPageId}-root`,
            tag: 'main',
            name: `${name} Container`,
            className: 'page-container',
            attributes: {},
            styles: {
              backgroundColor: '#0B0C10',
              color: '#F8FAFC',
              fontFamily: 'Inter, sans-serif',
              paddingTop: '56px',
              paddingBottom: '64px',
              paddingLeft: '40px',
              paddingRight: '40px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            },
            responsiveStyles: {},
            animation: { ...DEFAULT_ANIMATION },
            sourceLocation: { file: filePath, lineStart: 1, lineEnd: 24 },
            children: [
              {
                id: `${newPageId}-h1`,
                tag: 'h1',
                name: 'Page Heading (h1)',
                className: 'page-heading',
                textContent: `${name} Overview`,
                attributes: {},
                styles: {
                  fontSize: '42px',
                  fontWeight: '700',
                  color: '#F8FAFC',
                },
                responsiveStyles: {},
                animation: { ...DEFAULT_ANIMATION },
                sourceLocation: { file: filePath, lineStart: 6, lineEnd: 10 },
                children: [],
              },
            ],
          },
        },
      ],
    }))
    setActivePageId(newPageId)
    setActiveCodeFile(filePath)
  }

  // Add global color token
  const handleAddColorToken = (name: string, value: string) => {
    commitProjectChange((curr) => ({
      ...curr,
      colorTokens: [
        ...curr.colorTokens,
        {
          id: `tok-${Date.now()}`,
          name,
          cssVar: `--token-${name.toLowerCase().replace(/\s+/g, '-')}`,
          value,
        },
      ],
    }))
  }

  // Two-Way Sync: Editing Code in Split View updates Visual Canvas DOM tree
  const handleCodeChange = (filePath: string, newCode: string) => {
    setProject((prev) => {
      const next = cloneTree(prev)
      if (next.files[filePath]) {
        next.files[filePath].currentContent = newCode
      }
      // If this file corresponds to a page, sync its changes back into the page's EditorNode tree
      next.pages = next.pages.map((p) =>
        p.filePath === filePath ? syncSourceCodeToPageTree(newCode, p) : p
      )
      return next
    })
  }

  const handleRevertFile = (filePath: string) => {
    setProject((prev) => {
      const next = cloneTree(prev)
      const file = next.files[filePath]
      if (!file) return prev
      file.currentContent = file.originalContent
      next.pages = next.pages.map((p) =>
        p.filePath === filePath
          ? syncSourceCodeToPageTree(file.originalContent, p)
          : p
      )
      return next
    })
  }

  // Version Snapshots
  const handleCreateSnapshot = (label: string) => {
    const snap: VersionSnapshot = {
      id: `snap-${Date.now()}`,
      label,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      pages: cloneTree(project.pages),
      files: cloneTree(project.files),
    }
    setSnapshots((prev) => [snap, ...prev])
  }

  const handleRestoreSnapshot = (snap: VersionSnapshot) => {
    setPastStates((p) => [...p, project])
    setProject((prev) => ({
      ...prev,
      pages: cloneTree(snap.pages),
      files: cloneTree(snap.files),
    }))
  }

  const changedFilesCount = Object.values(project.files).filter(
    (f) => f.originalContent !== f.currentContent
  ).length

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Studio Header Bar */}
      <TopToolbar
        project={project}
        breakpoint={breakpoint}
        onBreakpointChange={setBreakpoint}
        zoom={zoom}
        onZoomChange={setZoom}
        showRulers={showRulers}
        onToggleRulers={() => setShowRulers((v) => !v)}
        showGuides={showGuides}
        onToggleGuides={() => setShowGuides((v) => !v)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        canUndo={pastStates.length > 0}
        canRedo={futureStates.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        changedFilesCount={changedFilesCount}
        snapshots={snapshots}
        onCreateSnapshot={handleCreateSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onReplayAnimations={() => setAnimationReplayKey((k) => k + 1)}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main 3-Column Webflow/Framer Studio Workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel: Pages/Routes + DOM Layers Tree */}
        <LeftSidebar
          pages={project.pages}
          activePageId={activePage.id}
          onSelectPage={handleSelectPage}
          onUpdatePageMeta={handleUpdatePageMeta}
          onAddPage={handleAddPage}
          rootNode={activePage.rootNode}
          selectedNodeId={selectedNode.id}
          hoveredNodeId={hoveredNodeId}
          onSelectNode={(id) => {
            setSelectedNodeId(id)
            const node = findNodeById(activePage.rootNode, id)
            if (node?.sourceLocation.file) {
              setActiveCodeFile(node.sourceLocation.file)
            }
          }}
          onHoverNode={setHoveredNodeId}
          onToggleHideNode={handleToggleHideNode}
          onDuplicateNode={handleDuplicateNode}
          onDeleteNode={handleDeleteNode}
          onMoveNode={handleMoveNode}
          onAddChildNode={handleAddChildNode}
        />

        {/* Center Workspace: Visual Canvas + Optional 2-Way Code Split or Diff View */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <VisualCanvas
            page={activePage}
            breakpoint={breakpoint}
            zoom={zoom}
            showRulers={showRulers}
            showGuides={showGuides}
            selectedNodeId={selectedNode.id}
            hoveredNodeId={hoveredNodeId}
            animationReplayKey={animationReplayKey}
            onSelectNode={setSelectedNodeId}
            onHoverNode={setHoveredNodeId}
            onUpdateNodeText={handleUpdateNodeText}
            onDuplicateNode={handleDuplicateNode}
            onDeleteNode={handleDeleteNode}
          />

          {(viewMode === 'split' || viewMode === 'diff') && (
            <CodeDiffPanel
              mode={viewMode}
              files={project.files}
              activeFilePath={activeCodeFile}
              selectedNode={selectedNode}
              onSelectFile={setActiveCodeFile}
              onCodeChange={handleCodeChange}
              onRevertFile={handleRevertFile}
            />
          )}
        </div>

        {/* Right Panel: Element Properties + Box Model + Component Props + Animation Timeline */}
        <RightInspector
          selectedNode={selectedNode}
          breakpoint={breakpoint}
          stack={project.stack}
          colorTokens={project.colorTokens}
          onUpdateNode={handleUpdateSelectedNode}
          onAddColorToken={handleAddColorToken}
          onReplayAnimation={() => setAnimationReplayKey((k) => k + 1)}
        />
      </main>

      {/* Import Project / Stack Switcher Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        currentProject={project}
        onSelectProject={handleSelectProject}
      />

      {/* Export ZIP / GitHub Push / Preview Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
        activePage={activePage}
      />
    </div>
  )
}
