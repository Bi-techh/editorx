export type FrameworkStack =
  | 'webflow'
  | 'framer'
  | 'nextjs'
  | 'react'
  | 'astro'
  | 'vue'
  | 'svelte'
  | 'thymeleaf'
  | 'html'

export type BreakpointMode = 'desktop' | 'tablet' | 'mobile'

export type AnimationPreset =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-left'
  | 'scale'
  | 'rotate'
  | 'blur'
  | 'stagger'
  | 'typewriter'
  | 'parallax'

export type AnimationTrigger = 'load' | 'scroll' | 'hover' | 'click'

export interface ElementAnimation {
  preset: AnimationPreset
  trigger: AnimationTrigger
  duration: number // ms, e.g. 600
  delay: number // ms, e.g. 0
  easing: string // e.g. "cubic-bezier(0.16, 1, 0.3, 1)"
  loop: boolean
  scrollOffset?: number // 0 - 100%
  staggerChildren?: number // ms
}

export interface ElementStyles {
  // Typography
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  lineHeight?: string
  letterSpacing?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  color?: string

  // Fill, Border, Shadow, Opacity
  backgroundColor?: string
  backgroundImage?: string
  borderWidth?: string
  borderColor?: string
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted'
  borderRadius?: string
  boxShadow?: string
  opacity?: string

  // Layout & Box Model
  display?: 'block' | 'flex' | 'grid' | 'inline-flex' | 'inline-block' | 'none'
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline'
  gridTemplateColumns?: string
  gap?: string
  paddingTop?: string
  paddingRight?: string
  paddingBottom?: string
  paddingLeft?: string
  marginTop?: string
  marginRight?: string
  marginBottom?: string
  marginLeft?: string
  width?: string
  height?: string
  maxWidth?: string
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'
  zIndex?: string
}

export interface EditorNode {
  id: string
  tag: string // e.g. 'section', 'div', 'h1', 'p', 'a', 'button', 'img', 'nav', 'footer', 'FeatureCard'
  name: string // Human readable layer label, e.g. "Hero Section" or ".w-nav"
  className: string // Preserved Webflow / Framer / Tailwind classes
  textContent?: string
  hidden?: boolean
  locked?: boolean
  isComponent?: boolean
  componentName?: string
  componentProps?: Record<string, string | boolean | number>
  attributes: Record<string, string> // href, src, alt, data-w-id, data-framer-name, th:text, etc.
  styles: ElementStyles
  responsiveStyles: {
    tablet?: Partial<ElementStyles>
    mobile?: Partial<ElementStyles>
  }
  animation: ElementAnimation
  sourceLocation: {
    file: string
    lineStart: number
    lineEnd: number
  }
  children: EditorNode[]
}

export interface PageMeta {
  title: string
  description: string
  slug: string
  ogImage: string
  pageTransition: 'none' | 'fade' | 'slide' | 'scale'
}

export interface ProjectPage {
  id: string
  name: string
  route: string
  filePath: string
  meta: PageMeta
  rootNode: EditorNode
}

export interface ProjectFile {
  path: string
  language: 'html' | 'tsx' | 'css' | 'astro' | 'vue' | 'svelte' | 'json' | 'javascript'
  originalContent: string
  currentContent: string
}

export interface ColorToken {
  id: string
  name: string
  cssVar: string
  value: string
}

export interface VersionSnapshot {
  id: string
  label: string
  timestamp: string
  pages: ProjectPage[]
  files: Record<string, ProjectFile>
}

export interface ImportedProject {
  id: string
  name: string
  stack: FrameworkStack
  stackLabel: string
  repoUrl?: string
  branch?: string
  preservedFeatures: string[]
  colorTokens: ColorToken[]
  pages: ProjectPage[]
  files: Record<string, ProjectFile>
}
