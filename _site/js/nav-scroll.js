const nav = document.querySelector('.navigation');

window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
})