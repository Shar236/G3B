function playG3BVideo(box) {
      const videoId = box.dataset.videoId;
      box.innerHTML = '';
      box.style.cursor = 'default';
      box.onclick = null;
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0&playsinline=1';
      iframe.title = 'G3B Education testimonial video';
      iframe.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; border:0;';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      box.style.position = 'relative';
      box.appendChild(iframe);
    }

    // Video slider controls
    const vTrack = document.getElementById('videoSliderTrack');
    const vDotsContainer = document.getElementById('videoSliderDots');
    const vPrevBtn = document.getElementById('videoPrevBtn');
    const vNextBtn = document.getElementById('videoNextBtn');
    const vSlides = vTrack.querySelectorAll('.video-slide');
    const vTotal = vSlides.length;
    let vCurrent = 0;

    for (let i = 0; i < vTotal; i++) {
      const btn = document.createElement('button');
      btn.className = 'video-dot' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', 'Video ' + (i + 1));
      btn.addEventListener('click', () => goToVideoSlide(i));
      vDotsContainer.appendChild(btn);
    }
    const vDots = vDotsContainer.querySelectorAll('.video-dot');

    function goToVideoSlide(index) {
      vCurrent = (index + vTotal) % vTotal;
      vTrack.style.transform = `translateX(-${vCurrent * 100}%)`;
      vDots.forEach((d, i) => d.classList.toggle('active', i === vCurrent));
    }

    vPrevBtn.addEventListener('click', () => goToVideoSlide(vCurrent - 1));
    vNextBtn.addEventListener('click', () => goToVideoSlide(vCurrent + 1));

/* Original interactive behavior from supplied index.html */
// Slider
    const track = document.getElementById('sliderTrack');
    const dotsContainer = document.getElementById('sliderDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const slides = track.querySelectorAll('.slide');
    const total = slides.length;
    let current = 0;

    // Build dots dynamically
    for (let i = 0; i < total; i++) {
      const btn = document.createElement('button');
      btn.className = 'dot' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', 'Slide ' + (i + 1));
      btn.dataset.index = i;
      btn.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(btn);
    }
    const dots = dotsContainer.querySelectorAll('.dot');

    function goToSlide(index) {
      current = (index + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    prevBtn.addEventListener('click', () => goToSlide(current - 1));
    nextBtn.addEventListener('click', () => goToSlide(current + 1));
    setInterval(() => goToSlide(current + 1), 4500);
