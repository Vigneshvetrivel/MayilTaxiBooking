// Global variables
let autocompletePickup;
let autocompleteDrop;
let directionsService;
let map;
let distanceInKm = 0;
let calculatedFare = false;

// Set min date for pickup to today
const today = new Date();
const formattedDate = today.toISOString().slice(0, 16);
document.getElementById('pickupDate').min = formattedDate;

// Set default value to 1 hour from now
const oneHourLater = new Date(today.getTime() + (60 * 60 * 1000));
document.getElementById('pickupDate').value = oneHourLater.toISOString().slice(0, 16);

// Initialize Google Maps services
function initMap() {
    try {
        // Create map instance (required for the API even if not displayed)
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: 13.0827, lng: 80.2707}, // Default to Chennai
            zoom: 2,
            disableDefaultUI: true
        });

        // Initialize the Google Places Autocomplete
        autocompletePickup = new google.maps.places.Autocomplete(
            document.getElementById('pickup'),
            {types: ['geocode']}
        );

        autocompleteDrop = new google.maps.places.Autocomplete(
            document.getElementById('dropoff'),
            {types: ['geocode']}
        );

        // Initialize the Directions Service
        directionsService = new google.maps.DirectionsService();

        // Add event listeners
        document.getElementById('calculate').addEventListener('click', calculateFare);
        document.getElementById('bookingForm').addEventListener('submit', submitBooking);

        // Add event listeners to vehicle options
        const vehicleOptions = document.querySelectorAll('.vehicle-option');
        vehicleOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options
                vehicleOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                this.classList.add('selected');
                // Check the radio button
                const radio = this.querySelector('input[type="radio"]');
                radio.checked = true;

                // Recalculate fare if distance is available
                if (distanceInKm > 0) {
                    calculateFare();
                }
            });
        });

        // Add event listeners to trip type options
        const tripOptions = document.querySelectorAll('.trip-option');
        tripOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options
                tripOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                this.classList.add('selected');
                // Check the radio button
                const tripType = this.getAttribute('data-value');
                document.querySelector(`input[value="${tripType}"]`).checked = true;

                // Recalculate fare if distance is available
                if (distanceInKm > 0) {
                    calculateFare();
                }
            });
        });

        // Verify critical elements exist
        console.log('Verifying HTML elements...');
        verifyElements();

    } catch (error) {
        console.error('Error initializing map:', error);
        showErrorMessage('Failed to initialize map services. Please refresh the page.');
    }
}

// Helper function to verify elements exist
function verifyElements() {
    const elements = [
        'successMessage',
        'errorMessage',
        'bookingReference',
        'submitButton',
        'bookingForm'
    ];

    let allFound = true;

    elements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Element with ID '${id}' not found in the document!`);
            allFound = false;
        } else {
            console.log(`Element with ID '${id}' found.`);
        }
    });

    return allFound;
}

// Helper function to show success message
function showSuccessMessage(bookingRef) {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
        const bookingRefElement = document.getElementById('bookingReference');
        if (bookingRefElement) {
            bookingRefElement.textContent = bookingRef;
        }
        successElement.style.display = 'block';

        // Hide error message if it's displayed
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.display = 'none';
        }

        // Scroll to success message
        successElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        console.error('Success message element not found!');
        alert('Booking submitted successfully! Reference: ' + bookingRef);
    }
}

// Helper function to show error message
function showErrorMessage(message) {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';

        // Hide success message if it's displayed
        const successElement = document.getElementById('successMessage');
        if (successElement) {
            successElement.style.display = 'none';
        }

        // Only scroll if error element exists
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        console.error('Error message element not found!');
        alert('Error: ' + message);
    }

    setTimeout(() => {
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }, 5000);
}

// Clear all form errors
function clearAllErrors() {
    const errorElements = document.querySelectorAll('.invalid-feedback');
    const inputElements = document.querySelectorAll('input, textarea, select');

    errorElements.forEach(element => {
        element.textContent = '';
    });

    inputElements.forEach(element => {
        element.classList.remove('is-invalid');
    });
}

// Reset form completely
function resetForm() {
    document.getElementById('bookingForm').reset();
    document.getElementById('results').style.display = 'none';
    calculatedFare = false;
    clearAllErrors();

    // Reset trip type selection
    document.querySelectorAll('.trip-type .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('label[for="drop"]').classList.add('active');
    document.getElementById('drop').checked = true;

    // Reset vehicle selection
    const vehicleOptions = document.querySelectorAll('.vehicle-option');
    vehicleOptions.forEach(opt => opt.classList.remove('selected'));
    vehicleOptions[0].classList.add('selected');
    document.getElementById('hatchback').checked = true;

    // Set default pickup time again
    const newTime = new Date(Date.now() + (60 * 60 * 1000));
    document.getElementById('pickupDate').value = newTime.toISOString().slice(0, 16);
}

// Improved validation function
function validateForm() {
    let isValid = true;
    const required = ['name', 'email', 'phone', 'pickup', 'dropoff', 'pickupDate'];
    const errors = {};

    // Clear all previous errors
    clearAllErrors();

    // Check required fields
    required.forEach(field => {
        const input = document.getElementById(field);
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            const errorElement = document.getElementById(field + 'Error');
            if (errorElement) errorElement.textContent = 'This field is required';
            isValid = false;
            errors[field] = 'required';
        }
    });

    // Validate email format
    const email = document.getElementById('email');
    if (email.value && !validateEmail(email.value)) {
        email.classList.add('is-invalid');
        document.getElementById('emailError').textContent = 'Please enter a valid email address';
        isValid = false;
        errors.email = 'invalid';
    }

    // Validate phone number
    const phone = document.getElementById('phone');
    if (phone.value && !validatePhone(phone.value)) {
        phone.classList.add('is-invalid');
        document.getElementById('phoneError').textContent = 'Please enter a valid phone number';
        isValid = false;
        errors.phone = 'invalid';
    }

    // Check if fare was calculated
    if (!calculatedFare) {
        showErrorMessage('Please calculate the fare before submitting');
        isValid = false;
        errors.fare = 'not_calculated';
    }

    return { isValid, errors };
}

// Email validation helper
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Phone validation helper
function validatePhone(phone) {
    // Basic validation - adjust as needed
    return phone.length >= 10;
}

// Calculate fare based on trip type, vehicle type and distance
function calculateFare() {
    const pickup = document.getElementById('pickup').value;
    const dropoff = document.getElementById('dropoff').value;

    // Clear any previous errors
    clearAllErrors();

    // Validate inputs
    if (!pickup) {
        document.getElementById('pickup').classList.add('is-invalid');
        document.getElementById('pickupError').textContent = 'Pickup location is required';
        return;
    }

    if (!dropoff) {
        document.getElementById('dropoff').classList.add('is-invalid');
        document.getElementById('dropoffError').textContent = 'Drop location is required';
        return;
    }

    // Show loading state on the calculate button
    const calculateButton = document.getElementById('calculate');
    const originalButtonText = calculateButton.textContent;
    calculateButton.disabled = true;
    calculateButton.innerHTML = '<span class="loading-spinner"></span>Calculating...';

    const request = {
        origin: pickup,
        destination: dropoff,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, function(response, status) {
        // Reset button state
        calculateButton.disabled = false;
        calculateButton.textContent = originalButtonText;

        if (status === 'OK') {
            // Get the route
            const route = response.routes[0];

            // Extract distance information
            distanceInKm = route.legs[0].distance.value / 1000;
            const durationMin = route.legs[0].duration.value / 60;

            // Get selected vehicle type and trip type
            const vehicleType = document.querySelector('input[name="vehicleType"]:checked').value;
            const tripType = document.querySelector('input[name="tripType"]:checked').value;

            // Calculate fare based on vehicle type
            let ratePerKm = 0;
            switch(vehicleType) {
                case 'hatchback':
                    ratePerKm = 13;
                    break;
                case 'sedan':
                    ratePerKm = 14;
                    break;
                case 'ertiga':
                    ratePerKm = 18;
                    break;
                case 'crysta':
                    ratePerKm = 20;
                    break;
            }

            let estimatedFare = 0;

            // Adjust fare based on trip type
            switch(tripType) {
                case 'drop':
                    estimatedFare = distanceInKm * ratePerKm;
                    break;
                case 'round':
                    estimatedFare = distanceInKm * 2 * ratePerKm;
                    break;
            }

            // Display results
            document.getElementById('distanceResult').textContent = distanceInKm.toFixed(2) + ' km';
            document.getElementById('durationResult').textContent = Math.round(durationMin) + ' minutes';
            document.getElementById('fareEstimation').textContent = '₹' + Math.round(estimatedFare);
            document.getElementById('results').style.display = 'block';

            // Store for form submission
            document.getElementById('distanceKm').value = distanceInKm.toFixed(2);
            document.getElementById('estimatedFare').value = Math.round(estimatedFare);

            // Mark that fare was calculated
            calculatedFare = true;
        } else {
            // Handle specific error cases
            let errorMessage = 'Could not calculate route. Please check your locations and try again.';

            if (status === 'ZERO_RESULTS') {
                errorMessage = 'No route found between these locations. Please check and try again.';
            } else if (status === 'NOT_FOUND') {
                errorMessage = 'One or both locations could not be found. Please check the spelling.';
            }

            showErrorMessage(errorMessage);
        }
    });
}

// Submit booking to Google Sheets
function submitBooking(e) {
    e.preventDefault();
    console.log("Submitting booking form...");

    // Hide any previous messages
    const successElement = document.getElementById('successMessage');
    const errorElement = document.getElementById('errorMessage');

    if (successElement) successElement.style.display = 'none';
    if (errorElement) errorElement.style.display = 'none';

    // Validate form
    const { isValid, errors } = validateForm();
    if (!isValid) {
        console.log("Form validation failed:", errors);
        return;
    }

    // Get form data
    const formData = new FormData(document.getElementById('bookingForm'));
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    console.log("Form data collected:", data);

    // Get Google Sheets script URL
    const scriptURL = document.getElementById('scriptUrl').value;
    if (!scriptURL) {
        showErrorMessage('Missing Google Apps Script URL. Please set up your script URL first.');
        return;
    }

    // Show loading state
    const submitButton = document.getElementById('submitButton');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="loading-spinner"></span>Submitting...';

    console.log("Sending data to Google Sheets script URL:", scriptURL);

    // Send data to Google Sheets
    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'no-cors' // Required for cross-origin requests
    })
    .then(() => {
        console.log("Request completed. With no-cors mode, we can't read the response.");

        // With no-cors mode, we can't actually read the response status
        // We'll assume success since the request didn't throw an error

        // Generate a booking reference number with the same format as the server
        const bookingRef = generateBookingReference();
        console.log("Generated booking reference:", bookingRef);

        // Show success message with booking reference
        showSuccessMessage(bookingRef);

        // Reset form completely
        resetForm();
    })
    .catch(error => {
        console.error('Fetch error:', error);
        showErrorMessage('Failed to submit booking. Please try again or contact us directly.');
    })
    .finally(() => {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
        console.log("Submission process completed");
    });
}

// Generate a booking reference number that matches the server-side format
// Format: MT20250505_D1 for drop trips or MT20250505_R1 for round trips
function generateBookingReference() {
    // Get current date in YYYYMMDD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Get trip type
    const tripType = document.querySelector('input[name="tripType"]:checked').value;
    const tripCode = tripType === 'drop' ? 'D' : 'R';

    // Add a sequential number (for now just using 1, could be enhanced to increment)
    const sequenceNum = '1';

    return `MT${dateStr}_${tripCode}${sequenceNum}`;
}

// Load Google Maps API with error handling
function loadGoogleMapsAPI() {
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBTm8unNAZY-We3a05qozpJMPgPJFvKk-8&libraries=places&callback=initMap';
    script.async = true;
    script.defer = true;
    script.onerror = function() {
        console.error('Failed to load Google Maps API');
        showErrorMessage('Failed to load map services. Please refresh the page or try again later.');
    };
    document.body.appendChild(script);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded. Initializing app...");
    loadGoogleMapsAPI();
});
