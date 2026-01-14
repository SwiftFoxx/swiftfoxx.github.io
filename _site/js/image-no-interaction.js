document.addEventListener('DOMContentLoaded', () => {
    // Prevent secondary click on images
    document.addEventListener("contextmenu", event => {
        const image = event.target.closest("img")
        if (!image) return

        event.preventDefault()
    })

    // Prevent dragging on images
    document.addEventListener("dragstart", event => {
        if (event.target.closest("img")) {
            event.preventDefault()
        }
    })
})