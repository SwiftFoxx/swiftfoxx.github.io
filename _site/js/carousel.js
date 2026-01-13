document.querySelectorAll('.carousel-wrapper').forEach(wrapper => {
    const carousel = wrapper.querySelector('.carousel')
    const expandBtn = wrapper.querySelector('.carousel-expand')
    const overlay = wrapper.querySelector('.carousel-overlay')
    const overlayImg = overlay.querySelector('img')
    const markers = [...wrapper.querySelectorAll('.carousel-markers button')]

    function currentImage() {
        const index = Math.round(
            carousel.scrollLeft / carousel.clientWidth
        )
        return carousel.children[index]?.querySelector('img')
    }

    function updateMarkers() {
        const index = Math.round(
            carousel.scrollLeft / carousel.clientWidth
        )
        markers.forEach((m, i) =>
            m.classList.toggle('active', i === index)
        )
    }

    expandBtn.addEventListener('click', () => {
        const img = currentImage()
        if (!img) return

        overlayImg.src = img.src
        overlay.classList.add('open')
        overlay.setAttribute('aria-hidden', 'false')
    })

    overlay.addEventListener('click', () => {
        overlay.classList.remove('open')
        overlay.setAttribute('aria-hidden', 'true')
        overlayImg.src = ''
    })

    markers.forEach((marker, i) => {
        marker.addEventListener('click', () => {
            carousel.scrollTo({
                left: i * carousel.clientWidth,
                behavior: 'smooth'
            })
        })
    })

    carousel.addEventListener('scroll', updateMarkers)
    window.addEventListener('resize', updateMarkers)

    updateMarkers()
})