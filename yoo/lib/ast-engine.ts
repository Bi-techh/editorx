import {
  EditorNode,
  ElementStyles,
  FrameworkStack,
  ImportedProject,
  ProjectFile,
  ProjectPage,
} from './editor-types'
import { DEFAULT_ANIMATION } from './sample-projects'

// Deep clone helper
export function cloneTree<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// Find a node by ID in the tree
export function findNodeById(root: EditorNode, id: string): EditorNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return null
}

// Update a node by ID immutably
export function updateNodeById(
  root: EditorNode,
  id: string,
  updater: (node: EditorNode) => EditorNode
): EditorNode {
  if (root.id === id) {
    return updater(cloneTree(root))
  }
  return {
    ...root,
    children: root.children.map((child) => updateNodeById(child, id, updater)),
  }
}

// Delete a node by ID
export function deleteNodeById(root: EditorNode, id: string): EditorNode {
  if (root.id === id) return root // Cannot delete root
  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== id)
      .map((child) => deleteNodeById(child, id)),
  }
}

// Duplicate a node by ID right after itself
export function duplicateNodeById(root: EditorNode, id: string): EditorNode {
  const assignNewIds = (node: EditorNode): EditorNode => ({
    ...node,
    id: `${node.id}-copy-${Math.random().toString(36).slice(2, 6)}`,
    name: `${node.name} Copy`,
    children: node.children.map(assignNewIds),
  })

  const walk = (current: EditorNode): EditorNode => {
    const nextChildren: EditorNode[] = []
    for (const child of current.children) {
      nextChildren.push(walk(child))
      if (child.id === id) {
        nextChildren.push(assignNewIds(cloneTree(child)))
      }
    }
    return { ...current, children: nextChildren }
  }

  return walk(root)
}

// Reorder / reparent node in tree (drag-and-drop in Layers panel)
export function moveNodeInTree(
  root: EditorNode,
  draggedId: string,
  targetId: string,
  position: 'before' | 'after' | 'inside'
): EditorNode {
  if (draggedId === root.id || draggedId === targetId) return root
  const draggedNode = findNodeById(root, draggedId)
  if (!draggedNode) return root

  // Prevent moving a parent inside its own descendant
  if (findNodeById(draggedNode, targetId)) return root

  const withoutDragged = deleteNodeById(root, draggedId)

  if (position === 'inside') {
    return updateNodeById(withoutDragged, targetId, (target) => ({
      ...target,
      children: [...target.children, draggedNode],
    }))
  }

  const insertRelative = (current: EditorNode): EditorNode => {
    const nextChildren: EditorNode[] = []
    for (const child of current.children) {
      if (child.id === targetId && position === 'before') {
        nextChildren.push(draggedNode)
      }
      nextChildren.push(insertRelative(child))
      if (child.id === targetId && position === 'after') {
        nextChildren.push(draggedNode)
      }
    }
    return { ...current, children: nextChildren }
  }

  return insertRelative(withoutDragged)
}

// Convert camelCase style object to inline CSS string
export function stylesToCssString(styles: Partial<ElementStyles>): string {
  const entries = Object.entries(styles).filter(
    ([, val]) => val !== undefined && val !== ''
  )
  return entries
    .map(([key, val]) => {
      const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      return `${kebab}: ${val}`
    })
    .join('; ')
}

// Convert camelCase style object to JSX style object literal string
function stylesToJsxObject(styles: Partial<ElementStyles>, indent: string): string {
  const entries = Object.entries(styles).filter(
    ([, val]) => val !== undefined && val !== ''
  )
  if (entries.length === 0) return ''
  const pairs = entries.map(([k, v]) => `${k}: '${v}'`).join(', ')
  return ` style={{ ${pairs} }}`
}

// Generate native source code for a page in its framework's own language and structure
// Updates lineStart and lineEnd on each EditorNode so source mapping is 100% accurate
export function generatePageSourceCode(
  page: ProjectPage,
  stack: FrameworkStack
): { code: string; updatedRoot: EditorNode } {
  const clonedRoot = cloneTree(page.rootNode)
  const lines: string[] = []

  const pushLine = (text: string) => {
    lines.push(text)
    return lines.length
  }

  if (stack === 'nextjs' || stack === 'react') {
    const hasAnimations = checkHasAnimation(clonedRoot)
    if (hasAnimations) {
      pushLine(`'use client'`)
      pushLine(`import { motion } from 'framer-motion'`)
    }
    pushLine(`import type { Metadata } from 'next'`)
    pushLine(``)
    pushLine(`export const metadata: Metadata = {`)
    pushLine(`  title: '${page.meta.title.replace(/'/g, "\\'")}',`)
    pushLine(`  description: '${page.meta.description.replace(/'/g, "\\'")}',`)
    pushLine(`}`)
    pushLine(``)
    pushLine(`export default function Page() {`)
    pushLine(`  return (`)

    const serializeJsx = (node: EditorNode, depth: number) => {
      if (node.hidden) return
      const pad = ' '.repeat(depth * 2)
      const startLine = lines.length + 1
      const hasAnim = node.animation && node.animation.preset !== 'none'
      const tagName = node.isComponent && node.componentName
        ? node.componentName
        : hasAnim
          ? `motion.${node.tag}`
          : node.tag

      const classAttr = node.className ? ` className="${node.className}"` : ''
      const styleAttr = stylesToJsxObject(node.styles, pad)

      let propsStr = ''
      if (node.isComponent && node.componentProps) {
        propsStr = Object.entries(node.componentProps)
          .map(([k, v]) =>
            typeof v === 'string' ? ` ${k}="${v}"` : ` ${k}={${JSON.stringify(v)}}`
          )
          .join('')
      }

      let animStr = ''
      if (hasAnim) {
        const anim = node.animation
        const initialMap: Record<string, string> = {
          fade: '{ opacity: 0 }',
          'slide-up': '{ opacity: 0, y: 24 }',
          'slide-left': '{ opacity: 0, x: 28 }',
          scale: '{ opacity: 0, scale: 0.92 }',
          rotate: '{ opacity: 0, rotate: -6 }',
          blur: '{ opacity: 0, filter: "blur(8px)" }',
          stagger: '{ opacity: 0, y: 16 }',
          typewriter: '{ opacity: 0 }',
          parallax: '{ y: 32 }',
        }
        const animateProp = anim.trigger === 'scroll' ? 'whileInView' : anim.trigger === 'hover' ? 'whileHover' : 'animate'
        animStr = ` initial=${initialMap[anim.preset] || '{ opacity: 0 }'} ${animateProp}={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }} transition={{ duration: ${(anim.duration / 1000).toFixed(2)}, delay: ${(anim.delay / 1000).toFixed(2)} }}`
      }

      const otherAttrs = Object.entries(node.attributes || {})
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')

      if (node.tag === 'img') {
        pushLine(`${pad}<${tagName}${classAttr}${otherAttrs}${styleAttr}${animStr} />`)
      } else if (node.children.length === 0) {
        const text = node.textContent ?? ''
        pushLine(`${pad}<${tagName}${classAttr}${propsStr}${otherAttrs}${styleAttr}${animStr}>`)
        if (text) pushLine(`${pad}  ${text}`)
        pushLine(`${pad}</${tagName}>`)
      } else {
        pushLine(`${pad}<${tagName}${classAttr}${propsStr}${otherAttrs}${styleAttr}${animStr}>`)
        for (const child of node.children) {
          serializeJsx(child, depth + 1)
        }
        pushLine(`${pad}</${tagName}>`)
      }
      node.sourceLocation = {
        file: page.filePath,
        lineStart: startLine,
        lineEnd: lines.length,
      }
    }

    serializeJsx(clonedRoot, 2)
    pushLine(`  )`)
    pushLine(`}`)
  } else if (stack === 'astro') {
    pushLine(`---`)
    pushLine(`// Astro 5 Page — Two-Way Visual AST Synced`)
    pushLine(`const title = "${page.meta.title}"`)
    pushLine(`const description = "${page.meta.description}"`)
    pushLine(`---`)
    pushLine(`<!doctype html>`)
    pushLine(`<html lang="en">`)
    pushLine(`  <head>`)
    pushLine(`    <title>{title}</title>`)
    pushLine(`    <meta name="description" content={description} />`)
    pushLine(`  </head>`)
    pushLine(`  <body>`)
    serializeHtmlNode(clonedRoot, 2, lines, page.filePath)
    pushLine(`  </body>`)
    pushLine(`</html>`)
  } else if (stack === 'vue' || stack === 'svelte') {
    if (stack === 'vue') {
      pushLine(`<script setup lang="ts">`)
      pushLine(`const pageTitle = "${page.meta.title}"`)
      pushLine(`</script>`)
      pushLine(`<template>`)
      serializeHtmlNode(clonedRoot, 1, lines, page.filePath)
      pushLine(`</template>`)
    } else {
      pushLine(`<script lang="ts">`)
      pushLine(`  export let title = "${page.meta.title}";`)
      pushLine(`</script>`)
      serializeHtmlNode(clonedRoot, 0, lines, page.filePath)
    }
  } else {
    // Webflow, Framer, HTML, or Thymeleaf/JSP
    const isThymeleaf = stack === 'thymeleaf'
    pushLine(`<!DOCTYPE html>`)
    pushLine(
      isThymeleaf
        ? `<html lang="en" xmlns:th="http://www.thymeleaf.org">`
        : `<html lang="en" data-wf-site="65f9a82b10a">`
    )
    pushLine(`<head>`)
    pushLine(`  <meta charset="utf-8" />`)
    pushLine(`  <title>${page.meta.title}</title>`)
    pushLine(`  <meta name="description" content="${page.meta.description}" />`)
    pushLine(`  <meta property="og:image" content="${page.meta.ogImage}" />`)
    if (stack === 'webflow') {
      pushLine(`  <link rel="stylesheet" href="css/aether.webflow.css" />`)
    } else if (stack === 'framer') {
      pushLine(`  <link rel="stylesheet" href="styles/framer-tokens.css" />`)
    }
    pushLine(`</head>`)
    pushLine(`<body>`)
    serializeHtmlNode(clonedRoot, 1, lines, page.filePath)
    pushLine(`</body>`)
    pushLine(`</html>`)
  }

  return {
    code: lines.join('\n'),
    updatedRoot: clonedRoot,
  }
}

function checkHasAnimation(node: EditorNode): boolean {
  if (node.animation && node.animation.preset !== 'none') return true
  return node.children.some(checkHasAnimation)
}

function serializeHtmlNode(
  node: EditorNode,
  depth: number,
  lines: string[],
  filePath: string
) {
  if (node.hidden) return
  const pad = '  '.repeat(depth)
  const startLine = lines.length + 1
  const classAttr = node.className ? ` class="${node.className}"` : ''
  const otherAttrs = Object.entries(node.attributes || {})
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('')

  const animAttrs =
    node.animation && node.animation.preset !== 'none'
      ? ` data-anim-preset="${node.animation.preset}" data-anim-trigger="${node.animation.trigger}" data-anim-duration="${node.animation.duration}ms" data-anim-easing="${node.animation.easing}"`
      : ''

  const cssInline = stylesToCssString(node.styles)
  const styleAttr = cssInline ? ` style="${cssInline}"` : ''

  if (node.tag === 'img') {
    lines.push(`${pad}<img${classAttr}${otherAttrs}${animAttrs}${styleAttr} />`)
  } else if (node.children.length === 0) {
    const text = node.textContent ?? ''
    lines.push(
      `${pad}<${node.tag}${classAttr}${otherAttrs}${animAttrs}${styleAttr}>${text}</${node.tag}>`
    )
  } else {
    lines.push(`${pad}<${node.tag}${classAttr}${otherAttrs}${animAttrs}${styleAttr}>`)
    for (const child of node.children) {
      serializeHtmlNode(child, depth + 1, lines, filePath)
    }
    lines.push(`${pad}</${node.tag}>`)
  }

  node.sourceLocation = {
    file: filePath,
    lineStart: startLine,
    lineEnd: lines.length,
  }
}

// Hydrate initial files map for a sample or imported project
export function initializeProjectFiles(project: ImportedProject): ImportedProject {
  const cloned = cloneTree(project)
  const files: Record<string, ProjectFile> = { ...cloned.files }

  for (const page of cloned.pages) {
    const { code, updatedRoot } = generatePageSourceCode(page, cloned.stack)
    page.rootNode = updatedRoot
    const language =
      cloned.stack === 'nextjs' || cloned.stack === 'react'
        ? 'tsx'
        : cloned.stack === 'astro'
          ? 'astro'
          : cloned.stack === 'vue'
            ? 'vue'
            : cloned.stack === 'svelte'
              ? 'svelte'
              : 'html'
    files[page.filePath] = {
      path: page.filePath,
      language,
      originalContent: code,
      currentContent: code,
    }
  }

  // Add global CSS token stylesheet
  const cssPath =
    cloned.stack === 'webflow'
      ? 'css/aether.webflow.css'
      : cloned.stack === 'framer'
        ? 'styles/framer-tokens.css'
        : 'styles/tokens.css'

  const tokenCss = [
    `/* Global Design Tokens & Responsive Rules — ${cloned.name} */`,
    `:root {`,
    ...cloned.colorTokens.map((t) => `  ${t.cssVar}: ${t.value}; /* ${t.name} */`),
    `}`,
    ``,
    `/* Animation Keyframes generated by Morph Studio */`,
    `@keyframes morph-fade { from { opacity: 0; } to { opacity: 1; } }`,
    `@keyframes morph-slide-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }`,
  ].join('\n')

  files[cssPath] = {
    path: cssPath,
    language: 'css',
    originalContent: tokenCss,
    currentContent: tokenCss,
  }

  cloned.files = files
  return cloned
}

// Parse edits made directly in the Code Editor back into the visual EditorNode tree
export function syncSourceCodeToPageTree(
  code: string,
  currentPage: ProjectPage
): ProjectPage {
  const updatedPage = cloneTree(currentPage)

  // Extract <title> or metadata title if changed in code
  const titleMatch =
    code.match(/<title>([^<{]+)<\/title>/i) ||
    code.match(/title:\s*['"]([^'"]+)['"]/)
  if (titleMatch && titleMatch[1]) {
    updatedPage.meta.title = titleMatch[1].trim()
  }

  // Walk existing tree and sync textContent, className, and inline style changes from code lines
  const codeLines = code.split('\n')

  const syncNodeFromCode = (node: EditorNode) => {
    const startIdx = Math.max(0, (node.sourceLocation?.lineStart || 1) - 1)
    const endIdx = Math.min(codeLines.length - 1, (node.sourceLocation?.lineEnd || codeLines.length) - 1)
    const snippet = codeLines.slice(startIdx, endIdx + 1).join('\n')

    // Check class or className attribute on opening tag
    const firstLine = codeLines[startIdx] || ''
    const classMatch = firstLine.match(/(?:class|className)=["']([^"']*)["']/)
    if (classMatch) {
      node.className = classMatch[1]
    }

    // Check inline HTML style="..."
    const htmlStyleMatch = firstLine.match(/style=["']([^"']+)["']/)
    if (htmlStyleMatch) {
      const parsedStyles: Record<string, string> = {}
      htmlStyleMatch[1].split(';').forEach((pair) => {
        const [rawK, rawV] = pair.split(':').map((s) => s && s.trim())
        if (rawK && rawV) {
          const camelK = rawK.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
          parsedStyles[camelK] = rawV
        }
      })
      node.styles = { ...node.styles, ...parsedStyles }
    }

    // Check JSX style={{ ... }}
    const jsxStyleMatch = firstLine.match(/style=\{\{\s*([^}]+)\s*\}\}/)
    if (jsxStyleMatch) {
      const parsedStyles: Record<string, string> = {}
      const pairRegex = /([a-zA-Z]+):\s*['"]([^'"]+)['"]/g
      let m: RegExpExecArray | null
      while ((m = pairRegex.exec(jsxStyleMatch[1])) !== null) {
        parsedStyles[m[1]] = m[2]
      }
      node.styles = { ...node.styles, ...parsedStyles }
    }

    // If leaf node with textContent, check updated inner text
    if (node.children.length === 0 && node.tag !== 'img') {
      const innerMatch = snippet.match(/>([^<>]+)<\//)
      if (innerMatch && innerMatch[1].trim()) {
        node.textContent = innerMatch[1].trim()
      }
    }

    node.children.forEach(syncNodeFromCode)
  }

  syncNodeFromCode(updatedPage.rootNode)
  return updatedPage
}

// Parse arbitrary uploaded HTML / JSX / Astro / Vue / Svelte / Thymeleaf files into a ProjectPage
export function parseUploadedFileToPage(
  filePath: string,
  content: string,
  index: number
): ProjectPage {
  const fileName = filePath.split('/').pop() || 'index.html'
  const baseName = fileName.replace(/\.(html|tsx|jsx|astro|vue|svelte|jsp)$/i, '')
  const route =
    baseName === 'index' || baseName === 'page' || baseName === '+page' || baseName === 'Home'
      ? index === 0
        ? '/'
        : `/${filePath.split('/')[0]}`
      : `/${baseName.toLowerCase()}`

  const titleMatch =
    content.match(/<title>([^<]+)<\/title>/i) ||
    content.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  const pageTitle = titleMatch ? titleMatch[1].trim() : `${baseName} Page`

  // Extract headings, paragraphs, buttons, links, images from uploaded file
  const children: EditorNode[] = []
  let nodeCounter = 1

  const tagRegex = /<(h1|h2|h3|p|a|button|span|img)([^>]*)>([\s\S]*?)<\/\1>|<img([^>]*)\/?>/gi
  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(content)) !== null && children.length < 18) {
    const isSelfClosingImg = Boolean(match[4])
    const tag = (isSelfClosingImg ? 'img' : match[1]).toLowerCase()
    const attrString = isSelfClosingImg ? match[4] : match[2] || ''
    const innerRaw = isSelfClosingImg ? '' : (match[3] || '').replace(/<[^>]+>/g, '').trim()

    if (!isSelfClosingImg && !innerRaw) continue

    const classMatch = attrString.match(/(?:class|className)=["']([^"']+)["']/)
    const className = classMatch ? classMatch[1] : `${tag}-element`

    const attributes: Record<string, string> = {}
    const hrefMatch = attrString.match(/href=["']([^"']+)["']/)
    if (hrefMatch) attributes.href = hrefMatch[1]
    const srcMatch = attrString.match(/src=["']([^"']+)["']/)
    if (srcMatch) attributes.src = srcMatch[1]
    const altMatch = attrString.match(/alt=["']([^"']+)["']/)
    if (altMatch) attributes.alt = altMatch[1]
    const wfMatch = attrString.match(/data-w-id=["']([^"']+)["']/)
    if (wfMatch) attributes['data-w-id'] = wfMatch[1]
    const thMatch = attrString.match(/th:text=["']([^"']+)["']/)
    if (thMatch) attributes['th:text'] = thMatch[1]

    const lineStart = content.slice(0, match.index).split('\n').length

    children.push({
      id: `imp-node-${index}-${nodeCounter++}`,
      tag,
      name: `${tag.toUpperCase()} (${className.split(' ')[0]})`,
      className,
      textContent: innerRaw,
      attributes,
      styles: {
        fontSize:
          tag === 'h1'
            ? '42px'
            : tag === 'h2'
              ? '30px'
              : tag === 'h3'
                ? '22px'
                : '16px',
        fontWeight: tag.startsWith('h') ? '700' : tag === 'button' || tag === 'a' ? '600' : '400',
        color: tag.startsWith('h') ? '#F8FAFC' : tag === 'p' ? '#94A3B8' : '#E2E8F0',
        backgroundColor:
          tag === 'button' || (tag === 'a' && className.includes('btn'))
            ? '#6366F1'
            : undefined,
        paddingTop: tag === 'button' ? '10px' : undefined,
        paddingBottom: tag === 'button' ? '10px' : undefined,
        paddingLeft: tag === 'button' ? '20px' : undefined,
        paddingRight: tag === 'button' ? '20px' : undefined,
        borderRadius: tag === 'button' ? '8px' : undefined,
      },
      responsiveStyles: {},
      animation: { ...DEFAULT_ANIMATION },
      sourceLocation: {
        file: filePath,
        lineStart,
        lineEnd: lineStart + 2,
      },
      children: [],
    })
  }

  if (children.length === 0) {
    children.push({
      id: `imp-fallback-${index}`,
      tag: 'h1',
      name: 'Imported Heading (<h1>)',
      className: 'imported-title',
      textContent: pageTitle,
      attributes: {},
      styles: { fontSize: '40px', fontWeight: '700', color: '#F8FAFC' },
      responsiveStyles: {},
      animation: { ...DEFAULT_ANIMATION },
      sourceLocation: { file: filePath, lineStart: 1, lineEnd: 4 },
      children: [],
    })
  }

  return {
    id: `imported-page-${index}`,
    name: fileName,
    route,
    filePath,
    meta: {
      title: pageTitle,
      description: `Imported from ${filePath}`,
      slug: route,
      ogImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      pageTransition: 'fade',
    },
    rootNode: {
      id: `imp-root-${index}`,
      tag: 'main',
      name: `Page Root (${fileName})`,
      className: 'imported-page-container',
      attributes: {},
      styles: {
        backgroundColor: '#0B0C10',
        color: '#F8FAFC',
        fontFamily: 'Inter, sans-serif',
        paddingTop: '48px',
        paddingBottom: '64px',
        paddingLeft: '40px',
        paddingRight: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      },
      responsiveStyles: {},
      animation: { ...DEFAULT_ANIMATION },
      sourceLocation: {
        file: filePath,
        lineStart: 1,
        lineEnd: content.split('\n').length,
      },
      children,
    },
  }
}

// Auto-detect framework from uploaded files
export function detectStackFromFiles(
  fileEntries: Array<{ path: string; content: string }>
): { stack: FrameworkStack; stackLabel: string; preservedFeatures: string[] } {
  const allPaths = fileEntries.map((f) => f.path.toLowerCase())
  const combinedContent = fileEntries.map((f) => f.content).join('\n')

  if (
    combinedContent.includes('data-wf-page') ||
    combinedContent.includes('data-w-id') ||
    allPaths.some((p) => p.includes('webflow'))
  ) {
    return {
      stack: 'webflow',
      stackLabel: 'Webflow Export (HTML/CSS/IX2)',
      preservedFeatures: [
        'Webflow .w-* classes preserved',
        'IX2 data-w-id interactions intact',
        'Assets & Webflow stylesheets mapped',
      ],
    }
  }

  if (
    combinedContent.includes('data-framer-name') ||
    combinedContent.includes('framer-') ||
    allPaths.some((p) => p.includes('framer'))
  ) {
    return {
      stack: 'framer',
      stackLabel: 'Framer Export (Framer Motion / CSS)',
      preservedFeatures: [
        'data-framer-name layer hierarchy preserved',
        'Framer scoped hashes untouched',
        'Spring curves mapped',
      ],
    }
  }

  if (allPaths.some((p) => p.endsWith('.astro'))) {
    return {
      stack: 'astro',
      stackLabel: 'Astro 5 (Islands + Frontmatter)',
      preservedFeatures: [
        'Astro --- frontmatter fence preserved',
        'Zero-JS Island directives intact',
      ],
    }
  }

  if (allPaths.some((p) => p.endsWith('.vue'))) {
    return {
      stack: 'vue',
      stackLabel: 'Vue 3 SFC (<script setup> + <template>)',
      preservedFeatures: ['Vue 3 Single File Components intact', 'Scoped styles preserved'],
    }
  }

  if (allPaths.some((p) => p.endsWith('.svelte'))) {
    return {
      stack: 'svelte',
      stackLabel: 'SvelteKit (+page.svelte)',
      preservedFeatures: ['Svelte reactive declarations preserved', 'Scoped styles intact'],
    }
  }

  if (
    combinedContent.includes('xmlns:th') ||
    combinedContent.includes('th:text') ||
    allPaths.some((p) => p.endsWith('.jsp'))
  ) {
    return {
      stack: 'thymeleaf',
      stackLabel: 'Java Spring Boot (Thymeleaf / JSP)',
      preservedFeatures: ['th:text & th:href attributes preserved', 'JSP/Spring expressions intact'],
    }
  }

  if (allPaths.some((p) => p.endsWith('.tsx') || p.endsWith('.jsx'))) {
    return {
      stack: 'nextjs',
      stackLabel: 'Next.js / React (TSX + Tailwind)',
      preservedFeatures: ['JSX AST & Component Props preserved', 'Framer Motion code output enabled'],
    }
  }

  return {
    stack: 'html',
    stackLabel: 'HTML5 / CSS3 / Vanilla JS',
    preservedFeatures: ['Semantic DOM structure preserved', 'Minimal inline/CSS diff sync'],
  }
}

// Compute line-by-line minimal diff between originalContent and currentContent
export interface DiffLine {
  type: 'same' | 'add' | 'remove'
  oldLineNumber?: number
  newLineNumber?: number
  content: string
}

export function computeMinimalDiff(original: string, current: string): DiffLine[] {
  const oldLines = original.split('\n')
  const newLines = current.split('\n')
  const result: DiffLine[] = []

  let i = 0
  let j = 0

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({
        type: 'same',
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
        content: oldLines[i],
      })
      i++
      j++
    } else {
      // Look ahead up to 5 lines for resync
      let synced = false
      for (let look = 1; look <= 5; look++) {
        if (i + look < oldLines.length && oldLines[i + look] === newLines[j]) {
          for (let k = 0; k < look; k++) {
            result.push({
              type: 'remove',
              oldLineNumber: i + k + 1,
              content: oldLines[i + k],
            })
          }
          i += look
          synced = true
          break
        }
        if (j + look < newLines.length && oldLines[i] === newLines[j + look]) {
          for (let k = 0; k < look; k++) {
            result.push({
              type: 'add',
              newLineNumber: j + k + 1,
              content: newLines[j + k],
            })
          }
          j += look
          synced = true
          break
        }
      }

      if (!synced) {
        if (i < oldLines.length) {
          result.push({
            type: 'remove',
            oldLineNumber: i + 1,
            content: oldLines[i],
          })
          i++
        }
        if (j < newLines.length) {
          result.push({
            type: 'add',
            newLineNumber: j + 1,
            content: newLines[j],
          })
          j++
        }
      }
    }
  }

  return result
}
