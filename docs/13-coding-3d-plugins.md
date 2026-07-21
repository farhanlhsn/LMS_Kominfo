# Coding and 3D Plugin Requirements

## Code Runner Plugin

Plugin key: `plugin.code_runner`

Frontend:

- Monaco Editor
- instructions panel
- code editor panel
- output/console panel
- preview panel if relevant
- autosave
- reset code
- submit
- hints
- AI coding assistant optional

Backend:

- CodeExercise
- CodeSubmission
- queue: code-execution
- isolated runner worker
- visible and hidden test cases
- time limit
- memory limit
- output size limit

Security:

- Never execute code in API process
- Use Docker sandbox, Firecracker, Judge0, or Piston
- Disable network by default
- Enforce CPU/memory/time limits
- Clean sandbox after execution

## 3D Viewer Plugin

Plugin key: `plugin.3d_viewer`

Frontend:

- Three.js / React Three Fiber / Babylon.js
- GLB/GLTF viewer
- Orbit controls
- hotspots
- annotations
- fullscreen
- pop-out preview

Backend:

- 3D file upload
- metadata extraction placeholder
- signed file URL
- interaction tracking

Completion rules:

- viewed
- minimum time spent
- all hotspots viewed

Analytics:

- THREE_D_MODEL_OPENED
- THREE_D_HOTSPOT_VIEWED
- THREE_D_ACTIVITY_COMPLETED
