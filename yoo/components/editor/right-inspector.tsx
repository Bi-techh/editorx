'use client'

import React, { useState } from 'react'
import {
  Type,
  Palette,
  Layout,
  Image as ImageIcon,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Play,
  Sliders,
  Code2,
  Link2,
  Plus,
} from 'lucide-react'
import {
  AnimationPreset,
  AnimationTrigger,
  BreakpointMode,
  ColorToken,
  EditorNode,
  ElementAnimation,
  ElementStyles,
  FrameworkStack,
} from '@/lib/editor-types'

interface RightInspectorProps {
  selectedNode: EditorNode
  breakpoint: BreakpointMode
  stack: FrameworkStack
  colorTokens: ColorToken[]
  onUpdateNode: (updater: (node: EditorNode) => EditorNode) => void
  onAddColorToken: (name: string, value: string) => void
  onReplayAnimation: () => void
}

const PRESET_IMAGES = [
  {
    label: 'Abstract Mesh',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Data Telemetry',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Server Matrix',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
  },
  {
    label: 'Minimal Hardware',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
  },
]

const EASING_PRESETS = [
  { label: 'Expo Out (Snappy)', value: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  { label: 'Spring Overshoot', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  { label: 'Smooth Quart', value: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  { label: 'Ease In Out', value: 'ease-in-out' },
  { label: 'Linear', value: 'linear' },
]

export function RightInspector({
  selectedNode,
  breakpoint,
  stack,
  colorTokens,
  onUpdateNode,
  onAddColorToken,
  onReplayAnimation,
}: RightInspectorProps) {
  const [activeTab, setActiveTab] = useState<'design' | 'animate'>('design')
  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenColor, setNewTokenColor] = useState('#38BDF8')
  const [newPropKey, setNewPropKey] = useState('')
  const [newPropVal, setNewPropVal] = useState('')

  // Read current style taking breakpoint into account
  const currentStyles: ElementStyles = {
    ...selectedNode.styles,
    ...(breakpoint === 'tablet' ? selectedNode.responsiveStyles.tablet : {}),
    ...(breakpoint === 'mobile' ? selectedNode.responsiveStyles.mobile : {}),
  }

  const updateStyle = (key: keyof ElementStyles, value: string) => {
    onUpdateNode((node) => {
      if (breakpoint === 'desktop') {
        return {
          ...node,
          styles: {
            ...node.styles,
            [key]: value,
          },
        }
      }
      return {
        ...node,
        responsiveStyles: {
          ...node.responsiveStyles,
          [breakpoint]: {
            ...(node.responsiveStyles[breakpoint] || {}),
            [key]: value,
          },
        },
      }
    })
  }

  const updateAnimation = (patch: Partial<ElementAnimation>) => {
    onUpdateNode((node) => ({
      ...node,
      animation: {
        ...node.animation,
        ...patch,
      },
    }))
  }

  const anim = selectedNode.animation

  return (
    <aside className="w-80 border-l border-border bg-sidebar flex flex-col shrink-0 select-none z-20">
      {/* Selected Element Header & Source AST Mapping Badge */}
      <div className="p-3 border-b border-border space-y-2 bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="rounded bg-primary/20 text-primary px-1.5 py-0.5 font-mono text-[11px] font-bold">
              {selectedNode.isComponent && selectedNode.componentName
                ? `<${selectedNode.componentName}>`
                : `<${selectedNode.tag}>`}
            </span>
            <span className="text-xs font-semibold truncate">
              {selectedNode.name}
            </span>
          </div>
          <span className="rounded bg-secondary border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
            {selectedNode.sourceLocation.file.split('/').pop()}:L
            {selectedNode.sourceLocation.lineStart}
          </span>
        </div>

        {/* Preserved Class Names Input */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            class
          </span>
          <input
            type="text"
            value={selectedNode.className}
            onChange={(e) =>
              onUpdateNode((n) => ({ ...n, className: e.target.value }))
            }
            placeholder="Preserved classes (.w-button, framer-*)"
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {breakpoint !== 'desktop' && (
          <div className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[10px] text-amber-300 flex items-center justify-between">
            <span>Editing {breakpoint.toUpperCase()} breakpoint override</span>
            <span className="font-mono">
              {breakpoint === 'tablet' ? '@media (max-width: 768px)' : '@media (max-width: 390px)'}
            </span>
          </div>
        )}
      </div>

      {/* Inspector Mode Tabs: Design Properties vs. Timeline Animation */}
      <div className="grid grid-cols-2 border-b border-border bg-muted/10 text-xs font-medium">
        <button
          onClick={() => setActiveTab('design')}
          className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'design'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Properties</span>
        </button>
        <button
          onClick={() => setActiveTab('animate')}
          className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'animate'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Animation</span>
          {anim.preset !== 'none' && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          )}
        </button>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-border text-xs">
        {activeTab === 'design' ? (
          <>
            {/* 1. React / Astro Component Props Section (when component selected) */}
            {selectedNode.isComponent && (
              <div className="p-3.5 space-y-2.5 bg-purple-500/5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px] flex items-center gap-1.5 text-purple-300">
                    <Code2 className="h-3.5 w-3.5" />
                    Component Props (&lt;{selectedNode.componentName} /&gt;)
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    AST Bound
                  </span>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(selectedNode.componentProps || {}).map(
                    ([propKey, propVal]) => (
                      <div
                        key={propKey}
                        className="grid grid-cols-5 items-center gap-1.5"
                      >
                        <span className="col-span-2 font-mono text-[11px] text-muted-foreground truncate">
                          {propKey}
                        </span>
                        {typeof propVal === 'boolean' ? (
                          <button
                            onClick={() =>
                              onUpdateNode((n) => ({
                                ...n,
                                componentProps: {
                                  ...(n.componentProps || {}),
                                  [propKey]: !propVal,
                                },
                              }))
                            }
                            className={`col-span-3 rounded px-2 py-1 text-[11px] font-mono text-left border ${
                              propVal
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : 'border-border bg-background text-muted-foreground'
                            }`}
                          >
                            {String(propVal)}
                          </button>
                        ) : (
                          <input
                            type="text"
                            value={String(propVal)}
                            onChange={(e) =>
                              onUpdateNode((n) => ({
                                ...n,
                                componentProps: {
                                  ...(n.componentProps || {}),
                                  [propKey]: e.target.value,
                                },
                              }))
                            }
                            className="col-span-3 rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                          />
                        )}
                      </div>
                    )
                  )}
                </div>

                {/* Add custom prop */}
                <div className="flex gap-1 pt-1">
                  <input
                    type="text"
                    value={newPropKey}
                    onChange={(e) => setNewPropKey(e.target.value)}
                    placeholder="propName"
                    className="w-24 rounded border border-border bg-background px-1.5 py-1 text-[10px] font-mono"
                  />
                  <input
                    type="text"
                    value={newPropVal}
                    onChange={(e) => setNewPropVal(e.target.value)}
                    placeholder="value"
                    className="flex-1 rounded border border-border bg-background px-1.5 py-1 text-[10px] font-mono"
                  />
                  <button
                    onClick={() => {
                      if (!newPropKey.trim()) return
                      onUpdateNode((n) => ({
                        ...n,
                        componentProps: {
                          ...(n.componentProps || {}),
                          [newPropKey.trim()]: newPropVal,
                        },
                      }))
                      setNewPropKey('')
                      setNewPropVal('')
                    }}
                    className="rounded bg-secondary px-2 py-1 text-[10px] hover:bg-primary hover:text-primary-foreground"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* 2. Text & Typography Section */}
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-primary" />
                  Typography & Content
                </span>
              </div>

              {selectedNode.children.length === 0 &&
                selectedNode.tag !== 'img' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Text Content (Two-Way Synced)
                    </label>
                    <textarea
                      rows={2}
                      value={selectedNode.textContent || ''}
                      onChange={(e) =>
                        onUpdateNode((n) => ({
                          ...n,
                          textContent: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Font Family
                  </label>
                  <select
                    value={currentStyles.fontFamily || 'Inter, sans-serif'}
                    onChange={(e) => updateStyle('fontFamily', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="system-ui, sans-serif">Geist Sans</option>
                    <option value="monospace">JetBrains Mono</option>
                    <option value="Georgia, serif">Editorial Serif</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Font Weight
                  </label>
                  <select
                    value={currentStyles.fontWeight || '400'}
                    onChange={(e) => updateStyle('fontWeight', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                  >
                    <option value="400">400 Regular</option>
                    <option value="500">500 Medium</option>
                    <option value="600">600 SemiBold</option>
                    <option value="700">700 Bold</option>
                    <option value="800">800 ExtraBold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Size
                  </label>
                  <input
                    type="text"
                    value={currentStyles.fontSize || '16px'}
                    onChange={(e) => updateStyle('fontSize', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Line H
                  </label>
                  <input
                    type="text"
                    value={currentStyles.lineHeight || '1.5'}
                    onChange={(e) => updateStyle('lineHeight', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Tracking
                  </label>
                  <input
                    type="text"
                    value={currentStyles.letterSpacing || '0em'}
                    onChange={(e) =>
                      updateStyle('letterSpacing', e.target.value)
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* Alignment & Text Color */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center rounded border border-border bg-background p-0.5">
                  {(
                    [
                      ['left', AlignLeft],
                      ['center', AlignCenter],
                      ['right', AlignRight],
                      ['justify', AlignJustify],
                    ] as const
                  ).map(([align, Icon]) => (
                    <button
                      key={align}
                      onClick={() => updateStyle('textAlign', align)}
                      className={`p-1.5 rounded ${
                        currentStyles.textAlign === align
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title={`Align ${align}`}
                    >
                      <Icon className="h-3 w-3" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="color"
                    value={
                      currentStyles.color?.startsWith('#')
                        ? currentStyles.color
                        : '#F8FAFC'
                    }
                    onChange={(e) => updateStyle('color', e.target.value)}
                    className="h-6 w-6 rounded border border-border bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentStyles.color || '#F8FAFC'}
                    onChange={(e) => updateStyle('color', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Colors, Fills, Borders, Shadows & Global Tokens */}
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-primary" />
                  Fill, Borders & Tokens
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Background Fill
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={
                        currentStyles.backgroundColor?.startsWith('#')
                          ? currentStyles.backgroundColor
                          : '#13151C'
                      }
                      onChange={(e) =>
                        updateStyle('backgroundColor', e.target.value)
                      }
                      className="h-6 w-6 rounded border border-border bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={currentStyles.backgroundColor || 'transparent'}
                      onChange={(e) =>
                        updateStyle('backgroundColor', e.target.value)
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Border Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={
                        currentStyles.borderColor?.startsWith('#')
                          ? currentStyles.borderColor
                          : '#262938'
                      }
                      onChange={(e) => {
                        updateStyle('borderColor', e.target.value)
                        if (!currentStyles.borderWidth) {
                          updateStyle('borderWidth', '1px')
                          updateStyle('borderStyle', 'solid')
                        }
                      }}
                      className="h-6 w-6 rounded border border-border bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={currentStyles.borderColor || '#262938'}
                      onChange={(e) =>
                        updateStyle('borderColor', e.target.value)
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Radius
                  </label>
                  <input
                    type="text"
                    value={currentStyles.borderRadius || '0px'}
                    onChange={(e) =>
                      updateStyle('borderRadius', e.target.value)
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Border W
                  </label>
                  <input
                    type="text"
                    value={currentStyles.borderWidth || '0px'}
                    onChange={(e) => updateStyle('borderWidth', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Opacity
                  </label>
                  <input
                    type="text"
                    value={currentStyles.opacity || '1'}
                    onChange={(e) => updateStyle('opacity', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* Global Project Color Tokens */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Project Design Tokens (Click to apply fill)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {colorTokens.map((tok) => (
                    <button
                      key={tok.id}
                      onClick={() => updateStyle('backgroundColor', tok.value)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        updateStyle('color', tok.value)
                      }}
                      title={`${tok.name} (${tok.cssVar}: ${tok.value}) — Click for Fill, Right-click for Text`}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-background hover:border-primary px-2 py-1 text-[10px] transition-colors"
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-white/20"
                        style={{ backgroundColor: tok.value }}
                      />
                      <span className="truncate max-w-[85px]">{tok.name}</span>
                    </button>
                  ))}
                </div>

                {/* Add New Global Token */}
                <div className="flex items-center gap-1 pt-1">
                  <input
                    type="color"
                    value={newTokenColor}
                    onChange={(e) => setNewTokenColor(e.target.value)}
                    className="h-6 w-6 rounded border border-border bg-transparent cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="New token name..."
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-[10px]"
                  />
                  <button
                    onClick={() => {
                      if (!newTokenName.trim()) return
                      onAddColorToken(newTokenName.trim(), newTokenColor)
                      setNewTokenName('')
                    }}
                    className="rounded bg-secondary px-2 py-1 text-[10px] font-medium hover:bg-primary hover:text-primary-foreground"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Layout, Flex/Grid & Interactive Box Model */}
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] flex items-center gap-1.5">
                  <Layout className="h-3.5 w-3.5 text-primary" />
                  Layout & Box Model
                </span>
              </div>

              {/* Display Mode */}
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-background p-0.5">
                {(['block', 'flex', 'grid', 'inline-flex'] as const).map(
                  (disp) => (
                    <button
                      key={disp}
                      onClick={() => updateStyle('display', disp)}
                      className={`py-1 rounded text-[10px] font-mono transition-colors ${
                        (currentStyles.display || 'block') === disp
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {disp}
                    </button>
                  )
                )}
              </div>

              {/* Flex or Grid Controls */}
              {(currentStyles.display === 'flex' ||
                currentStyles.display === 'inline-flex') && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Direction
                    </label>
                    <select
                      value={currentStyles.flexDirection || 'row'}
                      onChange={(e) =>
                        updateStyle('flexDirection', e.target.value)
                      }
                      className="w-full rounded border border-border bg-background px-1.5 py-1 text-[10px] font-mono"
                    >
                      <option value="row">row →</option>
                      <option value="column">column ↓</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Justify
                    </label>
                    <select
                      value={currentStyles.justifyContent || 'flex-start'}
                      onChange={(e) =>
                        updateStyle('justifyContent', e.target.value)
                      }
                      className="w-full rounded border border-border bg-background px-1.5 py-1 text-[10px] font-mono"
                    >
                      <option value="flex-start">start</option>
                      <option value="center">center</option>
                      <option value="space-between">between</option>
                      <option value="flex-end">end</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Gap
                    </label>
                    <input
                      type="text"
                      value={currentStyles.gap || '12px'}
                      onChange={(e) => updateStyle('gap', e.target.value)}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>
              )}

              {currentStyles.display === 'grid' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Grid Columns
                    </label>
                    <input
                      type="text"
                      value={
                        currentStyles.gridTemplateColumns ||
                        'repeat(3, minmax(0, 1fr))'
                      }
                      onChange={(e) =>
                        updateStyle('gridTemplateColumns', e.target.value)
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-[10px] font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Grid Gap
                    </label>
                    <input
                      type="text"
                      value={currentStyles.gap || '20px'}
                      onChange={(e) => updateStyle('gap', e.target.value)}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Visual Webflow-Style Margin / Padding Box Model */}
              <div className="rounded-lg border border-border bg-background/60 p-2.5 text-[10px] font-mono">
                <div className="text-[9px] uppercase text-muted-foreground mb-1 flex justify-between">
                  <span>Margin (Outer)</span>
                  <span>Padding (Inner)</span>
                </div>
                <div className="border border-dashed border-amber-500/40 rounded p-2 bg-amber-500/5 flex flex-col items-center gap-1.5">
                  {/* Margin Top */}
                  <input
                    type="text"
                    value={currentStyles.marginTop || '0px'}
                    onChange={(e) => updateStyle('marginTop', e.target.value)}
                    className="w-12 text-center bg-background border border-border rounded py-0.5 text-[10px]"
                    title="Margin Top"
                  />

                  <div className="w-full flex items-center justify-between gap-1.5">
                    {/* Margin Left */}
                    <input
                      type="text"
                      value={currentStyles.marginLeft || '0px'}
                      onChange={(e) =>
                        updateStyle('marginLeft', e.target.value)
                      }
                      className="w-11 text-center bg-background border border-border rounded py-0.5 text-[10px]"
                      title="Margin Left"
                    />

                    {/* Inner Padding Box */}
                    <div className="flex-1 border border-indigo-500/40 rounded p-2 bg-indigo-500/10 flex flex-col items-center gap-1">
                      <input
                        type="text"
                        value={currentStyles.paddingTop || '0px'}
                        onChange={(e) =>
                          updateStyle('paddingTop', e.target.value)
                        }
                        className="w-12 text-center bg-background border border-border rounded py-0.5 text-[10px]"
                        title="Padding Top"
                      />
                      <div className="w-full flex items-center justify-between">
                        <input
                          type="text"
                          value={currentStyles.paddingLeft || '0px'}
                          onChange={(e) =>
                            updateStyle('paddingLeft', e.target.value)
                          }
                          className="w-11 text-center bg-background border border-border rounded py-0.5 text-[10px]"
                          title="Padding Left"
                        />
                        <span className="text-[9px] text-muted-foreground">
                          BOX
                        </span>
                        <input
                          type="text"
                          value={currentStyles.paddingRight || '0px'}
                          onChange={(e) =>
                            updateStyle('paddingRight', e.target.value)
                          }
                          className="w-11 text-center bg-background border border-border rounded py-0.5 text-[10px]"
                          title="Padding Right"
                        />
                      </div>
                      <input
                        type="text"
                        value={currentStyles.paddingBottom || '0px'}
                        onChange={(e) =>
                          updateStyle('paddingBottom', e.target.value)
                        }
                        className="w-12 text-center bg-background border border-border rounded py-0.5 text-[10px]"
                        title="Padding Bottom"
                      />
                    </div>

                    {/* Margin Right */}
                    <input
                      type="text"
                      value={currentStyles.marginRight || '0px'}
                      onChange={(e) =>
                        updateStyle('marginRight', e.target.value)
                      }
                      className="w-11 text-center bg-background border border-border rounded py-0.5 text-[10px]"
                      title="Margin Right"
                    />
                  </div>

                  {/* Margin Bottom */}
                  <input
                    type="text"
                    value={currentStyles.marginBottom || '0px'}
                    onChange={(e) =>
                      updateStyle('marginBottom', e.target.value)
                    }
                    className="w-12 text-center bg-background border border-border rounded py-0.5 text-[10px]"
                    title="Margin Bottom"
                  />
                </div>
              </div>

              {/* Dimensions & Position */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">W</label>
                  <input
                    type="text"
                    value={currentStyles.width || 'auto'}
                    onChange={(e) => updateStyle('width', e.target.value)}
                    className="w-full rounded border border-border bg-background px-1.5 py-1 text-[10px] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">H</label>
                  <input
                    type="text"
                    value={currentStyles.height || 'auto'}
                    onChange={(e) => updateStyle('height', e.target.value)}
                    className="w-full rounded border border-border bg-background px-1.5 py-1 text-[10px] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Pos
                  </label>
                  <select
                    value={currentStyles.position || 'static'}
                    onChange={(e) => updateStyle('position', e.target.value)}
                    className="w-full rounded border border-border bg-background px-1 py-1 text-[10px] font-mono"
                  >
                    <option value="static">static</option>
                    <option value="relative">rel</option>
                    <option value="absolute">abs</option>
                    <option value="sticky">sticky</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Z-Idx
                  </label>
                  <input
                    type="text"
                    value={currentStyles.zIndex || 'auto'}
                    onChange={(e) => updateStyle('zIndex', e.target.value)}
                    className="w-full rounded border border-border bg-background px-1.5 py-1 text-[10px] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 5. Media, Links & Framework Attributes (Webflow IX2 / Thymeleaf / Href) */}
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] flex items-center gap-1.5">
                  {selectedNode.tag === 'img' ? (
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                  )}
                  Media, Links & Native Attributes
                </span>
              </div>

              {selectedNode.tag === 'img' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Image Source URL (src)
                    </label>
                    <input
                      type="text"
                      value={selectedNode.attributes.src || ''}
                      onChange={(e) =>
                        onUpdateNode((n) => ({
                          ...n,
                          attributes: { ...n.attributes, src: e.target.value },
                        }))
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Quick Swap Asset Presets
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESET_IMAGES.map((img) => (
                        <button
                          key={img.label}
                          onClick={() =>
                            onUpdateNode((n) => ({
                              ...n,
                              attributes: { ...n.attributes, src: img.url },
                            }))
                          }
                          className="rounded border border-border bg-background hover:border-primary px-2 py-1 text-[10px] text-left truncate"
                        >
                          {img.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">
                      Alt Text (Accessibility)
                    </label>
                    <input
                      type="text"
                      value={selectedNode.attributes.alt || ''}
                      onChange={(e) =>
                        onUpdateNode((n) => ({
                          ...n,
                          attributes: { ...n.attributes, alt: e.target.value },
                        }))
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                    />
                  </div>
                </div>
              )}

              {(selectedNode.tag === 'a' || selectedNode.tag === 'button') && (
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    Link Target (href)
                  </label>
                  <input
                    type="text"
                    value={selectedNode.attributes.href || '#'}
                    onChange={(e) =>
                      onUpdateNode((n) => ({
                        ...n,
                        attributes: { ...n.attributes, href: e.target.value },
                      }))
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                  />
                </div>
              )}

              {/* Preserved Framework Attributes (Webflow data-w-id, Framer data-framer-name, Thymeleaf th:*) */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground">
                  Preserved Native Attributes
                </label>
                {Object.entries(selectedNode.attributes).map(([attrK, attrV]) => (
                  <div key={attrK} className="grid grid-cols-5 gap-1.5 items-center">
                    <span className="col-span-2 font-mono text-[10px] text-muted-foreground truncate">
                      {attrK}
                    </span>
                    <input
                      type="text"
                      value={attrV}
                      onChange={(e) =>
                        onUpdateNode((n) => ({
                          ...n,
                          attributes: {
                            ...n.attributes,
                            [attrK]: e.target.value,
                          },
                        }))
                      }
                      className="col-span-3 rounded border border-border bg-background px-2 py-1 text-[10px] font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ANIMATION & TIMELINE TAB */
          <div className="p-3.5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Element Timeline & Motion
              </span>
              <button
                onClick={onReplayAnimation}
                className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-xs"
              >
                <Play className="h-3 w-3 fill-current" /> Preview
              </button>
            </div>

            {/* Animation Preset Grid */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                Motion Preset
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['none', 'None'],
                    ['fade', 'Fade In'],
                    ['slide-up', 'Slide Up'],
                    ['slide-left', 'Slide Left'],
                    ['scale', 'Scale Pop'],
                    ['rotate', 'Rotate In'],
                    ['blur', 'Blur Reveal'],
                    ['stagger', 'Stagger Children'],
                    ['typewriter', 'Typewriter'],
                    ['parallax', 'Scroll Parallax'],
                  ] as Array<[AnimationPreset, string]>
                ).map(([presetKey, label]) => (
                  <button
                    key={presetKey}
                    onClick={() => updateAnimation({ preset: presetKey })}
                    className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium text-left transition-all ${
                      anim.preset === presetKey
                        ? 'border-primary bg-primary/15 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                Interaction Trigger
              </label>
              <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-background p-0.5">
                {(
                  [
                    ['load', 'Load'],
                    ['scroll', 'Scroll'],
                    ['hover', 'Hover'],
                    ['click', 'Click'],
                  ] as Array<[AnimationTrigger, string]>
                ).map(([trig, label]) => (
                  <button
                    key={trig}
                    onClick={() => updateAnimation({ trigger: trig })}
                    className={`py-1 rounded text-[11px] font-medium transition-colors ${
                      anim.trigger === trig
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration, Delay & Loop */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-mono">{anim.duration}ms</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={2000}
                  step={50}
                  value={anim.duration}
                  onChange={(e) =>
                    updateAnimation({ duration: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Delay</span>
                  <span className="font-mono">{anim.delay}ms</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1200}
                  step={50}
                  value={anim.delay}
                  onChange={(e) =>
                    updateAnimation({ delay: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </div>
            </div>

            {/* Visual Keyframe Timeline Track */}
            <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>0ms</span>
                <span>750ms</span>
                <span>1500ms</span>
              </div>
              <div className="h-6 rounded bg-muted/60 relative overflow-hidden flex items-center px-1">
                <div
                  style={{
                    marginLeft: `${Math.min(75, (anim.delay / 1500) * 100)}%`,
                    width: `${Math.max(12, Math.min(85, (anim.duration / 1500) * 100))}%`,
                  }}
                  className="h-3.5 rounded-full bg-gradient-to-r from-primary to-amber-400 flex items-center justify-between px-1.5 text-[9px] font-mono text-white font-bold shadow-sm"
                >
                  <span>◆</span>
                  <span>{anim.preset}</span>
                  <span>◆</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anim.loop}
                    onChange={(e) =>
                      updateAnimation({ loop: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  Infinite Loop
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Total: {anim.delay + anim.duration}ms
                </span>
              </div>
            </div>

            {/* Easing Curve Editor & SVG Bezier Preview */}
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                Easing Curve
              </label>
              <select
                value={anim.easing}
                onChange={(e) => updateAnimation({ easing: e.target.value })}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-[11px] font-mono"
              >
                {EASING_PRESETS.map((ep) => (
                  <option key={ep.value} value={ep.value}>
                    {ep.label}
                  </option>
                ))}
              </select>

              <div className="rounded-lg border border-border bg-background p-3 flex items-center gap-3">
                <svg
                  viewBox="0 0 100 100"
                  className="h-14 w-14 rounded border border-border/60 bg-muted/20 shrink-0"
                >
                  <line
                    x1="0"
                    y1="100"
                    x2="100"
                    y2="0"
                    stroke="currentColor"
                    strokeOpacity="0.15"
                    strokeDasharray="3 3"
                  />
                  <path
                    d="M 5 95 C 20 10, 35 5, 95 5"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="3"
                  />
                  <circle cx="20" cy="10" r="4" fill="#F59E0B" />
                  <circle cx="35" cy="5" r="4" fill="#10B981" />
                </svg>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-[10px] text-muted-foreground">
                    Compiled Output ({stack === 'nextjs' || stack === 'react' ? 'Framer Motion' : 'CSS Keyframes'})
                  </div>
                  <code className="block rounded bg-muted px-2 py-1 text-[10px] font-mono text-emerald-400 truncate">
                    {stack === 'nextjs' || stack === 'react'
                      ? `<motion.${selectedNode.tag} animate={{ ... }} />`
                      : `animation: morph-${anim.preset} ${anim.duration}ms;`}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
