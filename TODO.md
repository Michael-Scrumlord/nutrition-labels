ou have direct access to this repository and the current UI layout shown in the attached screenshot. 

### THE GOAL
We need to overhaul the visual language of the entire Recipe Builder interface to fix a massive usability issue: **users cannot tell what is clickable, what is editable, and what is static text.** While the Neo-Brutalist, high-contrast minimalist style looks incredible, we have sacrificed crucial **Visual Signifiers** (Don Norman, *The Design of Everyday Things*). Text inputs (like variable labels and suffixes) are completely transparent and borderless, making them look identical to static labels. Buttons lack clean affordance cues.

Without compromising our clean aesthetic, establish an explicit, un-guessable visual vocabulary across the application.

### THE VISUAL VOCABULARY BLUEPRINT
Implement the following interaction paradigms throughout the recipe components (`StepEditor.tsx`, `StepRow.tsx`, `VariablesPanel.tsx`, etc.):

1. **The "Editable" Signifier (Inputs & Fields)**
   - Never let an editable text field look like static prose. 
   - Give inline editable text fields a distinct signifier: a subtle, dashed bottom border (`border-b border-dashed`), a very faint background tint, or a contextual edit icon indicator.
   - On focus/hover, smoothly elevate the field using our crisp border styles to show active state configuration.

2. **The "Clickable" Signifier (Buttons, Toggles, Actions)**
   - Differentiate static section titles from actionable toggles (like the open/close chevron on the Variables panel).
   - Interactive triggers must have clear hover states that alter the cursor (`cursor-pointer`) and provide immediate visual elevation change (e.g., shifting a block-shadow, shifting scale slightly, or changing background opacity via `color-mix`).
   - Use our utility classes safely to ensure danger actions (like the `×` delete button) safely preview their intent on hover.

3. **The "Static" Hierarchy (Labels & Data)**
   - Pure informational text, step numbers, and calculated outputs should remain structurally locked. They must never react to mouse hovers or look input-like, giving the brain an immediate map of what is fixed data.

### YOUR TASK
Refactor the visual presentation layer across the recipe creation workspace components to fully implement this signifier hierarchy. Ensure that a user looking at the screen can categorize every single element's interactivity *within 500 milliseconds, purely by design alone*.

Provide the updated designs including up to three variations and a 2-sentence breakdown of how the new layout clearly signals its affordances to the user.