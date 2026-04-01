import { getFeaturedCelebrityData } from './celebrityUtils.js';

// Celebrity Carousel Module

/**
 * Creates a carousel section for featured celebrities
 * @returns {HTMLElement} Section element with celebrity carousel
 */
export async function createCelebrityCarousel() {
  try {
    const carouselSection = document.createElement('section');
    carouselSection.className = 'celebrity-carousel-section';

    // Add Swiper CSS
    if (!document.querySelector('#swiper-css')) {
      const swiperCSS = document.createElement('link');
      swiperCSS.id = 'swiper-css';
      swiperCSS.rel = 'stylesheet';
      swiperCSS.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
      document.head.appendChild(swiperCSS);
    }

    // Get the seasonal subtype from the DOM
    const seasonalSubtypeElement = document.querySelector('.seasonal-subtype');
    const seasonalSubtype = seasonalSubtypeElement ? seasonalSubtypeElement.textContent.trim() : '';

    // Helper to normalize season names (e.g. "Deep Winter" -> "dark winter")
    const normalizeSeason = (season) => {
      if (!season) return '';
      return season.toLowerCase().replace('deep', 'dark').trim();
    };

    const normalizedUserSeason = normalizeSeason(seasonalSubtype);

    // Get all celebrity data and filter by seasonal subtype
    const allCelebrityData = getFeaturedCelebrityData();

    if (!Array.isArray(allCelebrityData) || allCelebrityData.length === 0) {
      console.log('No celebrity data available');
      return null;
    }

    const celebrityData = allCelebrityData.filter(celeb =>
      celeb.Season && normalizeSeason(celeb.Season) === normalizedUserSeason
    );

    if (!celebrityData.length) {
      return null; // Don't show carousel if no matching celebrities
    }

    carouselSection.innerHTML = `
      <h3 class="carousel-section-title">Celebrities with Your Season</h3>
      <div class="swiper celebrity-carousel">
        <div class="swiper-wrapper">
          ${celebrityData.map(celeb => {
      const handle = celeb['Instagram URL']?.replace(/^@?https?:\/\/.+\//, '').replace(/^@/, '').trim();
      const instaUrl = handle ? `https://instagram.com/${handle}` : '#';
      const imgUrl = `/wp-content/plugins/skin-color-analyzer/img/celeb/${celeb.Image}`;

      return `
              <div class="swiper-slide">
                <div class="carousel-card">
                  <div class="carousel-image">
                    <img src="${imgUrl}" alt="${celeb.Celebrities}" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(celeb.Celebrities)}&background=random&size=128'">
                  </div>
                  <div class="carousel-info">
                    <div class="carousel-name">${celeb.Celebrities}</div>
                    <a href="${instaUrl}" target="_blank" class="carousel-instagram">@${handle}</a>
                  </div>
                </div>
              </div>
            `;
    }).join('')}
        </div>
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-pagination"></div>
      </div>
    `;

    // Load Swiper JS
    if (typeof Swiper === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
      script.onload = () => initializeSwiper(carouselSection);
      document.head.appendChild(script);
    } else {
      initializeSwiper(carouselSection);
    }

    return carouselSection;
  } catch (error) {
    console.error('Error creating celebrity carousel:', error);
    return null;
  }
}

/**
 * Initializes Swiper carousel
 * @param {HTMLElement} carouselSection - The carousel section element
 */
function initializeSwiper(carouselSection) {
  const swiper = new Swiper(carouselSection.querySelector('.swiper'), {
    slidesPerView: 'auto',
    spaceBetween: 20,
    centeredSlides: false,
    grabCursor: true,
    keyboard: {
      enabled: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    breakpoints: {
      320: {
        slidesPerView: 1.2,
        spaceBetween: 10
      },
      480: {
        slidesPerView: 2.2,
        spaceBetween: 15
      },
      768: {
        slidesPerView: 3.2,
        spaceBetween: 20
      },
      1024: {
        slidesPerView: 4.2,
        spaceBetween: 20
      }
    }
  });
}