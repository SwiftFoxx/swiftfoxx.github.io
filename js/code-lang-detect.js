document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.highlight').forEach(highlight => {
        const container = highlight.closest('[class*="language-"]');
        if (!container) return;

        const langClass = [...container.classList].find(cls =>
            cls.startsWith('language-')
        );
        if (!langClass) return;

        const lang = langClass.replace('language-', '');
        highlight.setAttribute('data-lang', lang);
    });
});