# Icon Components Library

This folder contains all reusable SVG icon components for the Safety Mitra app.

## Folder Structure

```
src/components/icons/
├── index.js              # Central export file
├── CompetitionIcon.jsx   # Star/trophy icon (blue)
├── TrainingIcon.jsx      # Graduation cap icon (green)
├── SafetyIcon.jsx        # Shield with person (orange)
├── CommunityIcon.jsx     # Group of people (indigo)
├── EmergencyIcon.jsx     # Alert triangle (red)
└── AdminIcon.jsx         # Settings gear (slate)
```

## Usage

### Import a Single Icon

```jsx
import { CompetitionIcon } from './icons';

<CompetitionIcon className="w-6 h-6 text-blue-600" />
```

### Import Multiple Icons

```jsx
import {
    CompetitionIcon,
    TrainingIcon,
    SafetyIcon
} from './icons';

<CompetitionIcon className="w-8 h-8 text-blue-500" />
<TrainingIcon className="w-8 h-8 text-green-500" />
```

## How to Add a New Custom Icon

### Step 1: Create the Icon Component File

Create a new file in `src/components/icons/`, e.g., `MyCustomIcon.jsx`:

```jsx
export const MyCustomIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="YOUR_SVG_PATH_DATA_HERE" />
    </svg>
);
```

### Step 2: Add Export to index.js

Open `src/components/icons/index.js` and add:

```jsx
export { MyCustomIcon } from './MyCustomIcon';
```

### Step 3: Use Your Icon

```jsx
import { MyCustomIcon } from './icons';

<MyCustomIcon className="w-6 h-6 text-purple-600" />
```

## Icon Design Guidelines

✅ **DO:**
- Use `fill="currentColor"` for color theming
- Use `viewBox="0 0 24 24"` for standard scaling
- Accept `className` prop with default value
- Keep SVG paths simple and optimized

❌ **DON'T:**
- Hardcode colors in the SVG
- Use external SVG files
- Add fixed width/height attributes
- Include unnecessary SVG elements

## Color Theming

Icons automatically inherit color from the `className` prop using `currentColor`:

```jsx
// Light mode: blue-600, Dark mode: blue-400
<CompetitionIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
```

## Where to Find SVG Icons

- [Material Design Icons](https://pictogrammers.com/library/mdi/)
- [Heroicons](https://heroicons.com/)
- [Feather Icons](https://feathericons.com/)
- [Lucide Icons](https://lucide.dev/)

## Example: Converting External SVG

If you find an SVG icon online:

1. Copy the `<path>` data
2. Create a new icon component
3. Paste the path data
4. Add to index.js

```jsx
// Example from Material Design Icons
export const NewIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" />
    </svg>
);
```

## Benefits of This Approach

- ✨ **Scalable** - Vector graphics look perfect at any size
- 🎨 **Theme-aware** - Auto-adjusts to light/dark mode
- ⚡ **Performant** - No HTTP requests for icons
- 🔄 **Reusable** - Use the same icon anywhere
- 📦 **Maintainable** - Easy to update or swap icons
