Development notes — Node/Electron compatibility

If you get a V8 fatal error like "Fatal JavaScript invalid size error" when running `npm run dev`, it's usually caused by a Node/V8 incompatibility with some dev tooling (e.g., `react-scripts`) or native modules.

Recommended quick fix:

1. Install Node 18 (LTS). If you use nvm, run:

```bash
nvm install 18
nvm use 18
```

2. Remove existing installs and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

3. Start the app:

```bash
npm run dev
```

If the crash persists, report the output of `node -v` and the exact stack trace. You can also try cleaning caches:

```bash
npm cache clean --force
```

Notes:
- This repository includes a `.nvmrc` set to `18` to make switching easier.
- We added an `engines` field in `package.json` to indicate the recommended Node range.
