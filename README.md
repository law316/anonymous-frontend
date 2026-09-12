# Anonymous Frontend

React + TypeScript + Vite frontend for the Anonymous ephemeral messenger.

## Run
```bash
npm install
cp .env.example .env
npm run dev
```

## Privacy UX
The interface disables normal copy/cut/context-menu behavior inside message content and serves images as one-time authenticated blobs. This is friction, not DRM: browsers and operating systems cannot guarantee blocking screenshots, screen recording, DevTools extraction, or external cameras.
