  /**
   * generate.js — Hexo 摄影图集自动生成器
   *
   * 用法:
   *   1. 将图片放到 source/gallery/ 目录下（支持子文件夹）
   *   2. 运行: node scripts/generate.js
   *   3. 会自动生成 source/gallery/index.html 瀑布流图集页面
   *
   * 支持的图片格式: jpg, jpeg, png, gif, webp, bmp, svg
   */

  const fs = require('fs');
  const path = require('path');

  // ============ 配置区 ============
  const CONFIG = {
    galleryDir: path.join(__dirname, '..', 'source', 'gallery'),
    outputFile: null,
    title: '摄影图集',
    imageExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    defaultColumns: 4,
    gap: 16,
  };

  CONFIG.outputFile = path.join(CONFIG.galleryDir, 'index.html');

  // ============ 工具函数 ============

  function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 已创建目录: ${dirPath}`);
    }
  }

  function naturalSort(a, b) {
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  /**
   * 递归扫描目录，收集所有图片文件（支持子文件夹）
   */
  function scanImages(dirPath, basePath) {
    if (!basePath) basePath = dirPath;

    if (!fs.existsSync(dirPath)) {
      console.log(`⚠️  目录不存在，正在创建: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
      console.log('📁 请将图片放入该目录后重新运行此脚本。');
      return [];
    }

    const entries = fs.readdirSync(dirPath);
    let images = [];

    for (const entry of entries) {
      if (entry.startsWith('.') || entry.startsWith('_')) continue;
      if (entry === 'index.md' || entry === 'index.html') continue;

      const fullPath = path.join(dirPath, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const subImages = scanImages(fullPath, basePath);
        images = images.concat(subImages);
      } else if (stat.isFile()) {
        const ext = path.extname(entry).toLowerCase();
        if (CONFIG.imageExts.includes(ext)) {
          const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
          images.push(relativePath);
        }
      }
    }

    images.sort(naturalSort);
    return images;
  }

  // ============ 页面生成 ============

  function generateFrontMatter() {
    const today = new Date().toISOString().split('T')[0];
    return [
      '---',
      `title: ${CONFIG.title}`,
      `date: ${today}`,
      'type: gallery',
      'layout: false',
      '---',
      '',
    ].join('\n');
  }

  function generateCSS() {
    return `
  <style>
  .gallery-wrapper {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
  }

  .gallery-masonry {
      column-count: ${CONFIG.defaultColumns};
      column-gap: ${CONFIG.gap}px;
  }

  .gallery-item {
      break-inside: avoid;
      margin-bottom: ${CONFIG.gap}px;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      background: #f0f0f0;
  }

  .gallery-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }

  .gallery-item img {
      width: 100%;
      display: block;
      transition: transform 0.5s ease;
  }

  .gallery-item:hover img {
      transform: scale(1.05);
  }

  .gallery-header {
      text-align: center;
      padding: 40px 20px 20px;
  }

  .gallery-header h1 {
      font-size: 2em;
      margin-bottom: 8px;
  }

  .gallery-header .gallery-count {
      color: #999;
      font-size: 0.95em;
  }

  .lightbox-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.92);
      z-index: 99999;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      animation: fadeIn 0.25s ease;
  }

  .lightbox-overlay.active {
      display: flex;
  }

  @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
  }

  .lightbox-img-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      max-width: 90vw;
      max-height: 75vh;
      overflow: hidden;
      cursor: grab;
  }

  .lightbox-img-wrap:active {
      cursor: grabbing;
  }

  .lightbox-img-wrap img {
      max-width: 100%;
      max-height: 75vh;
      object-fit: contain;
      transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      user-select: none;
      pointer-events: none;
  }

  .lightbox-close {
      position: absolute;
      top: 16px;
      right: 28px;
      color: #ccc;
      font-size: 42px;
      font-weight: 300;
      cursor: pointer;
      z-index: 10;
      transition: color 0.2s;
      line-height: 1;
  }

  .lightbox-close:hover { color: #fff; }

  .lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      color: #ccc;
      font-size: 36px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      width: 56px;
      height: 80px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 10;
  }

  .lightbox-nav:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
  }

  .lightbox-prev { left: 16px; }
  .lightbox-next { right: 16px; }

  .lightbox-toolbar {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 18px;
      z-index: 10;
  }

  .lightbox-toolbar button {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ddd;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
      min-width: 44px;
  }

  .lightbox-toolbar button:hover {
      background: rgba(255, 255, 255, 0.25);
      color: #fff;
  }

  .lightbox-counter {
      color: #bbb;
      font-size: 0.95em;
      min-width: 60px;
      text-align: center;
  }

  .zoom-indicator {
      color: #aaa;
      font-size: 0.85em;
      min-width: 50px;
      text-align: center;
  }

  @media (max-width: 1200px) {
      .gallery-masonry { column-count: 3; }
  }
  @media (max-width: 768px) {
      .gallery-masonry { column-count: 2; }
      .gallery-wrapper { padding: 10px; }
      .lightbox-nav { width: 40px; height: 56px; font-size: 24px; }
      .lightbox-prev { left: 6px; }
      .lightbox-next { right: 6px; }
  }
  @media (max-width: 480px) {
      .gallery-masonry { column-count: 1; }
  }
  </style>
  `;
  }

  function generateHTML(images) {
    const imageList = images.map((img, i) => `
      <div class="gallery-item" data-index="${i}">
          <img src="${img}" alt="photo ${i + 1}" loading="lazy">
      </div>`).join('');

    return `
  <div class="gallery-wrapper">

      <div class="gallery-header">
          <h1>${CONFIG.title}</h1>
          <p class="gallery-count">共 ${images.length} 张照片</p>
      </div>

      <div class="gallery-masonry" id="galleryMasonry">
          ${imageList}
      </div>

  </div>

  <div class="lightbox-overlay" id="lightbox">
      <span class="lightbox-close" id="lightboxClose">&times;</span>
      <button class="lightbox-nav lightbox-prev" id="lightboxPrev">&#10094;</button>
      <button class="lightbox-nav lightbox-next" id="lightboxNext">&#10095;</button>

      <div class="lightbox-img-wrap" id="lightboxImgWrap">
          <img src="" alt="" id="lightboxImg">
      </div>

      <div class="lightbox-toolbar">
          <button id="btnZoomOut" title="缩小">−</button>
          <span class="zoom-indicator" id="zoomLevel">100%</span>
          <button id="btnZoomIn" title="放大">+</button>
          <span class="lightbox-counter" id="lightboxCounter"></span>
          <button id="btnZoomReset" title="重置">↺</button>
      </div>
  </div>

  <script>
  (function() {
      var images = ${JSON.stringify(images)};
      var currentIndex = 0;
      var currentZoom = 1;
      var zoomStep = 0.25;
      var minZoom = 0.25;
      var maxZoom = 5;

      var lightbox = document.getElementById('lightbox');
      var lightboxImg = document.getElementById('lightboxImg');
      var lightboxImgWrap = document.getElementById('lightboxImgWrap');
      var lightboxCounter = document.getElementById('lightboxCounter');
      var zoomLevelEl = document.getElementById('zoomLevel');

      var items = document.querySelectorAll('.gallery-item');
      items.forEach(function(item) {
          item.addEventListener('click', function() {
              var idx = parseInt(this.getAttribute('data-index'), 10);
              openLightbox(idx);
          });
      });

      function openLightbox(index) {
          currentIndex = index;
          currentZoom = 1;
          applyZoom();
          lightboxImg.src = images[currentIndex];
          lightboxImg.alt = 'photo ' + (currentIndex + 1);
          lightbox.classList.add('active');
          updateCounter();
          document.body.style.overflow = 'hidden';
      }

      function closeLightbox() {
          lightbox.classList.remove('active');
          document.body.style.overflow = '';
      }

      function prevImage() {
          currentIndex = (currentIndex - 1 + images.length) % images.length;
          resetZoom();
          lightboxImg.src = images[currentIndex];
          updateCounter();
      }

      function nextImage() {
          currentIndex = (currentIndex + 1) % images.length;
          resetZoom();
          lightboxImg.src = images[currentIndex];
          updateCounter();
      }

      function zoomIn() {
          currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
          applyZoom();
          updateZoomLabel();
      }

      function zoomOut() {
          currentZoom = Math.max(currentZoom - zoomStep, minZoom);
          applyZoom();
          updateZoomLabel();
      }

      function resetZoom() {
          currentZoom = 1;
          applyZoom();
          updateZoomLabel();
      }

      function applyZoom() {
          lightboxImg.style.transform = 'scale(' + currentZoom + ')';
      }

      function updateCounter() {
          lightboxCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
      }

      function updateZoomLabel() {
          zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%';
      }

      document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
      document.getElementById('lightboxPrev').addEventListener('click', prevImage);
      document.getElementById('lightboxNext').addEventListener('click', nextImage);
      document.getElementById('btnZoomIn').addEventListener('click', zoomIn);
      document.getElementById('btnZoomOut').addEventListener('click', zoomOut);
      document.getElementById('btnZoomReset').addEventListener('click', resetZoom);

      lightbox.addEventListener('click', function(e) {
          if (e.target === lightbox) closeLightbox();
      });

      lightboxImgWrap.addEventListener('wheel', function(e) {
          e.preventDefault();
          if (e.deltaY < 0) zoomIn();
          else zoomOut();
      }, { passive: false });

      document.addEventListener('keydown', function(e) {
          if (!lightbox.classList.contains('active')) return;
          switch (e.key) {
              case 'Escape':   closeLightbox(); break;
              case 'ArrowLeft':  prevImage(); break;
              case 'ArrowRight': nextImage(); break;
              case '+': case '=': zoomIn(); break;
              case '-': zoomOut(); break;
              case '0': resetZoom(); break;
          }
      });

      (function() {
          var initialDistance = 0;
          var initialZoom = 1;

          lightboxImgWrap.addEventListener('touchstart', function(e) {
              if (e.touches.length === 2) {
                  initialDistance = getTouchDistance(e.touches);
                  initialZoom = currentZoom;
              }
          }, { passive: true });

          lightboxImgWrap.addEventListener('touchmove', function(e) {
              if (e.touches.length === 2) {
                  e.preventDefault();
                  var newDistance = getTouchDistance(e.touches);
                  var scale = newDistance / initialDistance;
                  currentZoom = Math.max(minZoom, Math.min(maxZoom, initialZoom * scale));
                  applyZoom();
                  updateZoomLabel();
              }
          }, { passive: false });

          function getTouchDistance(touches) {
              var dx = touches[0].clientX - touches[1].clientX;
              var dy = touches[0].clientY - touches[1].clientY;
              return Math.sqrt(dx * dx + dy * dy);
          }
      })();

  })();
  </script>
  `;
  }

  function generatePage(images) {
    return [
      generateFrontMatter(),
      generateCSS(),
      generateHTML(images),
    ].join('\n');
  }

  // ============ 主流程 ============

  function main() {
    console.log('🖼️  Hexo 摄影图集生成器');
    console.log('═'.repeat(40));

    ensureDir(CONFIG.galleryDir);

    const images = scanImages(CONFIG.galleryDir);

    if (images.length === 0) {
      console.log('⚠️  未找到任何图片。');
      console.log('📁 请将图片放入 source/gallery/ 目录后重新运行。');
      console.log('   支持的格式: ' + CONFIG.imageExts.join(', '));
      return;
    }

    console.log('📸 找到 ' + images.length + ' 张图片:');
    images.forEach(function(img, i) {
      console.log('   ' + (i + 1) + '. ' + img);
    });

    const pageContent = generatePage(images);
    fs.writeFileSync(CONFIG.outputFile, pageContent, 'utf-8');

    console.log('═'.repeat(40));
    console.log('✅ 图集页面已生成！');
    console.log('📄 输出文件: ' + path.relative(process.cwd(), CONFIG.outputFile));
    console.log('📸 图片数量: ' + images.length + ' 张');
    console.log('');
    console.log('💡 运行 hexo generate 或 hexo server 即可查看效果');
    console.log('   Gallery 页面地址: /gallery/');
  }

  main();