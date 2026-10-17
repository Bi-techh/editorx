'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  Copy,
  Trash2,
  Type,
  Code2,
  ChevronRight,
  Move,
  Maximize2,
} from 'lucide-react'
import {
  BreakpointMode,
  EditorNode,
  ElementStyles,
  ProjectPage,
} from '@/lib/editor-types'

interface VisualCanvasProps {
  page: ProjectPage
  breakpoint: BreakpointMode
  zoom: number
  showRulers: boolean
  showGuides: boolean
  selectedNodeId: string
  hoveredNodeId: string | null
  animationReplayKey: number
  onSelectNode: (nodeId: string) => void
  onHoverNode: (nodeId: string | null) => void
  onUpdateNodeText: (nodeId: string, newText: string) => void
  onDuplicateNode: (nodeId: string) => void
  onDeleteNode: (nodeId: string) => void
}

export function VisualCanvas({
  page,
  breakpoint,
  zoom,
  showRulers,
  showGuides,
  selectedNodeId,
  hoveredNodeId,
  animationReplayKey,
  onSelectNode,
  onHoverNode,
  onUpdateNodeText,
  onDuplicateNode,
  onDeleteNode,
}: VisualCanvasProps) {
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const viewportWidth =
    breakpoint === 'desktop'
      ? '100%'
      : breakpoint === 'tablet'
        ? '768px'
        : '390px'

  // Compute merged styles for current breakpoint
  const getEffectiveStyles = (node: EditorNode): React.CSSProperties => {
    const base: ElementStyles = {
      ...node.styles,
      ...(breakpoint === 'tablet' ? node.responsiveStyles.tablet : {}),
      ...(breakpoint === 'mobile'
        ? {
            ...node.responsiveStyles.tablet,
            ...node.responsiveStyles.mobile,
          }
        : {}),
    }

    const anim = node.animation
    let animationCss: string | undefined
    if (anim && anim.preset !== 'none') {
      const dur = `${anim.duration}ms`
      const del = `${anim.delay}ms`
      const ease = anim.easing || 'cubic-bezier(0.16, 1, 0.3, 1)'
      const iter = anim.loop ? 'infinite alternate' : 'forwards'
      animationCss = `morph-${anim.preset} ${dur} ${ease} ${del} ${iter}`
    }

    return {
      ...(base as unknown as React.CSSProperties),
      animation: animationCss,
    }
  }

  // Build breadcrumb path from root to selectedNodeId
  const getBreadcrumbPath = (
    current: EditorNode,
    targetId: string,
    trail: EditorNode[] = []
  ): EditorNode[] | null => {
    const nextTrail = [...trail, current]
    if (current.id === targetId) return nextTrail
    for (const child of current.children) {
      const found = getBreadcrumbPath(child, targetId, nextTrail)
      if (found) return found
    }
    return null
  }

  const breadcrumbs = getBreadcrumbPath(page.rootNode, selectedNodeId) || [
    page.rootNode,
  ]

  const renderCanvasNode = (node: EditorNode): React.ReactNode => {
    if (node.hidden) return null

    const isSelected = node.id === selectedNodeId
    const isHovered = node.id === hoveredNodeId && !isSelected
    const isInlineEditing = inlineEditingId === node.id
    const effectiveStyles = getEffectiveStyles(node)
    const hasAnim = node.animation && node.animation.preset !== 'none'

    const handleNodeClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelectNode(node.id)
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (node.children.length === 0 && node.tag !== 'img') {
        setInlineEditingId(node.id)
      }
    }

    // Selection & hover outline classes
    const selectionOutlineClass = isSelected
      ? 'ring-2 ring-[#3B82F6] ring-offset-0 relative'
      : isHovered
        ? 'ring-1 ring-dashed ring-[#38BDF8]/80 relative'
        : 'relative'

    const Tag = (
      ['section', 'nav', 'header', 'footer', 'main', 'article', 'div', 'h1', 'h2', 'h3', 'p', 'span', 'a', 'button'].includes(
        node.tag
      )
        ? node.tag
        : 'div'
    ) as React.ElementType

    return (
      <Tag
        key={`${node.id}-${animationReplayKey}`}
        onClick={handleNodeClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={(e: React.MouseEvent) => {
          e.stopPropagation()
          onHoverNode(node.id)
        }}
        onMouseLeave={(e: React.MouseEvent) => {
          e.stopPropagation()
          onHoverNode(null)
        }}
        style={{
          ...effectiveStyles,
          cursor: isInlineEditing ? 'text' : 'pointer',
          transition: 'box-shadow 120ms ease, transform 200ms ease',
        }}
        className={`${selectionOutlineClass} group/node`}
      >
        {/* Top Selection HUD Badge (Webflow / Framer style) */}
        {(isSelected || isHovered) && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute -top-6 left-0 z-30 flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-auto ${
              isSelected
                ? 'bg-[#3B82F6] text-white font-semibold'
                : 'bg-slate-900/95 text-sky-300 border border-sky-500/30'
            }`}
          >
            <span>
              {node.isComponent && node.componentName
                ? `<${node.componentName} />`
                : `<${node.tag}>`}
            </span>
            {node.className && (
              <span className="opacity-85">
                .{node.className.split(' ')[0]}
              </span>
            )}
            <span className="opacity-70 text-[9px]">
              {node.sourceLocation.file.split('/').pop()}:L{node.sourceLocation.lineStart}
            </span>

            {hasAnim && (
              <span className="inline-flex items-center gap-0.5 bg-black/25 px-1 rounded text-amber-200">
                <Sparkles className="h-2.5 w-2.5" />
                {node.animation.preset}
              </span>
            )}

            {isSelected && node.id !== page.rootNode.id && (
              <div className="flex items-center gap-1 pl-1 ml-1 border-l border-white/25">
                {node.children.length === 0 && node.tag !== 'img' && (
                  <button
                    onClick={() => setInlineEditingId(node.id)}
                    title="Inline Edit Text (Double-Click)"
                    className="hover:bg-white/20 p-0.5 rounded"
                  >
                    <Type className="h-2.5 w-2.5" />
                  </button>
                )}
                <button
                  onClick={() => onDuplicateNode(node.id)}
                  title="Duplicate Element"
                  className="hover:bg-white/20 p-0.5 rounded"
                >
                  <Copy className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => onDeleteNode(node.id)}
                  title="Delete Element"
                  className="hover:bg-white/20 p-0.5 rounded"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Smart Snap Guides when selected */}
        {isSelected && showGuides && (
          <>
            <div className="pointer-events-none absolute -left-8 -right-8 top-0 border-t border-dashed border-pink-500/50 z-20" />
            <div className="pointer-events-none absolute -left-8 -right-8 bottom-0 border-b border-dashed border-pink-500/50 z-20" />
            <div className="pointer-events-none absolute -top-8 -bottom-8 left-0 border-l border-dashed border-pink-500/50 z-20" />
            <div className="pointer-events-none absolute -top-8 -bottom-8 right-0 border-r border-dashed border-pink-500/50 z-20" />
            {/* Corner resize handles */}
            <span className="pointer-events-none absolute -top-1 -left-1 h-2 w-2 bg-white border-2 border-[#3B82F6] rounded-xs z-30" />
            <span className="pointer-events-none absolute -top-1 -right-1 h-2 w-2 bg-white border-2 border-[#3B82F6] rounded-xs z-30" />
            <span className="pointer-events-none absolute -bottom-1 -left-1 h-2 w-2 bg-white border-2 border-[#3B82F6] rounded-xs z-30" />
            <span className="pointer-events-none absolute -bottom-1 -right-1 h-2 w-2 bg-white border-2 border-[#3B82F6] rounded-xs z-30" />
          </>
        )}

        {/* Node Content: Image, Leaf Text, or Children */}
        {node.tag === 'img' ? (
          <img
            src={
              node.attributes.src ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80'
            }
            alt={node.attributes.alt || node.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: node.styles.borderRadius || '12px',
              display: 'block',
            }}
          />
        ) : node.children.length === 0 ? (
          isInlineEditing ? (
            <span
              contentEditable
              suppressContentEditableWarning
              autoFocus
              onBlur={(e) => {
                onUpdateNodeText(node.id, e.currentTarget.textContent || '')
                setInlineEditingId(null)
              }}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault()
                  onUpdateNodeText(node.id, e.currentTarget.textContent || '')
                  setInlineEditingId(null)
                }
                if (e.key === 'Escape') {
                  setInlineEditingId(null)
                }
              }}
              className="outline-none ring-2 ring-amber-400 rounded px-1 bg-black/30 inline-block min-w-[40px]"
            >
              {node.textContent}
            </span>
          ) : (
            <>
              {node.isComponent && node.componentProps ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider text-purple-400 font-mono">
                      &lt;{node.componentName} /&gt;
                    </span>
                    {node.componentProps.deltaBadge && (
                      <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-[11px] font-mono">
                        {String(node.componentProps.deltaBadge)}
                      </span>
                    )}
                  </div>
                  <div>{node.textContent}</div>
                </div>
              ) : (
                node.textContent
              )}
            </>
          )
        ) : (
          node.children.map((child) => renderCanvasNode(child))
        )}
      </Tag>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col bg-background studio-canvas-grid relative overflow-hidden"
      onMouseDown={(e) => {
        if (e.button === 1 || e.altKey) {
          setIsPanning(true)
          setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
        }
      }}
      onMouseMove={(e) => {
        if (isPanning) {
          setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
        }
      }}
      onMouseUp={() => setIsPanning(false)}
    >
      {/* Inline Keyframes for all 9 Animation Presets */}
      <style>{`
        @keyframes morph-fade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes morph-slide-up {
          0% { opacity: 0; transform: translateY(28px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes morph-slide-left {
          0% { opacity: 0; transform: translateX(32px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes morph-scale {
          0% { opacity: 0; transform: scale(0.88); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes morph-rotate {
          0% { opacity: 0; transform: rotate(-6deg) scale(0.94); }
          100% { opacity: 1; transform: rotate(0deg) scale(1); }
        }
        @keyframes morph-blur {
          0% { opacity: 0; filter: blur(12px); transform: translateY(10px); }
          100% { opacity: 1; filter: blur(0px); transform: translateY(0); }
        }
        @keyframes morph-stagger {
          0% { opacity: 0; transform: translateY(18px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes morph-typewriter {
          0% { opacity: 0.2; letter-spacing: 0.14em; }
          100% { opacity: 1; }
        }
        @keyframes morph-parallax {
          0% { transform: translateY(20px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

      {/* Top Horizontal Pixel Ruler */}
      {showRulers && (
        <div className="h-5 border-b border-border bg-sidebar/90 flex items-center px-6 text-[9px] font-mono text-muted-foreground select-none shrink-0 z-10">
          {Array.from({ length: 16 }).map((_, idx) => (
            <div
              key={idx}
              className="w-20 border-l border-border/70 pl-1 flex items-center"
            >
              {idx * 100}px
            </div>
          ))}
        </div>
      )}

      {/* Main Scrollable Viewport Container */}
      <div className="flex-1 overflow-auto p-6 md:p-10 flex justify-center items-start">
        <div
          style={{
            width: viewportWidth,
            maxWidth: breakpoint === 'desktop' ? '1060px' : viewportWidth,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
          }}
          className="rounded-xl border border-border/80 shadow-2xl overflow-visible bg-[#0B0C10] transition-all duration-200"
        >
          {/* Browser Frame Top Chrome */}
          <div className="h-8 rounded-t-xl border-b border-white/10 bg-[#14161F] px-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-[11px] font-mono text-slate-400">
                {page.route} — {page.filePath}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span>
                {breakpoint === 'desktop'
                  ? '1280 × Auto'
                  : breakpoint === 'tablet'
                    ? '768 × Auto'
                    : '390 × Auto'}
              </span>
              {panOffset.x !== 0 || panOffset.y !== 0 ? (
                <button
                  onClick={() => setPanOffset({ x: 0, y: 0 })}
                  className="text-primary hover:underline"
                >
                  Reset Pan
                </button>
              ) : null}
            </div>
          </div>

          {/* Live Rendered DOM Tree */}
          <div className="rounded-b-xl overflow-visible">
            {renderCanvasNode(page.rootNode)}
          </div>
        </div>
      </div>

      {/* Bottom Ancestor Breadcrumb Bar & Canvas Status */}
      <div className="h-8 border-t border-border bg-sidebar/95 px-3 flex items-center justify-between text-[11px] shrink-0 z-10">
        <div className="flex items-center gap-1 overflow-x-auto">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              {idx > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <button
                onClick={() => onSelectNode(crumb.id)}
                className={`px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors shrink-0 ${
                  crumb.id === selectedNodeId
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {crumb.tag}
                {crumb.className ? `.${crumb.className.split(' ')[0]}` : ''}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground font-mono shrink-0">
          <span className="flex items-center gap-1">
            <Type className="h-3 w-3" /> Double-click text to edit inline
          </span>
          <span className="flex items-center gap-1">
            <Move className="h-3 w-3" /> Option + Drag to pan
          </span>
        </div>
      </div>
    </div>
  )
}
