const { openFolderBtn, searchInput, folderInfo, gallery, videoPlayer, playPauseBtn, seekBar, timeDisplay, volumeBar, autoAdvanceBtn, sidebar, resizeHandle, player } = {
  openFolderBtn: document.getElementById('openFolderBtn'),
  searchInput: document.getElementById('searchInput'),
  folderInfo: document.getElementById('folderInfo'),
  gallery: document.getElementById('gallery'),
  videoPlayer: document.getElementById('videoPlayer'),
  playPauseBtn: document.getElementById('playPauseBtn'),
  seekBar: document.getElementById('seekBar'),
  timeDisplay: document.getElementById('timeDisplay'),
  volumeBar: document.getElementById('volumeBar'),
  autoAdvanceBtn: document.getElementById('autoAdvanceBtn'),
  sidebar: document.getElementById('sidebar'),
  resizeHandle: document.getElementById('resizeHandle'),
  player: document.getElementById('player')
};

let videos = [];
let currentIndex = -1;
let autoAdvance = true;
let sidebarWidth = 25;
let isResizing = false;
let currentFolderPath = '';

openFolderBtn.addEventListener('click', async () => {
  const folderPath = await window.api.openFolder();
  if (folderPath) {
    currentFolderPath = folderPath;
    videos = await window.api.scanFolder(folderPath);
    folderInfo.textContent = `${folderPath} (${videos.length} videos)`;
    renderGallery();
    if (videos.length > 0) {
      playVideo(0);
    }
  }
});

searchInput.addEventListener('input', () => {
  renderGallery(searchInput.value.toLowerCase());
});

function renderGallery(searchTerm = '') {
  gallery.innerHTML = '';
  const filtered = searchTerm
    ? videos.filter(v => 
        v.name.toLowerCase().includes(searchTerm) ||
        (v.tags && v.tags.some(t => t.toLowerCase().includes(searchTerm)))
      )
    : videos;

  filtered.forEach((video, index) => {
    const originalIndex = videos.indexOf(video);
    const thumb = document.createElement('div');
    thumb.className = 'thumbnail';
    if (originalIndex === currentIndex) thumb.classList.add('playing');
    if (originalIndex === currentIndex + 1) thumb.classList.add('next');

    const vid = document.createElement('video');
    vid.src = video.path;
    vid.preload = 'metadata';

    const info = document.createElement('div');
    info.className = 'thumbnail-info';
    
    const name = document.createElement('div');
    name.className = 'thumbnail-name';
    name.textContent = video.name;

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'thumbnail-tags';
    if (video.tags && video.tags.length > 0) {
      video.tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });
    }

    const addTagBtn = document.createElement('button');
    addTagBtn.className = 'add-tag-btn';
    addTagBtn.textContent = '+';
    addTagBtn.title = 'Add tag';
    addTagBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      videoPlayer.pause();
      playPauseBtn.textContent = 'Play';
      showTagInput(originalIndex);
    });

    info.appendChild(name);
    info.appendChild(tagsContainer);
    info.appendChild(addTagBtn);
    thumb.appendChild(vid);
    thumb.appendChild(info);

    thumb.addEventListener('click', () => playVideo(originalIndex));
    gallery.appendChild(thumb);
  });
}

async function showTagInput(videoIndex) {
  const video = videos[videoIndex];
  const tag = prompt('Enter tag for ' + video.name + ':', video.tags ? video.tags.join(', ') : '');
  if (tag !== null) {
    const tags = tag.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const success = await window.api.saveVideoTags(video.path, tags);
    if (success) {
      video.tags = tags;
      renderGallery(searchInput.value.toLowerCase());
    }
  }
}

function playVideo(index) {
  if (index < 0 || index >= videos.length) return;
  currentIndex = index;
  const video = videos[index];
  videoPlayer.src = video.path;
  videoPlayer.play().catch(() => {});
  renderGallery(searchInput.value.toLowerCase());
  playPauseBtn.textContent = 'Pause';
  
  setTimeout(() => {
    const playingThumb = gallery.querySelector('.thumbnail.playing');
    if (playingThumb) {
      playingThumb.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

videoPlayer.addEventListener('ended', () => {
  if (autoAdvance && currentIndex < videos.length - 1) {
    playVideo(currentIndex + 1);
  } else if (autoAdvance && currentIndex === videos.length - 1) {
    playVideo(0);
  }
});

videoPlayer.addEventListener('timeupdate', () => {
  if (videoPlayer.duration) {
    seekBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
    const current = formatTime(videoPlayer.currentTime);
    const total = formatTime(videoPlayer.duration);
    timeDisplay.textContent = `${current} / ${total}`;
  }
});

videoPlayer.addEventListener('loadedmetadata', () => {
  const total = formatTime(videoPlayer.duration);
  timeDisplay.textContent = `0:00 / ${total}`;
});

playPauseBtn.addEventListener('click', () => {
  if (videoPlayer.paused) {
    videoPlayer.play();
    playPauseBtn.textContent = 'Pause';
  } else {
    videoPlayer.pause();
    playPauseBtn.textContent = 'Play';
  }
});

seekBar.addEventListener('input', () => {
  if (videoPlayer.duration) {
    videoPlayer.currentTime = (seekBar.value / 100) * videoPlayer.duration;
  }
});

volumeBar.addEventListener('input', () => {
  videoPlayer.volume = volumeBar.value / 100;
});

autoAdvanceBtn.addEventListener('click', () => {
  autoAdvance = !autoAdvance;
  autoAdvanceBtn.classList.toggle('active', autoAdvance);
});

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

document.addEventListener('keydown', (e) => {
  if (e.target === searchInput) return;

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      playVideo((currentIndex - 1 + videos.length) % videos.length);
      break;
    case 'ArrowDown':
      e.preventDefault();
      playVideo((currentIndex + 1) % videos.length);
      break;
    case ' ':
      e.preventDefault();
      if (videoPlayer.paused) {
        videoPlayer.play();
        playPauseBtn.textContent = 'Pause';
      } else {
        videoPlayer.pause();
        playPauseBtn.textContent = 'Play';
      }
      break;
    case 'Escape':
      searchInput.focus();
      break;
    case 'ArrowLeft':
      videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
      break;
    case 'ArrowRight':
      videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
      break;
  }
});

resizeHandle.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newWidth = (e.clientX / window.innerWidth) * 100;
  if (newWidth >= 15 && newWidth <= 50) {
    sidebar.style.width = `${newWidth}%`;
  }
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  document.body.style.cursor = '';
});