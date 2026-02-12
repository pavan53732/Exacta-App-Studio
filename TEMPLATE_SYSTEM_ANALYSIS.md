# Template and Scaffolding System Analysis

## Overview
This document provides a detailed analysis of the current template and scaffolding system in the Exacta App Studio project.

## Current Template Structure

### 1. Local Templates (`scaffold/` directory)
The project includes a built-in React template located in the `scaffold/` directory:

**Key Files:**
- `scaffold/package.json` - Vite + React + TypeScript template
- `scaffold/src/App.tsx` - Main application component
- `scaffold/src/components/ui/` - ShadCN UI components (40+ components)
- `scaffold/index.html` - Entry HTML file
- `scaffold/vite.config.ts` - Vite configuration
- `scaffold/tailwind.config.ts` - Tailwind CSS configuration

**Features:**
- React 19 + Vite + TypeScript
- ShadCN UI component library
- Tailwind CSS styling
- Pre-configured ESLint and formatting
- Basic routing with Index and NotFound pages
- Mobile-responsive design with use-mobile hook

### 2. Template Configuration (`src/shared/templates.ts`)
Central template registry defining available templates:

```typescript
export interface Template {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  githubUrl?: string;
  isOfficial: boolean;
  isExperimental?: boolean;
  requiresNeon?: boolean;
}

export const localTemplatesData: Template[] = [
  {
    id: "react",
    title: "React.js Template",
    description: "Uses React.js, Vite, Shadcn, Tailwind and TypeScript.",
    imageUrl: "https://github.com/user-attachments/assets/5b700eab-b28c-498e-96de-8649b14c16d9",
    isOfficial: true,
  },
  {
    id: "next",
    title: "Next.js Template",
    description: "Uses Next.js, React.js, Shadcn, Tailwind and TypeScript.",
    imageUrl: "https://github.com/user-attachments/assets/96258e4f-abce-4910-a62a-a9dff77965f2",
    githubUrl: "https://github.com/dyad-sh/nextjs-template",
    isOfficial: true,
  },
  {
    id: "portal-mini-store",
    title: "Portal: Mini Store Template",
    description: "Uses Neon DB, Payload CMS, Next.js",
    imageUrl: "https://github.com/user-attachments/assets/ed86f322-40bf-4fd5-81dc-3b1d8a16e12b",
    githubUrl: "https://github.com/dyad-sh/portal-mini-store-template",
    isOfficial: true,
    isExperimental: true,
    requiresNeon: true,
  }
];
```

## Template Generation Logic

### Core Implementation (`src/ipc/handlers/createFromTemplate.ts`)

The template creation process follows this workflow:

1. **Template Selection**: Uses `settings.selectedTemplateId` to determine which template to use
2. **Local vs Remote**: 
   - `"react"` template uses local `scaffold/` directory
   - Other templates clone from GitHub repositories
3. **GitHub Cloning**: Implements smart caching with SHA comparison
4. **Repository Copying**: Copies contents while excluding `node_modules` and `.git` directories

**Key Features:**
- Smart repository caching with Git SHA verification
- Automatic updates when remote repositories change
- Error handling for network failures
- Filtering of unnecessary files during copy

### Template Utilities (`src/ipc/utils/template_utils.ts`)

Handles template discovery and API integration:

- Fetches community templates from `https://api.dyad.sh/v1/templates`
- Combines local and API templates
- Caching mechanism for API responses
- Template validation and error handling

## Supported Frameworks

Currently supported frameworks:
1. **React.js** (Local template) - Vite + React + TypeScript + ShadCN
2. **Next.js** (GitHub template) - Next.js + React + TypeScript + ShadCN  
3. **Portal Mini Store** (GitHub template) - Next.js + Neon DB + Payload CMS (Experimental)

## Windows-Specific Considerations

### Current State
- **No Windows-specific templates**: All templates are framework-agnostic
- **Electron packaging**: Windows builds use Electron Forge with Squirrel installer
- **Native components**: Guardian system implemented in .NET for Windows

### Limitations
1. **Template agnostic**: No Windows desktop app templates (WinForms, WPF, UWP)
2. **No Windows SDK integration**: Missing templates for Windows-specific APIs
3. **Limited platform features**: Templates don't leverage Windows-specific capabilities

## Template Selection UI

### Component: `TemplateCard.tsx`
- Visual template cards with images and descriptions
- Official vs community template differentiation
- Experimental template warnings
- Neon requirement validation
- Community code consent flow

### Features:
- Click-to-select template interface
- GitHub repository links
- Visual selection indicators
- Warning dialogs for requirements

## Testing Infrastructure

### E2E Tests
Located in `e2e-tests/`:
- `template-community.spec.ts` - Community template consent flows
- `github-import.spec.ts` - GitHub repository importing functionality

Tests cover:
- Template selection workflows
- Community code consent dialogs
- GitHub authentication flows
- Repository cloning and importing
- Advanced options configuration

## Current Limitations

### 1. Template Diversity
- Only 3 official templates
- Heavy reliance on GitHub for extended templates
- Limited framework support (React, Next.js primarily)

### 2. Windows Platform Support
- No native Windows application templates
- Missing Windows Desktop Bridge templates
- No UWP/PWA templates
- Limited Windows API integration examples

### 3. Template Customization
- Basic template selection only
- No parameterized template generation
- Limited post-generation customization options

### 4. Caching and Updates
- Repository caching works but could be more robust
- No offline template browsing capability
- Limited template preview functionality

## Recommendations for Enhancement

### 1. Windows-Specific Templates
- Add WinForms/WPF application templates
- Include Windows Desktop Bridge templates
- Create UWP/PWA hybrid templates
- Add Windows Service templates

### 2. Template Parameterization
- Add template variables and customization options
- Implement template preview functionality
- Add offline template browsing capability

### 3. Enhanced Caching
- Improve repository update detection
- Add template versioning system
- Implement template bundling for offline use

### 4. Expanded Framework Support
- Add Vue.js templates
- Include Angular templates
- Add Svelte templates
- Support mobile-first frameworks

## Security Considerations

### Current Safeguards
- Community code consent dialog for non-official templates
- GitHub URL validation and sanitization
- Repository SHA verification for updates
- File filtering during copy operations

### Areas for Improvement
- Template signature verification
- Sandboxed template execution
- Enhanced permission controls
- Template vulnerability scanning

## Conclusion

The current template system provides a solid foundation with:
- Well-structured local React template
- Flexible GitHub integration
- Smart caching mechanisms
- Comprehensive testing coverage

However, significant opportunities exist for Windows platform specialization and template diversity expansion to better serve the Windows application development use case.