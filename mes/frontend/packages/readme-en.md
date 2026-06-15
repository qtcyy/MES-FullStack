# UI Component Packages

This repository contains the core packages for a modern React component library implementing the shadcn/ui design system with Radix UI primitives and Tailwind CSS v4.

## 📦 Packages

### [@workspace/ui](./ui/)
Core component library containing shadcn/ui components built with:
- **React 19.1.x** with TypeScript
- **Radix UI** primitives for accessibility and behavior
- **Tailwind CSS v4** with CSS variables for theming
- **class-variance-authority (cva)** for variant management
- **Lucide React** for icons

### [@workspace/typescript-config](./typescript-config/)
Shared TypeScript configurations for consistent type checking across projects.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm package manager

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## 📖 Component Architecture

Components in the UI package follow a consistent pattern:

```typescript
import { cva, type VariantProps } from "class-variance-authority"
import * as RadixPrimitive from "@radix-ui/react-primitive"
import { cn } from "../lib/utils"

const componentVariants = cva("base-classes", {
  variants: {
    size: { sm: "...", md: "..." },
    variant: { default: "...", destructive: "..." }
  },
  defaultVariants: { size: "md", variant: "default" }
})

export interface ComponentProps 
  extends React.ComponentPropsWithoutRef<typeof RadixPrimitive.Root>,
  VariantProps<typeof componentVariants> {}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => (
    <RadixPrimitive.Root 
      ref={ref} 
      className={cn(componentVariants({ variant, size, className }))} 
      {...props} 
    />
  )
)
Component.displayName = "Component"

export { Component, componentVariants }
```

## 🎨 Theme System

The UI package includes a comprehensive theme system:

- **CSS Custom Properties**: Define colors, spacing, and other design tokens
- **Light/Dark Themes**: Automatic theme switching via CSS classes
- **Tailwind Integration**: Theme variables seamlessly integrate with Tailwind utilities

Theme variables follow the pattern: `--{element}-{property}: {value}`

## 📁 Directory Structure

```
packages/
├── ui/                          # Core UI component library
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utility functions
│   │   └── styles/             # Global styles and themes
│   ├── package.json
│   └── tsconfig.json
│
└── typescript-config/          # Shared TypeScript configurations
    ├── base.json
    ├── nextjs.json
    ├── react-library.json
    └── package.json
```

## 🛠 Available Components

The UI package includes these components:

- **Layout**: Card, Container
- **Forms**: Button, Input, Label, Checkbox, Combobox
- **Data Display**: Table, Data Table, Badge, Calendar
- **Feedback**: Alert, Alert Dialog, Dialog
- **Navigation**: Command, Popover
- **Media**: Carousel, Accordion

## 🔧 Development

### Building Packages

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build --filter @workspace/ui
```

### TypeScript Configuration

The packages use shared TypeScript configurations:

- `base.json`: Base configuration for all projects
- `react-library.json`: Configuration for React library packages
- `nextjs.json`: Configuration for Next.js applications

## 📚 Usage

### Installing in Your Project

```bash
# Install the UI package
pnpm add @workspace/ui

# Install peer dependencies
pnpm add react react-dom
```

### Importing Components

```typescript
import { Button, Card, Input } from "@workspace/ui"
import "@workspace/ui/globals.css"

function App() {
  return (
    <Card>
      <Input placeholder="Enter text..." />
      <Button>Click me</Button>
    </Card>
  )
}
```

### Theming

Import the global styles to enable the theme system:

```typescript
import "@workspace/ui/globals.css"
```

## 📋 Package.json Scripts

The UI package exposes these exports:

- `@workspace/ui`: Main component exports
- `@workspace/ui/globals.css`: Global styles and theme
- `@workspace/ui/lib/*`: Utility functions
- `@workspace/ui/components/*`: Individual components
- `@workspace/ui/hooks/*`: Custom hooks

## 🤝 Contributing

1. **Code Style**: Follow existing patterns and conventions
2. **Components**: Use forwardRef, cva variants, and Radix primitives
3. **Theming**: Use CSS custom properties for customizable styles
4. **TypeScript**: Maintain strict type safety
5. **Accessibility**: Ensure all components meet WCAG guidelines

## 📄 License

This project is private and proprietary.

## 🏗 Architecture Decisions

### Component Design
- **Radix UI Primitives**: Provides robust accessibility and keyboard navigation
- **Class Variance Authority**: Type-safe variant management
- **Tailwind Merge**: Intelligent className merging for style composition
- **ForwardRef**: Proper ref forwarding for DOM access

### Build System  
- **TypeScript**: Strict type checking for reliability
- **Modern ES Modules**: ESM-first approach for better tree shaking
- **Workspace Dependencies**: Efficient dependency management across packages

### Theme Architecture
- **CSS Custom Properties**: Runtime theme switching capability
- **Design Tokens**: Consistent spacing, colors, and typography
- **Tailwind Integration**: Seamless integration with utility classes
