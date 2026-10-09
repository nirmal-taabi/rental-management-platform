import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import brandLogo from '../../../assets/TrackinHubLogoWhite.png';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'Formal outfits displayed on clothing racks in a boutique',
    eyebrow: 'Luxury wedding wear',
    heading: 'Make every celebration unforgettable.',
    description: 'Discover statement lehengas and sherwanis for the moments that matter.',
  },
  {
    image: 'https://images.unsplash.com/photo-1621261027519-a71ac66d5a68?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'Curated garments displayed on racks in a bright minimalist boutique',
    eyebrow: 'Minimal premium boutique',
    heading: 'A boutique experience, made effortless.',
    description: 'Manage curated collections, bookings, and every customer detail in one place.',
  },
  {
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'A wardrobe rail displaying a collection of carefully selected garments',
    eyebrow: 'Traditional rental fashion',
    heading: 'Timeless style, ready for every occasion.',
    description: 'Bring traditional Indian fashion and modern rental operations together.',
  },
];

function AuthImagePanel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const showPreviousSlide = () => {
    setActiveSlide((currentSlide) => (currentSlide - 1 + slides.length) % slides.length);
  };
  const showNextSlide = () => {
    setActiveSlide((currentSlide) => (currentSlide + 1) % slides.length);
  };

  return (
    <aside
      aria-label="TrackinHub fashion highlights"
      aria-roledescription="carousel"
      className="relative order-2 isolate flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#30184D] px-7 py-7 text-white sm:px-10 sm:py-9 md:order-1 md:min-h-full md:px-12 md:py-11"
    >
      <img
        key={slide.image}
        src={slide.image}
        alt={slide.imageAlt}
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-black/50" />

      <div className="flex items-center gap-3">
        <img src={brandLogo} alt="TrackinHub logo" className="h-12 w-auto max-w-[220px] object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.15)]" />
      </div>

      <div key={slide.eyebrow} className="max-w-lg py-8 md:py-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{slide.eyebrow}</p>
        <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{slide.heading}</h2>
        <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">{slide.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" aria-label="Choose a fashion highlight">
          {slides.map((item, index) => (
            <button
              key={item.eyebrow}
              type="button"
              aria-label={`Show ${item.eyebrow} slide`}
              aria-pressed={activeSlide === index}
              onClick={() => setActiveSlide(index)}
              className={`h-2 rounded-full transition-all ${activeSlide === index ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous fashion highlight"
            onClick={showPreviousSlide}
            className="grid size-9 place-items-center rounded-full border border-white/40 bg-white/10 transition hover:bg-white/20"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next fashion highlight"
            onClick={showNextSlide}
            className="grid size-9 place-items-center rounded-full border border-white/40 bg-white/10 transition hover:bg-white/20"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AuthImagePanel;
