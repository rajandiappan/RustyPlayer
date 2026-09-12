import { convertFileSrc } from "@tauri-apps/api/core";

// Phase 0 spike — proves the asset:// thesis without any Rust commands yet.
// Hardcoded stubs stand in for Phase 1 `scan_folder`; clicking a stub sets
// <video>.src via convertFileSrc (Tauri asset protocol) instead of Electron's
// file:/// + pathToFileURL (src/renderer/renderer.js:72).
interface StubVideo {
  name: string;
  path: string;
}

const STUBS: StubVideo[] = [
  { name: "alpha.mp4", path: "C:\\Vids\\alpha.mp4" },
  { name: "beta.webm", path: "C:\\Vids\\beta.webm" },
];

function playStub(video: StubVideo): void {
  const player = document.getElementById("videoPlayer") as HTMLVideoElement;
  const info = document.getElementById("srcInfo") as HTMLElement;
  const title = document.getElementById("titlebarText") as HTMLElement;
  // convertFileSrc maps C:\Vids\alpha.mp4 → https://asset.localhost/... (NOT file://C%3A/...)
  const url = convertFileSrc(video.path);
  player.src = url;
  info.textContent = url;
  title.textContent = `${video.name} — RustyPlayer (Tauri POC)`;
  const play = player.play();
  if (play) {
    play.catch((err: unknown) => {
      // Expected until a real file exists at the stub path — proves wiring, not media.
      console.warn("spike play() (expected without real file):", err);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const gallery = document.getElementById("gallery") as HTMLElement;
  STUBS.forEach((video) => {
    const thumb = document.createElement("div");
    thumb.className = "thumbnail";
    thumb.setAttribute("role", "button");
    thumb.setAttribute("tabindex", "0");
    thumb.setAttribute("aria-label", `Play ${video.name}`);
    const name = document.createElement("div");
    name.className = "thumbnail-name";
    name.textContent = video.name;
    thumb.appendChild(name);
    thumb.addEventListener("click", () => playStub(video));
    thumb.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        playStub(video);
      }
    });
    gallery.appendChild(thumb);
  });
});
