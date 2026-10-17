'use client'

import React, { useState } from 'react'
import {
  FileText,
  Layers,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  Settings2,
  Sparkles,
  Box,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  LayoutGrid,
  Code,
  GripVertical,
  Search,
  Globe,
} from 'lucide-react'
import {
  EditorNode,
  PageMeta,
  ProjectPage,
} from '@/lib/editor-types'
import { DEFAULT_ANIMATION } from '@/lib/sample-projects'

interface LeftSidebarProps {
  pages: ProjectPage[]
  activePageId: string
  onSelectPage: (pageId: string) => void
  onUpdatePageMeta: (pageId: string, meta: PageMeta) => void
  onAddPage: (name: string, route: string) => void
  rootNode: EditorNode
  selectedNodeId: string
  hoveredNodeId: string | null
  onSelectNode: (nodeId: string) => void
  onHoverNode: (nodeId: string | null) => void
  onToggleHideNode: (nodeId: string) => void
  onDuplicateNode: (nodeId: string) => void
  onDeleteNode: (nodeId: string) => void
  onMoveNode: (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void
  onAddChildNode: (parentId: string, newNode: EditorNode) => void
}

export function LeftSidebar({
  pages,
  activePageId,
  onSelectPage,
  onUpdatePageMeta,
  onAddPage,
  rootNode,
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
  onToggleHideNode,
  onDuplicateNode,
  onDeleteNode,
  onMoveNode,
  onAddChildNode,
}: LeftSidebarProps) {
  const [editingPageMetaId, setEditingPageMetaId] = useState<string | null>(null)
  const [showNewPageForm, setShowNewPageForm] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const [newPageRoute, setNewPageRoute] = useState('')
  const [layerFilter, setLayerFilter] = useState('')
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({})
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOverInfo, setDragOverInfo] = useState<{
    id: string
    position: 'before' | 'after' | 'inside'
  } | null>(null)
  const [showAddElementMenu, setShowAddElementMenu] = useState(false)

  const activePage = pages.find((p) => p.id === activePageId) || pages[0]
  const metaPage = pages.find((p) => p.id === editingPageMetaId)

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPageName.trim()) return
    const route = newPageRoute.trim().startsWith('/')
      ? newPageRoute.trim()
      : `/${newPageRoute.trim() || newPageName.toLowerCase().replace(/\s+/g, '-')}`
    onAddPage(newPageName.trim(), route)
    setNewPageName('')
    setNewPageRoute('')
    setShowNewPageForm(false)
  }

  const handleQuickInsertElement = (
    type: 'heading' | 'paragraph' | 'button' | 'container' | 'image'
  ) => {
    const id = `el-${Date.now().toString(36)}`
    const presets: Record<typeof type, EditorNode> = {
      heading: {
        id,
        tag: 'h2',
        name: 'Section Heading (h2)',
        className: 'section-heading',
        textContent: 'New Visual Heading Block',
        attributes: {},
        styles: {
          fontSize: '32px',
          fontWeight: '700',
          color: '#F8FAFC',
          marginTop: '8px',
          marginBottom: '8px',
        },
        responsiveStyles: {},
        animation: { ...DEFAULT_ANIMATION },
        sourceLocation: { file: activePage.filePath, lineStart: 1, lineEnd: 3 },
        children: [],
      },
      paragraph: {
        id,
        tag: 'p',
        name: 'Body Paragraph (p)',
        className: 'body-copy',
        textContent:
          'Double-click this paragraph on the canvas or use the right panel to customize typography, spacing, and animations.',
        attributes: {},
        styles: {
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#94A3B8',
        },
        responsiveStyles: {},
        animation: { ...DEFAULT_ANIMATION },
        sourceLocation: { file: activePage.filePath, lineStart: 1, lineEnd: 3 },
        children: [],
      },
      button: {
        id,
        tag: 'a',
        name: 'Action Button (.w-button)',
        className: 'action-button w-button',
        textContent: 'Get Started →',
        attributes: { href: '#' },
        styles: {
          backgroundColor: '#6366F1',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '600',
          paddingTop: '11px',
          paddingBottom: '11px',
          paddingLeft: '22px',
          paddingRight: '22px',
          borderRadius: '8px',
          display: 'inline-block',
          width: 'fit-content',
        },
        responsiveStyles: {},
        animation: { ...DEFAULT_ANIMATION },
        sourceLocation: { file: activePage.filePath, lineStart: 1, lineEnd: 3 },
        children: [],
      },
      container: {
        id,
        tag: 'div',
        name: 'Flex Box (.flex-card)',
        className: 'flex-card',
        attributes: {},
        styles: {
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingTop: '24px',
          paddingBottom: '24px',
          paddingLeft: '24px',
          paddingRight: '24px',
          backgroundColor: '#13151C',
          borderRadius: '12px',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#262938',
        },
        responsiveStyles: {},
        animation: { ...DEFAULT_ANIMATION },
        sourceLocation: { file: activePage.filePath, lineStart: 1, lineEnd: 5 },
        children: [
          {
            id: `${id}-text`,
            tag: 'span',
            name: 'Card Label (span)',
            className: 'card-label',
            textContent: 'New Container Block',
            attributes: {},
            styles: { fontSize: '15px', fontWeight: '600', color: '#F8FAFC' },
            responsiveStyles: {},
            animation: { ...DEFAULT_ANIMATION },
            sourceLocation: { file: activePage.filePath, lineStart: 2, lineEnd: 4 },
            children: [],
          },
        ],
      },
      image: {
        id,
        tag: 'img',
        name: 'Media Image (img)',
        className: 'media-frame',
        attributes: {
          src: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1000&auto=format&fit=crop&q=80',
          alt: 'Cybersecurity mesh node visualization',
        },
        styles: {
          width: '100%',
          height: '220px',
          borderRadius: '12px',
        },
        responsiveStyles: {},
        animation: { ...DEFAULT_ANIMATION },
        sourceLocation: { file: activePage.filePath, lineStart: 1, lineEnd: 2 },
        children: [],
      },
    }

    onAddChildNode(selectedNodeId || rootNode.id, presets[type])
    setShowAddElementMenu(false)
  }

  const getTagIcon = (node: EditorNode) => {
    if (node.isComponent) return <Code className="h-3.5 w-3.5 text-purple-400 shrink-0" />
    switch (node.tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'p':
      case 'span':
        return <Type className="h-3.5 w-3.5 text-sky-400 shrink-0" />
      case 'img':
        return <ImageIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      case 'a':
      case 'button':
        return <MousePointerClick className="h-3.5 w-3.5 text-amber-400 shrink-0" />
      case 'section':
      case 'nav':
      case 'header':
      case 'main':
        return <LayoutGrid className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
      default:
        return <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    }
  }

  const renderTreeNode = (node: EditorNode, depth: number) => {
    const matchesSearch =
      !layerFilter.trim() ||
      node.name.toLowerCase().includes(layerFilter.toLowerCase()) ||
      node.tag.toLowerCase().includes(layerFilter.toLowerCase()) ||
      node.className.toLowerCase().includes(layerFilter.toLowerCase())

    const hasChildren = node.children && node.children.length > 0
    const isCollapsed = Boolean(collapsedIds[node.id])
    const isSelected = node.id === selectedNodeId
    const isHovered = node.id === hoveredNodeId
    const hasAnimation = node.animation && node.animation.preset !== 'none'
    const isDragTarget = dragOverInfo?.id === node.id

    return (
      <div key={node.id} className="select-none">
        {matchesSearch && (
          <div
            draggable={node.id !== rootNode.id}
            onDragStart={(e) => {
              e.stopPropagation()
              setDraggedNodeId(node.id)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!draggedNodeId || draggedNodeId === node.id) return
              const rect = e.currentTarget.getBoundingClientRect()
              const relY = e.clientY - rect.top
              const position: 'before' | 'after' | 'inside' =
                relY < rect.height * 0.28
                  ? 'before'
                  : relY > rect.height * 0.72
                    ? 'after'
                    : 'inside'
              setDragOverInfo({ id: node.id, position })
            }}
            onDragLeave={() => {
              if (dragOverInfo?.id === node.id) setDragOverInfo(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (draggedNodeId && dragOverInfo) {
                onMoveNode(draggedNodeId, dragOverInfo.id, dragOverInfo.position)
              }
              setDraggedNodeId(null)
              setDragOverInfo(null)
            }}
            onClick={() => onSelectNode(node.id)}
            onMouseEnter={() => onHoverNode(node.id)}
            onMouseLeave={() => onHoverNode(null)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={`group relative flex items-center justify-between pr-2 py-1 text-xs cursor-pointer transition-colors ${
              isSelected
                ? 'bg-primary/20 text-foreground font-medium border-l-2 border-primary'
                : isHovered
                  ? 'bg-accent/70 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
            } ${node.hidden ? 'opacity-45' : ''} ${
              isDragTarget && dragOverInfo?.position === 'before'
                ? 'border-t-2 border-primary'
                : isDragTarget && dragOverInfo?.position === 'after'
                  ? 'border-b-2 border-primary'
                  : isDragTarget && dragOverInfo?.position === 'inside'
                    ? 'ring-1 ring-inset ring-primary bg-primary/10'
                    : ''
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {node.id !== rootNode.id && (
                <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-40 shrink-0 cursor-grab" />
              )}
              {hasChildren ? (
                <button
                  onClick={(e) => toggleCollapse(node.id, e)}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}

              {getTagIcon(node)}

              <span className="truncate text-[11px] leading-tight">
                {node.name}
              </span>

              {hasAnimation && (
                <span
                  title={`Animation: ${node.animation.preset} (${node.animation.trigger})`}
                  className="inline-flex items-center px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[9px] font-mono shrink-0"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                </span>
              )}
            </div>

            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleHideNode(node.id)
                }}
                className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                title={node.hidden ? 'Show Element' : 'Hide Element'}
              >
                {node.hidden ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </button>
              {node.id !== rootNode.id && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicateNode(node.id)
                    }}
                    className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                    title="Duplicate Element"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteNode(node.id)
                    }}
                    className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive"
                    title="Delete Element"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {hasChildren && !isCollapsed && (
          <div>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0 select-none z-20">
      {/* Top Half: Pages & Routes Switcher */}
      <div className="border-b border-border flex flex-col max-h-[40%]">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Pages & Routes</span>
            <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] font-mono text-muted-foreground">
              {pages.length}
            </span>
          </div>
          <button
            onClick={() => setShowNewPageForm((v) => !v)}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Create New Page Route"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {showNewPageForm && (
          <form
            onSubmit={handleCreatePage}
            className="p-2.5 border-b border-border bg-muted/30 space-y-2"
          >
            <input
              type="text"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              placeholder="Page Name (e.g. Changelog)"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newPageRoute}
                onChange={(e) => setNewPageRoute(e.target.value)}
                placeholder="/changelog"
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
              >
                Add
              </button>
            </div>
          </form>
        )}

        <div className="overflow-y-auto py-1.5 px-1.5 space-y-0.5">
          {pages.map((page) => {
            const isActive = page.id === activePageId
            return (
              <div
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Globe className={`h-3 w-3 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate text-[11px]">{page.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-4 text-[10px] font-mono text-muted-foreground truncate">
                    <span>{page.route}</span>
                    <span>•</span>
                    <span className="truncate">{page.filePath}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingPageMetaId(
                      editingPageMetaId === page.id ? null : page.id
                    )
                  }}
                  className={`p-1 rounded hover:bg-background transition-colors ${
                    editingPageMetaId === page.id
                      ? 'text-primary bg-background'
                      : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground'
                  }`}
                  title="Page SEO, Meta & OG Settings"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>

        {metaPage && (
          <div className="p-3 border-t border-border bg-card/90 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px] text-primary">
                SEO & Page Settings ({metaPage.route})
              </span>
              <button
                onClick={() => setEditingPageMetaId(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Done
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Page Title (&lt;title&gt;)</label>
              <input
                type="text"
                value={metaPage.meta.title}
                onChange={(e) =>
                  onUpdatePageMeta(metaPage.id, {
                    ...metaPage.meta,
                    title: e.target.value,
                  })
                }
                className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Meta Description</label>
              <textarea
                rows={2}
                value={metaPage.meta.description}
                onChange={(e) =>
                  onUpdatePageMeta(metaPage.id, {
                    ...metaPage.meta,
                    description: e.target.value,
                  })
                }
                className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Page Transition</label>
                <select
                  value={metaPage.meta.pageTransition}
                  onChange={(e) =>
                    onUpdatePageMeta(metaPage.id, {
                      ...metaPage.meta,
                      pageTransition: e.target.value as PageMeta['pageTransition'],
                    })
                  }
                  className="w-full rounded border border-border bg-background px-1.5 py-1 text-[11px]"
                >
                  <option value="none">None</option>
                  <option value="fade">Crossfade</option>
                  <option value="slide">Slide Up</option>
                  <option value="scale">Scale Depth</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">OG Image URL</label>
                <input
                  type="text"
                  value={metaPage.meta.ogImage}
                  onChange={(e) =>
                    onUpdatePageMeta(metaPage.id, {
                      ...metaPage.meta,
                      ogImage: e.target.value,
                    })
                  }
                  className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Half: DOM Layers Tree Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>DOM Layers</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowAddElementMenu((v) => !v)}
              className="inline-flex items-center gap-1 rounded bg-primary/15 hover:bg-primary/25 text-primary px-2 py-0.5 text-[11px] font-medium transition-colors"
              title="Insert Element into Selected Layer"
            >
              <Plus className="h-3 w-3" /> Add Block
            </button>

            {showAddElementMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50 space-y-0.5 text-xs">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                  Insert Inside Selection
                </div>
                <button
                  onClick={() => handleQuickInsertElement('heading')}
                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
                >
                  <Type className="h-3.5 w-3.5 text-sky-400" /> Heading (&lt;h2&gt;)
                </button>
                <button
                  onClick={() => handleQuickInsertElement('paragraph')}
                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
                >
                  <Type className="h-3.5 w-3.5 text-slate-400" /> Paragraph (&lt;p&gt;)
                </button>
                <button
                  onClick={() => handleQuickInsertElement('button')}
                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
                >
                  <MousePointerClick className="h-3.5 w-3.5 text-amber-400" /> Button (&lt;a&gt;)
                </button>
                <button
                  onClick={() => handleQuickInsertElement('container')}
                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
                >
                  <Box className="h-3.5 w-3.5 text-indigo-400" /> Flex Container (&lt;div&gt;)
                </button>
                <button
                  onClick={() => handleQuickInsertElement('image')}
                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent text-left"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-400" /> Image (&lt;img&gt;)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-2.5 py-1.5 border-b border-border/50">
          <div className="relative flex items-center">
            <Search className="h-3 w-3 text-muted-foreground absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={layerFilter}
              onChange={(e) => setLayerFilter(e.target.value)}
              placeholder="Filter tag, .class, or component..."
              className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {renderTreeNode(rootNode, 0)}
        </div>

        <div className="px-3 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>Drag layers to reorder or nest</span>
          <span className="font-mono">⌫ Delete</span>
        </div>
      </div>
    </aside>
  )
}
