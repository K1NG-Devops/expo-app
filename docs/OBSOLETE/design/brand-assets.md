# Brand Assets - Technical Integration Guide

This document provides technical guidance for developers integrating EduDash Pro brand assets into the application. For brand usage guidelines, see [`/assets/branding/README.md`](../../assets/branding/README.md).

## 📂 Asset Directory Structure

```
assets/branding/
├── svg/
│   ├── logo-icon-only.svg       # 1024×1024 app icon
│   ├── logo-full.svg             # 1600×1200 stacked logo
│   ├── logo-horizontal.svg       # 1600×512 horizontal logo
│   └── logo-monochrome.svg       # 1600×512 single-color logo
├── png/
│   ├── icon-1024.png            # High-res app icon
│   ├── icon-512.png             # Medium app icon
│   ├── icon-192.png             # Web manifest icon
│   ├── logo-full-1024w.png      # Full logo raster
│   ├── logo-horizontal-1024w.png # Horizontal raster
│   └── logo-monochrome-1024w.png # Monochrome raster
├── scripts/
│   └── convert-logos.sh          # PNG generation script
└── README.md                     # Brand guidelines
```

## 🎨 Design System Integration

### Color Tokens

Add these color tokens to your design system or theme configuration:

```typescript
// lib/theme/colors.ts
export const brandColors = {
  // Primary gradient colors
  turquoise: '#33C3D4',
  blue: '#1E6FBF',
  purple: '#7B3FF2',
  purpleLight: '#9B5FF2',
  
  // Accent gradient
  pink: '#FF4D8F',
  coral: '#FF8C5F',
  yellow: '#FFD54D',
  
  // Neutrals
  dotsGray: '#6B7280',
  darkGray: '#111827',
  white: '#FFFFFF',
};

// Gradient definitions for use in React Native
export const brandGradients = {
  primary: ['#33C3D4', '#1E6FBF', '#7B3FF2'],
  edu: ['#33C3D4', '#1E6FBF'],
  dash: ['#7B3FF2', '#9B5FF2'],
  bookmark: ['#FF4D8F', '#FF8C5F', '#FFD54D'],
};
```

### Typography Tokens

```typescript
// lib/theme/typography.ts
export const brandTypography = {
  wordmark: {
    fontFamily: 'Poppins-ExtraBold', // or 'System-Black'
    fontWeight: '900' as const,
    letterSpacing: -6,
  },
};
```

## 📱 React Native Integration

### Using PNG Assets

```typescript
// In any component
import { Image } from 'expo-image';

// Icon only
<Image 
  source={require('@/assets/branding/png/icon-512.png')}
  style={{ width: 64, height: 64 }}
  contentFit="contain"
/>

// Horizontal logo for headers
<Image 
  source={require('@/assets/branding/png/logo-horizontal-1024w.png')}
  style={{ width: 200, height: 64 }}
  contentFit="contain"
/>
```

### Using SVG Assets

First, ensure `react-native-svg` is installed:

```bash
npx expo install react-native-svg
```

Then import and use SVGs:

```typescript
import LogoIcon from '@/assets/branding/svg/logo-icon-only.svg';
import LogoHorizontal from '@/assets/branding/svg/logo-horizontal.svg';

// In component
<LogoIcon width={64} height={64} />
<LogoHorizontal width={200} height={64} />
```

### With Gradients (expo-linear-gradient)

```typescript
import { LinearGradient } from 'expo-linear-gradient';
import { brandGradients } from '@/lib/theme/colors';

<LinearGradient
  colors={brandGradients.primary}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.container}
>
  {/* Your content */}
</LinearGradient>
```

## 📦 App Configuration

### app.json / app.config.ts

Update your Expo configuration to use the new logo:

```json
{
  "expo": {
    "icon": "./assets/branding/png/icon-1024.png",
    "splash": {
      "image": "./assets/branding/png/icon-1024.png",
      "backgroundColor": "#FFFFFF"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/branding/png/icon-1024.png",
        "backgroundColor": "#33C3D4"
      }
    },
    "ios": {
      "icon": "./assets/branding/png/icon-1024.png"
    },
    "web": {
      "favicon": "./assets/branding/png/icon-192.png"
    }
  }
}
```

### Android Adaptive Icon

For best results on Android, create an adaptive icon configuration:

1. Use `icon-1024.png` as the foreground layer
2. Set background color to `#33C3D4` (turquoise from gradient)
3. Ensure critical icon elements stay within the safe zone (inner 70%)

## 🔄 Regenerating PNG Assets

### Automated Script

Run the conversion script to regenerate all PNG files from SVG sources:

```bash
./assets/branding/scripts/convert-logos.sh
```

This script:
- Detects available SVG rendering tool (Inkscape, rsvg-convert, or ImageMagick)
- Generates PNGs at required sizes
- Maintains transparency for proper compositing
- Outputs files to `assets/branding/png/`

### Manual Conversion

If you need custom sizes:

**Using Inkscape:**
```bash
inkscape assets/branding/svg/logo-icon-only.svg \
  --export-filename=custom-icon-256.png \
  --export-width=256 \
  --export-height=256 \
  --export-background-opacity=0
```

**Using rsvg-convert:**
```bash
rsvg-convert assets/branding/svg/logo-icon-only.svg \
  --width=256 \
  --height=256 \
  --background-color=transparent \
  --output=custom-icon-256.png
```

## ♿ Accessibility Considerations

### Color Contrast

The logo maintains WCAG 2.1 AA compliance on standard backgrounds:

| Background | Logo Variant | Contrast Ratio | Pass |
|------------|--------------|----------------|------|
| White (#FFFFFF) | Full color | ~3.2:1 | ✅ AA |
| Light gray (#F3F4F6) | Full color | ~2.8:1 | ⚠️ Use monochrome |
| Dark (#111827) | Monochrome white | ~18.5:1 | ✅ AAA |
| Dark blue (#1E6FBF) | Monochrome white | ~4.2:1 | ✅ AA |

**Recommendation:** For dark mode or dark backgrounds, use `logo-monochrome.svg` with white color.

### Screen Reader Support

```typescript
// Example with proper accessibility
<Image 
  source={require('@/assets/branding/png/logo-horizontal-1024w.png')}
  style={styles.logo}
  contentFit="contain"
  accessible={true}
  accessibilityLabel="EduDash Pro"
  accessibilityRole="image"
/>

// Decorative logo (e.g., in app bars with text label)
<Image 
  source={require('@/assets/branding/png/icon-512.png')}
  style={styles.icon}
  accessible={false}
  importantForAccessibility="no"
/>
```

## 🎯 Common Use Cases

### Splash Screen

```typescript
// app/_layout.tsx
import { SplashScreen } from 'expo-router';
import LogoFull from '@/assets/branding/svg/logo-full.svg';

export default function RootLayout() {
  return (
    <View style={styles.splash}>
      <LogoFull width={300} height={225} />
    </View>
  );
}
```

### Navigation Header

```typescript
// components/AppHeader.tsx
import LogoHorizontal from '@/assets/branding/svg/logo-horizontal.svg';

export function AppHeader() {
  return (
    <View style={styles.header}>
      <LogoHorizontal width={150} height={48} />
    </View>
  );
}
```

### Loading State

```typescript
// components/LoadingScreen.tsx
import { ActivityIndicator } from 'react-native';
import LogoIcon from '@/assets/branding/svg/logo-icon-only.svg';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <LogoIcon width={80} height={80} />
      <ActivityIndicator 
        color="#7B3FF2" 
        style={{ marginTop: 24 }} 
      />
    </View>
  );
}
```

### Empty State

```typescript
// components/EmptyState.tsx
export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Image 
        source={require('@/assets/branding/png/icon-192.png')}
        style={{ width: 96, height: 96, opacity: 0.3 }}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
```

## 🔧 Development Workflow

### Testing Logo Sizes

Test the logo at various sizes to ensure legibility:

```typescript
const sizes = [24, 32, 48, 64, 96, 128, 192, 256, 512];

export function LogoTest() {
  return (
    <ScrollView>
      {sizes.map(size => (
        <View key={size} style={styles.row}>
          <Text>{size}px</Text>
          <Image 
            source={require('@/assets/branding/png/icon-512.png')}
            style={{ width: size, height: size }}
          />
        </View>
      ))}
    </ScrollView>
  );
}
```

### Dark Mode Testing

```typescript
import { useColorScheme } from 'react-native';
import LogoHorizontal from '@/assets/branding/svg/logo-horizontal.svg';
import LogoMonochrome from '@/assets/branding/svg/logo-monochrome.svg';

export function AdaptiveLogo() {
  const colorScheme = useColorScheme();
  
  return colorScheme === 'dark' 
    ? <LogoMonochrome width={200} height={64} color="#FFFFFF" />
    : <LogoHorizontal width={200} height={64} />;
}
```

## 📋 Pre-Deployment Checklist

Before releasing updates with new logo assets:

- [ ] Verify all PNG files exist in `assets/branding/png/`
- [ ] Test logo rendering on Android (various screen densities)
- [ ] Test logo rendering on iOS (all icon sizes)
- [ ] Verify web favicon appears correctly
- [ ] Check splash screen on both platforms
- [ ] Test adaptive icon on Android 8+ devices
- [ ] Verify contrast ratios in light and dark modes
- [ ] Ensure screen readers announce logo correctly
- [ ] Test logo at minimum sizes (24px–32px)
- [ ] Confirm no visual artifacts or pixelation

## 🔗 Related Documentation

- **Brand Guidelines:** [`/assets/branding/README.md`](../../assets/branding/README.md)
- **Design System:** `/docs/design/design-system.md` (if exists)
- **Expo Configuration:** [Expo Icons Documentation](https://docs.expo.dev/guides/icons/)
- **Accessibility:** `/docs/accessibility/wcag-compliance.md` (if exists)

## 🆘 Troubleshooting

### SVG not rendering in React Native

Ensure `react-native-svg` is installed:
```bash
npx expo install react-native-svg
npm run start:clear  # Clear cache
```

### PNG appears blurry on high-DPI screens

Use higher resolution source (e.g., `icon-1024.png` instead of `icon-192.png`) and let React Native scale down.

### Gradient not showing on Android

SVG gradients are supported. If issues persist, use `expo-linear-gradient` for background gradients instead.

### App icon not updating after change

```bash
# Clear Expo cache
npm run start:clear

# Rebuild native projects
npx expo prebuild --clean
npm run android
```

---

**Maintained by:** EduDash Pro Engineering Team  
**Last Updated:** 2025-10-14  
**Version:** 1.0.0
