# Brand Theme & Color Reference Guide

This reference guide documents the **new color theme** preset mapped in `:root` of [globals.css](file:///Users/samjoshua/Developer/educrm/admissions-mm-admin-main/src/app/globals.css). 

To preserve flawless compatibility with global brand theme presets (e.g., brutalist, tangerine, soft-pop) and **automatic Dark Mode**, **NEVER** use hardcoded Hex values in components. Instead, use their semantic Tailwind utility classes as mapped below.

---

## 🎨 Theme Color Mapping Matrix

| Design Hex | UI Element Context | Semantic CSS Variable | Tailwind Utility Class | OKLCH Value in Root |
| :--- | :--- | :--- | :--- | :--- |
| **`#2563ea`** | Primary buttons, active highlights | `--primary` | `bg-primary` / `text-primary` | `oklch(0.5144 0.1605 267.44)` |
| **`#1d4ed8`** | Primary buttons hover | *Tailwind default modifier* | `hover:bg-primary/90` | *Derived dynamically* |
| **`#eff6ff`** | Light callouts, alert/tip backgrounds | `--accent` | `bg-accent` | `oklch(0.97 0.015 256.4)` |
| **`#2563eb`** | Tip labels, accent text | `--accent-foreground` | `text-accent-foreground` | `oklch(0.5144 0.1605 267.44)` |
| **`#0a0a0a`** | Main titles, standard black body text | `--foreground` | `text-foreground` | `oklch(0.12 0 0)` |
| **`#64748b`** | Small labels, muted descriptions, helper text | `--muted-foreground` | `text-muted-foreground` | `oklch(0.556 0.03 256.4)` |
| **`#d4d4d4`** | Major card borders, division outlines | `--border` | `border-border` / `divide-border` | `oklch(0.86 0 0)` |
| **`#e5e5e5`** | Inputs, internal secondary dropdown dividers | `--input` | `border-input` / `divide-input` | `oklch(0.922 0 0)` |
| **`#ffffff`** | Cards, containers | `--card` | `bg-card` | `oklch(1 0 0)` |

---

## 💻 Code Reference Examples

### 1. Cards and Containers
Always outline containers using card presets to ensure perfect background/border adaptability:
* ❌ **Hardcoded:**
  ```tsx
  <div className="bg-white border border-[#d4d4d4] p-6 rounded-[8px]">...</div>
  ```
*  **Semantic (Correct):**
  ```tsx
  <div className="bg-card border border-border p-6 rounded-[8px]">...</div>
  ```

### 2. Labels and Descriptions
* ❌ **Hardcoded:**
  ```tsx
  <span className="text-[#64748b]">Description</span>
  ```
*  **Semantic (Correct):**
  ```tsx
  <span className="text-muted-foreground">Description</span>
  ```

### 3. Text Inputs & Textareas
* ❌ **Hardcoded:**
  ```tsx
  <input className="border border-[#e5e5e5] placeholder:text-[#64748b]" />
  ```
*  **Semantic (Correct):**
  ```tsx
  <input className="border border-input placeholder:text-muted-foreground" />
  ```

### 4. Primary Actions (Buttons)
* ❌ **Hardcoded:**
  ```tsx
  <button className="bg-[#2563ea] hover:bg-[#1d4ed8] text-white">Save</button>
  ```
*  **Semantic (Correct):**
  ```tsx
  <button className="bg-primary hover:bg-primary/90 text-primary-foreground">Save</button>
  ```

### 5. Highlights and Callouts (Protips)
* ❌ **Hardcoded:**
  ```tsx
  <div className="bg-[#eff6ff] text-[#2563eb]">Protip</div>
  ```
*  **Semantic (Correct):**
  ```tsx
  <div className="bg-accent text-accent-foreground">Protip</div>
  ```

---
> [!IMPORTANT]
> Adhering to these semantic color utilities keeps the codebase extremely clean, prevents "CSS pollution" from mismatched hex codes, and ensures 100% automatic compatibility with dark mode and other brand preset files.
