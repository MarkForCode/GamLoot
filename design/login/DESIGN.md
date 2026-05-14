---
name: Gamer-Professional Modular UI
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#ecb2ff'
  on-secondary: '#520071'
  secondary-container: '#cf5cff'
  on-secondary-container: '#480063'
  tertiary: '#f9f5f5'
  on-tertiary: '#313030'
  tertiary-container: '#dcd9d8'
  on-tertiary-container: '#605f5e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#f8d8ff'
  secondary-fixed-dim: '#ecb2ff'
  on-secondary-fixed: '#320047'
  on-secondary-fixed-variant: '#74009f'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  h1:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.08em
  mono-data:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 20px
  margin: 24px
---

## Brand & Style

The visual identity of this design system centers on a "Gamer-Professional" aesthetic—a sophisticated intersection where high-performance gaming meets enterprise SaaS reliability. It is engineered to feel low-latency, high-fidelity, and authoritative. 

The design style leans heavily into **Modern Minimalism** with **Glassmorphic** accents. Surfaces are predominantly dark and matte to reduce eye strain during long sessions, while critical actions and data points are highlighted with vibrant, neon-infused light sources. This system prioritizes clarity and density, ensuring that complex guild management data remains legible while maintaining the immersive atmosphere of a gaming platform. The visual language is optimized for cross-platform implementation via Tamagui, favoring flex-based layouts and atomic styling.

## Colors

The color palette is built on a foundation of "Deep Charcoal" neutrals, providing a high-contrast backdrop for "Neon Electric" accents. 

- **Primaries:** Electric Blue is used for primary actions, progress indicators, and active states. 
- **Secondaries:** Neon Purple is reserved for high-value guild tiers, rare marketplace items, and special status callouts.
- **Neutrals:** The background starts at a true-black (#0A0A0A) to maximize the depth of the display, with the main UI containers using the specified #121212 charcoal. 
- **Functional Colors:** Success, Warning, and Error states utilize the same neon vibrance to ensure they are not lost against the dark UI, but are calibrated to maintain a "pro" look rather than a "toy" aesthetic.

## Typography

This design system utilizes **Inter** for all UI elements to ensure maximum legibility across different screen resolutions and localized languages. 

- **Hierarchies:** Headings use tight letter spacing and heavy weights to evoke a bold, technical feel. 
- **Body Text:** Uses standard weights with generous line heights to ensure readability in data-heavy SaaS views.
- **Labels:** The `label-caps` style is used for table headers and small metadata, providing a structural "utility" feel.
- **i18n Support:** Containers must never use fixed widths for text elements. Always use intrinsic sizing or flexible flex-box wrappers to accommodate the character expansion common in German or French translations.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model built on a 4px baseline unit. 

- **Web/Desktop:** A 12-column grid is standard, with 20px gutters. Navigation is handled via a multi-tenant sidebar that can be collapsed to an icon-only rail.
- **Mobile:** Transition to a single-column stack with bottom-tab navigation. 
- **Rhythm:** Spacing between modular cards should be consistent (16px or 24px) to create a clean, "bento-box" style dashboard. Components should utilize internal padding that scales logically (e.g., a card with 24px padding contains header elements with 8px spacing).

## Elevation & Depth

In a dark-themed "gamer-professional" UI, depth is conveyed through **Tonal Layering** and **Subtle Outlines** rather than traditional heavy shadows.

- **Layer 0 (Base):** #0A0A0A – Used for the global canvas.
- **Layer 1 (Card/Surface):** #121212 – Used for the primary content containers. These should have a 1px solid border (#2A2A2A) to define their edges against the base.
- **Layer 2 (Elevated/Hover):** #1E1E1E – Used for active states or elements being "picked up."
- **Glassmorphism:** Use backdrop blurs (20px radius) on navigation bars and modal overlays to maintain context of the underlying data while bringing the foreground into focus.
- **Inner Glow:** High-priority buttons or active status badges may use a very subtle inner shadow or "bloom" effect (0px blur, 1px spread) in the primary color to simulate an LED glow.

## Shapes

The design system uses **Soft (Level 1)** roundedness to maintain a precise, technical character. 

- **Components:** Standard buttons, input fields, and small cards use a 4px (`0.25rem`) corner radius.
- **Large Containers:** Dashboard widgets and main content areas use an 8px (`0.5rem`) radius for `rounded-lg`.
- **Special Elements:** Status badges and "Pill" buttons use a full circular radius for distinct shape contrast against the predominantly rectangular grid.
- **Consistency:** Avoid excessive rounding to prevent the UI from looking too consumer-focused; the goal is sharp, professional precision.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Electric Blue background with black text for maximum contrast.
- **Secondary Action:** Ghost style—1px Electric Blue border with transparent background and Blue text.
- **Inputs:** Dark grey background (#1E1E1E) with a subtle bottom-border highlight that glows Electric Blue on focus.

### Data Tables
- **Structure:** Borderless rows with a 1px separator (#2A2A2A). 
- **Interaction:** Row hover states use a slight tint increase (#1E1E1E).
- **i18n:** Column headers must support truncation with tooltips for long localized strings.

### Status Badges
- **Gamer-Professional Style:** Small, uppercase text with a "dot" indicator. The dot uses a glow effect (drop-shadow with the same color as the dot) to signify an "active" or "live" status.

### Modular Cards
- **Bento Style:** Cards should be self-contained units with a 1px border. Use "Card Headers" with the `label-caps` typography to categorize data clearly.

### Multi-Tenant Navigation
- **Workspace Switcher:** A prominent top-left component that allows guild leaders to switch between different gaming "realms" or guilds. Use 32x32px avatars with 4px rounding.