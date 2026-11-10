// The start-up splash in index.html stays up while any LoadingScreen is mounted, so the
// loading phases (bundle, auth, grants, lazy routes) look like one continuous animation.
// One hold belongs to the app start itself and is released by index.tsx after the first render.
let holds = 1;
let timer: ReturnType<typeof setTimeout> | undefined;

const hide = () => {
  const el = document.getElementById('splash');
  if (!el) return;
  el.classList.add('app-splash--done');
  setTimeout(() => el.remove(), 400);
};

export const holdSplash = () => {
  holds++;
  clearTimeout(timer);
};

export const releaseSplash = () => {
  holds = Math.max(0, holds - 1);
  // A short grace period: the next loading phase often mounts right after the last one ends.
  if (holds === 0) timer = setTimeout(hide, 150);
};
