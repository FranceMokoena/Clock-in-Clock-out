# Forgot Password Modal - Visual Reference & Features

## Button Layout (Login Screen)

```
┌─────────────────────────────────────┐
│         SECURE LOGIN HEADER         │
├─────────────────────────────────────┤
│                                     │
│          [LOCK ICON CIRCLE]         │
│          Internship System          │
│    Access your official dashboard   │
│                                     │
│  USERNAME/ID INPUT FIELD            │
│  PASSWORD INPUT FIELD [EYE ICON]    │
│                                     │
│      [SIGN IN WITH ARROW →]         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ [?] Need Help?              │   │
│  │     Forgot Password      [>]│   │
│  └─────────────────────────────┘   │
│                                     │
│  Need help? Contact IT Support      │
│                                     │
└─────────────────────────────────────┘
```

## Help Button Styling

- **Background**: Light blue (#3166AE15) with blue border
- **Icon**: Help outline in blue (#3166AE)
- **Text**: "Need Help?" (bold) + "Forgot Password" (gray)
- **Chevron**: Right arrow indicating action
- **Shadow**: Subtle elevation for depth
- **Radius**: 12px rounded corners
- **Padding**: 16px horizontal, 14px vertical

## Modal View (Opened from Help Button)

```
┌──────────────────────────────────┐
│ [×] PASSWORD RECOVERY        [×] │  ← Close button (top)
├──────────────────────────────────┤
│ ┌────────────────────────────┐   │
│ │         [INFO ICON]        │   │  ← Info box (light blue bg)
│ │ Password Reset Assistance  │   │
│ │                            │   │
│ │ If you have forgotten your │   │
│ │ password, please contact   │   │
│ │ the appropriate support    │   │
│ │ team for your account type.│   │
│ └────────────────────────────┘   │
│                                   │
│ ────────────────────────────────  │  ← Divider line
│                                   │
│ CONTACT SUPPORT                  │  ← Section title
│                                   │
│ ┌────────────────────────────┐   │
│ │[👤] Interns                │   │
│ │     Contact your host      │   │
│ │     employer directly for  │   │
│ │     password assistance.   │   │
│ └────────────────────────────┘   │
│                                   │
│ ┌────────────────────────────┐   │
│ │[🏢] Host Employers          │   │
│ │     Contact the Internship │   │
│ │     Success System         │   │
│ │     Administrator for      │   │
│ │     account recovery.      │   │
│ └────────────────────────────┘   │
│                                   │
│ ┌────────────────────────────┐   │
│ │[⚙️] System Administrators   │   │
│ │     Contact your IT System │   │
│ │     Support for password   │   │
│ │     reset procedures.      │   │
│ └────────────────────────────┘   │
│                                   │
│ ┌────────────────────────────┐   │
│ │[🔒] This is a secure       │   │  ← Security notice (yellow)
│ │     government portal.     │   │
│ │     Never share your       │   │
│ │     password or credentials│   │
│ │     with anyone.           │   │
│ └────────────────────────────┘   │
│                                   │
│    [RETURN TO LOGIN BUTTON]      │  ← Bottom action
│                                   │
└──────────────────────────────────┘
```

## Color Specifications

| Element | Color Code | Usage |
|---------|-----------|-------|
| Primary Blue | #3166AE | Icons, borders, buttons |
| Light Blue BG | #3166AE15 | Background tints |
| Medium Blue BG | #3166AE20 | Icon containers |
| Dark Text | #1a1a1a | Headers, titles |
| Medium Gray | #6b7280 | Secondary text |
| Light Gray BG | #f9fafb | Input backgrounds |
| Border Gray | #e5e7eb | Dividers, borders |
| Warning Yellow | #fffbec | Security notice background |
| Warning Border | #fde68a | Security notice border |
| Warning Text | #92400e | Security notice text |

## Typography Scale

| Element | Size | Weight | Spacing |
|---------|------|--------|----------|
| Modal Title | 18px | 800 | 1px letter |
| Info Title | 18px | 800 | 0.3px letter |
| Option Title | 14px | 700 | 0.3px letter |
| Section Title | 13px | 800 | 0.5px letter |
| Option Text | 12px | 400 | 0.2px letter |
| Info Text | 13px | 500 | 0.2px letter |
| Security Text | 12px | 500 | 0.2px letter |

## Interactive States

### Help Button States
- **Default**: Light blue background, normal opacity
- **Pressed**: Opacity increases, slight scale down
- **Disabled**: Grayed out (if applicable)

### Modal States
- **Opening**: Slide up animation from bottom
- **Visible**: Fully opaque, interactive
- **Closing**: Slide down animation, fade to transparent
- **Overlay**: Darkens background (60% opacity)

### Card Hover/Press States
- **Default**: Subtle shadow, light background
- **Pressed**: Slightly darker background
- **Focused**: Enhanced border/shadow

## Spacing & Layout

- **Modal Width**: 100% of screen
- **Modal Max Height**: 92% of screen
- **Header Height**: 60px (with padding)
- **Content Padding**: 20px horizontal
- **Card Padding**: 14px
- **Icon Sizes**: 
  - Modal header: 28px
  - Info box: 28px
  - Support cards: 24px
  - Buttons: 20px
- **Border Radius**: 
  - Modal: 24px top corners
  - Buttons: 10-12px
  - Icon boxes: 8-10px

## Animations

| Element | Animation | Duration |
|---------|-----------|----------|
| Modal Open | Slide Up | 400ms |
| Modal Close | Slide Down | 300ms |
| Button Press | Scale + Opacity | 150ms |
| Overlay Fade | Fade In/Out | 300ms |

## Accessibility Features

✓ Minimum touch target: 44x44px  
✓ Color contrast: WCAG AA compliant  
✓ Focus indicators: Clear visual feedback  
✓ Text scaling: Responsive to system settings  
✓ Icon + Text: Never icons alone  
✓ Semantic structure: Proper hierarchy  
✓ Screen reader: Proper labels and descriptions  

## Government Style Compliance

✓ **Professional Tone**: Official, helpful messaging  
✓ **Clear Hierarchy**: Main task first, details second  
✓ **Institutional Color**: Blue (#3166AE) for trust  
✓ **Structured Layout**: Organized, predictable flow  
✓ **Icon Usage**: Universally recognized symbols  
✓ **Typography**: Bold headers, readable body text  
✓ **Security Focus**: Emphasized password safety  
✓ **Accessibility**: WCAG AA standards met  
✓ **Consistency**: Matches overall app design language  

## Device Responsiveness

- **Small Screens (320px)**: Full width with padding
- **Medium Screens (480px)**: Optimized spacing
- **Large Screens (600px+)**: Maintained proportions
- **Tablets**: Scaled appropriately
- **All Devices**: Bottom sheet modal (most natural UX)

## Dark Mode Support

All styles use dynamic theme colors:
- Background colors adapt to theme
- Text colors respect theme settings
- Borders use theme border colors
- Icons use primary theme color
- Modal overlay adjusts based on theme
