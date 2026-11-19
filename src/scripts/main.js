import * as bootstrap from 'bootstrap';
import { initPavilion3d } from './pavilion3d.js';

document.addEventListener('DOMContentLoaded', () => {
  initPavilion3d();
  initHeaderScrollState();
  initSmoothScrollAndMobileCollapse();
  initScrollSpy();
  initReadMoreToggle();
  initServiceInquiryLinks();
  initContactFormValidation();
  initFooterYear();
});

/**
 * Adds a subtle elevation class to the sticky header once the page scrolls.
 */
function initHeaderScrollState() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const updateHeaderState = () => {
    if (window.scrollY > 16) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };

  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
}

/**
 * Smooth-scrolls anchor links with sticky-header offset compensation and
 * closes the Bootstrap 5 mobile navigation drawer on selection.
 */
function initSmoothScrollAndMobileCollapse() {
  const navCollapseEl = document.getElementById('primaryNavCollapse');
  const headerEl = document.getElementById('siteHeader');
  const collapseInstance = navCollapseEl
    ? bootstrap.Collapse.getOrCreateInstance(navCollapseEl, { toggle: false })
    : null;

  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetHash = link.getAttribute('href');
      if (!targetHash || targetHash === '#') return;

      const targetSection = document.querySelector(targetHash);
      if (!targetSection) return;

      event.preventDefault();

      const headerOffset = headerEl ? headerEl.offsetHeight : 76;
      const targetTop =
        targetSection.getBoundingClientRect().top + window.scrollY - headerOffset + 2;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });

      if (navCollapseEl && navCollapseEl.classList.contains('show') && collapseInstance) {
        collapseInstance.hide();
      }
    });
  });
}

/**
 * Tracks the currently visible page section and updates the active nav link.
 */
function initScrollSpy() {
  const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));
  if (navLinks.length === 0) return;

  const sectionIds = navLinks
    .map((link) => link.getAttribute('href'))
    .filter((href) => href && href.startsWith('#'));

  const sections = sectionIds
    .map((id) => document.querySelector(id))
    .filter((el) => el !== null);

  if (sections.length === 0) return;

  const setActiveLink = (activeId) => {
    navLinks.forEach((link) => {
      const matches = link.getAttribute('href') === `#${activeId}`;
      link.classList.toggle('active', matches);
      if (matches) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    {
      rootMargin: '-35% 0px -55% 0px',
      threshold: 0,
    }
  );

  sections.forEach((section) => observer.observe(section));
}

/**
 * Updates the About section "Read More" button label cleanly as Bootstrap
 * expands or collapses the studio methodology panel.
 */
function initReadMoreToggle() {
  const collapseEl = document.getElementById('aboutMoreContent');
  const readMoreBtn = document.getElementById('readMoreBtn');
  if (!collapseEl || !readMoreBtn) return;

  const labelSpan = readMoreBtn.querySelector('.read-more-label');
  if (!labelSpan) return;

  collapseEl.addEventListener('show.bs.collapse', () => {
    labelSpan.textContent = 'Show Less';
  });

  collapseEl.addEventListener('hide.bs.collapse', () => {
    labelSpan.textContent = 'Read More';
  });
}

/**
 * Pre-fills the inquiry message context when a user clicks "Discuss Scope"
 * on any service card and focuses the contact form cleanly.
 */
function initServiceInquiryLinks() {
  const inquiryLinks = document.querySelectorAll('[data-service-inquiry]');
  const messageInput = document.getElementById('contactMessage');
  const nameInput = document.getElementById('contactName');
  const confirmationBox = document.getElementById('inquiryConfirmation');
  const form = document.getElementById('contactForm');

  inquiryLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const serviceTitle = link.getAttribute('data-service-inquiry');
      if (!serviceTitle) return;

      if (confirmationBox && form && !confirmationBox.classList.contains('d-none')) {
        confirmationBox.classList.add('d-none');
        form.classList.remove('d-none');
      }

      if (messageInput instanceof HTMLTextAreaElement) {
        if (!messageInput.value.trim()) {
          messageInput.value = `We would like to discuss a ${serviceTitle} commission. `;
        }
      }

      window.setTimeout(() => {
        if (nameInput instanceof HTMLInputElement) {
          nameInput.focus({ preventScroll: true });
        }
      }, 450);
    });
  });
}

/**
 * Validates Name, Email, Phone, and Message fields on blur and submission,
 * rendering an accessible inline confirmation state upon valid submission.
 */
function initContactFormValidation() {
  const form = document.getElementById('contactForm');
  const confirmationBox = document.getElementById('inquiryConfirmation');
  const confirmationSummary = document.getElementById('confirmationSummary');
  const resetBtn = document.getElementById('resetInquiryBtn');

  if (!form || !confirmationBox || !confirmationSummary || !resetBtn) return;

  const nameInput = document.getElementById('contactName');
  const emailInput = document.getElementById('contactEmail');
  const phoneInput = document.getElementById('contactPhone');
  const messageInput = document.getElementById('contactMessage');

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const validateField = (field) => {
    if (!field) return false;
    const value = field.value.trim();
    let isValid = false;

    if (field === nameInput) {
      isValid = value.length >= 2;
    } else if (field === emailInput) {
      isValid = emailPattern.test(value);
    } else if (field === phoneInput) {
      const digitCount = value.replace(/\D/g, '').length;
      isValid = digitCount >= 7 && /^[+\d\s().-]+$/.test(value);
    } else if (field === messageInput) {
      isValid = value.length >= 12;
    }

    field.classList.toggle('is-invalid', !isValid);
    field.classList.toggle('is-valid', isValid);
    return isValid;
  };

  [nameInput, emailInput, phoneInput, messageInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) {
        validateField(input);
      }
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const isNameValid = validateField(nameInput);
    const isEmailValid = validateField(emailInput);
    const isPhoneValid = validateField(phoneInput);
    const isMessageValid = validateField(messageInput);

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isMessageValid) {
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid instanceof HTMLElement) {
        firstInvalid.focus();
      }
      return;
    }

    const senderName = nameInput ? nameInput.value.trim() : 'there';
    const senderEmail = emailInput ? emailInput.value.trim() : 'your email';

    confirmationSummary.textContent = `Thank you, ${senderName}. Your architectural brief has been logged, and a principal will reply to ${senderEmail} within two business days.`;

    form.classList.add('d-none');
    confirmationBox.classList.remove('d-none');
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    [nameInput, emailInput, phoneInput, messageInput].forEach((input) => {
      if (!input) return;
      input.classList.remove('is-invalid', 'is-valid');
    });

    confirmationBox.classList.add('d-none');
    form.classList.remove('d-none');
    if (nameInput) nameInput.focus();
  });
}

/**
 * Sets the copyright year dynamically to stay current.
 */
function initFooterYear() {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}
