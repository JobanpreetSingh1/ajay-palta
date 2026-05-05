# HOPE Cycle Hero Section - Extraction Guide

This folder contains extracted HTML and CSS for the HOPE Cycle hero section from the main project. Use this in other projects as needed.

## Files Included

1. **HERO_EXTRACTION.html** - Complete standalone HTML file with embedded CSS
2. **HERO_STYLES.css** - Separate CSS file for modular use

## Quick Start

### Option 1: Use the Complete HTML File
Simply copy `HERO_EXTRACTION.html` and open it in your browser. Make sure to adjust the font paths to your environment.

### Option 2: Integrate into Your Project

1. **Link the CSS in your HTML:**
```html
<link rel="stylesheet" href="path/to/HERO_STYLES.css">
```

2. **Add the HTML markup:**
```html
<section id="home" class="hero">
    <div class="hero-background"></div>
    <div class="hero-content">
        <h1>
            HOPE Cycle
            <br>
            <i>Coolant Becomes</i> Power
        </h1>
        <p>
            HOPE Cycle recovers wasted heat from coolant and transforms it into clean, practical energy for smarter system performance.
        </p>
        <div class="hero-button-wrapper">
            <a href="/calculator" class="hero-button">Try the Calculator</a>
        </div>
    </div>
</section>
```

## Font Setup

The hero uses the **Sentient** font family. You have two options:

### Option A: Download the Original Fonts
Copy the font files from the original project:
- `Sentient-Extralight.woff`
- `Sentient-LightItalic.woff`

Place them in a `/fonts/` folder and update the CSS paths if needed.

### Option B: Use System Fonts (Fallback)
The CSS already includes a fallback font stack. The hero will still look great without Sentient fonts.

## Customization

### Colors
Edit the CSS variables in `:root`:
```css
:root {
    --background: #000000;        /* Hero background color */
    --foreground: #ffffff;         /* Text color */
    --primary: #FFC700;            /* Button color */
    --primary-foreground: #ffffff; /* Button text color */
}
```

### Button Link
Change the `href` in the button:
```html
<a href="/your-path" class="hero-button">Your Button Text</a>
```

### Hero Text
Update the heading and paragraph content directly in the HTML.

### Background Effect
The default background uses a subtle gradient. To add a WebGL particle effect like the original:

1. **Option A: Use a Canvas Element**
   - Create a canvas and add your WebGL code
   - Replace `.hero-background` div with your canvas

2. **Option B: Use a Video Background**
   ```html
   <div class="hero-background">
       <video autoplay muted loop playsinline>
           <source src="background.mp4" type="video/mp4">
       </video>
   </div>
   ```

3. **Option C: Stick with Gradient** (Current default - no extra setup needed)

## Responsive Breakpoints

The hero is fully responsive with breakpoints at:
- **Mobile** (< 640px): Font size 2.25rem for h1
- **Tablet** (≥ 640px): Font size 3rem for h1
- **Desktop** (≥ 768px): Font size 3.75rem for h1
- **Large** (≥ 1024px): Font size 4.5rem for h1

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- CSS Grid and Flexbox required
- CSS Variables (Custom Properties) required

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Color contrast meets WCAG standards
- Responsive touch targets on mobile

## Original Project Context

This hero section is from the HOPE Cycle project - a modern web application built with:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Three.js (for WebGL particles)

The extracted version removes all framework dependencies for portability.