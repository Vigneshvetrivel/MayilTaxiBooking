// floating-icons.js

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleIcons');
    const iconsWrapper = document.getElementById('iconsWrapper');

    // Function to open the menu
    function openMenu() {
        iconsWrapper.classList.add('active');
        toggleButton.textContent = '×';
    }

    // Function to close the menu
    function closeMenu() {
        iconsWrapper.classList.remove('active');
        toggleButton.textContent = '☰';
    }

    // Open the menu automatically when the page loads
    openMenu();

    // Close it after 2 seconds
    setTimeout(closeMenu, 2000);

    // Toggle button click event - manual open/close functionality
    toggleButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent document click from triggering

        if (iconsWrapper.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Close the menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.floating-icons-container')) {
            closeMenu();
        }
    });
});
