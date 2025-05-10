/**
 * Mayil Taxi Booking System
 * Enhanced script with improved security, error handling, and user experience
 */

// Global variables
let placeAutocompletePickup;
let placeAutocompleteDrop;
let directionsService;
let map;
let distanceInKm = 0;
let calculatedFare = false;
let submissionInProgress = false;
let mapLoaded = false;

// Constants
const BASE_RATES = {
    hatchback: 13,
    sedan: 14,
    ertiga: 18,
    crysta: 20
};

// Set min date for pickup to today and default value to 1 hour from now
function initializeDateFields() {
    const today = new Date();
    const formattedDate = today.toISOString().slice(0, 16);
    const pickupDateField = document.getElementById('pickupDate');

    if (pickupDateField) {
        pickupDateField.min = formattedDate;

        // Set default value to 1 hour from now
        const oneHourLater = new Date(today.getTime() + (60 * 60 * 1000));
        pickupDateField.value = oneHourLater.toISOString().slice(0, 16);
    }
}

// Show/hide drop date field based on trip type
function toggleDropDateField() {
    const tripType = document.querySelector('input[name="tripType"]:checked')?.value;
    const dropDateContainer = document.getElementById('dropDateContainer');
    const roundTripDetails = document.querySelector('.round-trip-details');

    if (!tripType || !dropDateContainer) return;

    if (tripType === 'round') {
        dropDateContainer.style.display = 'block';
        if (roundTripDetails) roundTripDetails.style.display = 'block';

        // Set min date for drop date to be at least the pickup date
        const pickupDate = document.getElementById('pickupDate')?.value;
        if (pickupDate) {
            const dropDateField = document.getElementById('dropDate');
            if (dropDateField) {
                dropDateField.min = pickupDate;

                // Set default return date to next day from pickup if not already set
                if (!dropDateField.value) {
                    const nextDay = new Date(new Date(pickupDate).getTime() + (24 * 60 * 60 * 1000));
                    dropDateField.value = nextDay.toISOString().slice(0, 16);
                }

                // Calculate days initially
                calculateTotalDays();

                // Make drop date required for round trips
                dropDateField.required = true;
            }
        }
    } else {
        dropDateContainer.style.display = 'none';
        if (roundTripDetails) roundTripDetails.style.display = 'none';

        const dropDateField = document.getElementById('dropDate');
        if (dropDateField) dropDateField.required = false;
    }
}

// Calculate days between pickup and drop dates
function calculateTotalDays() {
    const pickupDateInput = document.getElementById('pickupDate');
    const dropDateInput = document.getElementById('dropDate');

    if (pickupDateInput?.value && dropDateInput?.value) {
        const pickupDate = new Date(pickupDateInput.value);
        const dropDate = new Date(dropDateInput.value);

        // Calculate difference in milliseconds
        const diffTime = Math.abs(dropDate - pickupDate);

        // Convert to days (round up to include partial days)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Update the display and hidden field
        const totalDaysResult = document.getElementById('totalDaysResult');
        if (totalDaysResult) {
            totalDaysResult.textContent = diffDays;
        }

        // Update hidden fields
        const totalDaysInput = document.getElementById('totalDays');
        if (totalDaysInput) {
            totalDaysInput.value = diffDays;
        }

        // Create or update numDays hidden field (for compatibility)
        let numDaysInput = document.getElementById('numDays');
        if (!numDaysInput) {
            numDaysInput = document.createElement('input');
            numDaysInput.type = 'hidden';
            numDaysInput.id = 'numDays';
            numDaysInput.name = 'numDays';
            document.getElementById('bookingForm')?.appendChild(numDaysInput);
        }
        numDaysInput.value = diffDays;

        return diffDays;
    }

    return 0;
}

// Initialize Google Maps services with modern PlaceAutocomplete
function initMap() {
    try {
        console.log("Initializing Google Maps...");

        // Create map instance (required for the API even if not displayed)
        map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: 13.0827, lng: 80.2707}, // Default to Chennai
            zoom: 2,
            disableDefaultUI: true
        });

        // Initialize the Google Places Autocomplete with the new API
        // Note: In a real implementation, you would replace this with PlaceAutocompleteElement
        // For backward compatibility, we're using the existing Autocomplete with a warning
        const pickupInput = document.getElementById('pickup');
        const dropoffInput = document.getElementById('dropoff');

        if (pickupInput) {
            autocompletePickup = new google.maps.places.Autocomplete(
                pickupInput,
                {types: ['geocode']}
            );
        }

        if (dropoffInput) {
            autocompleteDrop = new google.maps.places.Autocomplete(
                dropoffInput,
                {types: ['geocode']}
            );
        }

        // Initialize the Directions Service
        directionsService = new google.maps.DirectionsService();
        mapLoaded = true;

        console.log("Google Maps services initialized successfully.");

        // Add event listeners after map is loaded
        setupEventListeners();

        // Initialize drop date visibility based on initial trip type
        toggleDropDateField();

        // Verify critical elements exist
        console.log('Verifying HTML elements...');
        verifyElements();

    } catch (error) {
        console.error('Error initializing map:', error);
        showErrorMessage('Failed to initialize map services. Please refresh the page.');
    }
}

// Setup event listeners after map is loaded
function setupEventListeners() {
    // Add event listeners to calculate button
    const calculateButton = document.getElementById('calculate');
    if (calculateButton) {
        calculateButton.addEventListener('click', calculateFare);
    }

    // Add event listeners to trip type options
    document.querySelectorAll('input[name="tripType"]').forEach(radio => {
        radio.addEventListener('change', toggleDropDateField);
    });

    // Add event listener for pickup date changes
    const pickupDateField = document.getElementById('pickupDate');
    if (pickupDateField) {
        pickupDateField.addEventListener('change', function() {
            if (document.querySelector('input[name="tripType"]:checked')?.value === 'round') {
                const dropDateField = document.getElementById('dropDate');
                if (dropDateField) dropDateField.min = this.value;
                calculateTotalDays();
            }
        });
    }

    // Add event listener for drop date changes
    const dropDateField = document.getElementById('dropDate');
    if (dropDateField) {
        dropDateField.addEventListener('change', function() {
            calculateTotalDays();

            // Recalculate fare if distance is available
            if (distanceInKm > 0) {
                calculateFare();
            }
        });
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
        hideErrorMessage();

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
        errorElement.textContent = message || 'Failed to submit booking. Please try again or contact us directly.';
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
        alert('Error: ' + (message || 'Unknown error occurred'));
    }
}

// Helper function to hide error message
function hideErrorMessage() {
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
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

    // Hide any global error message
    hideErrorMessage();
}

// Reset form completely
function resetForm() {
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.reset();
    }

    const resultsSection = document.getElementById('results');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }

    calculatedFare = false;
    clearAllErrors();

    // Reset trip type selection
    document.querySelectorAll('.trip-type .btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const dropLabel = document.querySelector('label[for="drop"]');
    if (dropLabel) dropLabel.classList.add('active');

    const dropRadio = document.getElementById('drop');
    if (dropRadio) dropRadio.checked = true;

    toggleDropDateField(); // This will hide the drop date field

    // Reset vehicle selection
    const vehicleOptions = document.querySelectorAll('.vehicle-option');
    vehicleOptions.forEach(opt => opt.classList.remove('selected'));

    if (vehicleOptions.length > 0) {
        vehicleOptions[0].classList.add('selected');
    }

    const hatchbackRadio = document.getElementById('hatchback');
    if (hatchbackRadio) hatchbackRadio.checked = true;

    // Set default pickup time again
    initializeDateFields();

    // Hide round-trip details in results section
    const roundTripDetails = document.querySelector('.round-trip-details');
    if (roundTripDetails) {
        roundTripDetails.style.display = 'none';
    }
}

// Improved validation function
function validateForm() {
    let isValid = true;
    const required = ['name', 'email', 'phone', 'pickup', 'dropoff', 'pickupDate'];
    const errors = {};

    // Add drop date validation for round trips
    if (document.querySelector('input[name="tripType"]:checked')?.value === 'round') {
        required.push('dropDate');
    }

    // Clear all previous errors
    clearAllErrors();

    // Check required fields
    required.forEach(field => {
        const input = document.getElementById(field);
        if (!input?.value.trim()) {
            input.classList.add('is-invalid');
            const errorElement = document.getElementById(field + 'Error');
            if (errorElement) errorElement.textContent = 'This field is required';
            isValid = false;
            errors[field] = 'required';
        }
    });

    // Validate email format
    const email = document.getElementById('email');
    if (email?.value && !validateEmail(email.value)) {
        email.classList.add('is-invalid');
        const emailError = document.getElementById('emailError');
        if (emailError) emailError.textContent = 'Please enter a valid email address';
        isValid = false;
        errors.email = 'invalid';
    }

    // Validate phone number
    const phone = document.getElementById('phone');
    if (phone?.value && !validatePhone(phone.value)) {
        phone.classList.add('is-invalid');
        const phoneError = document.getElementById('phoneError');
        if (phoneError) phoneError.textContent = 'Please enter a valid phone number';
        isValid = false;
        errors.phone = 'invalid';
    }

    // Check if fare was calculated
    if (!calculatedFare) {
        showErrorMessage('Please calculate the fare before submitting');
        isValid = false;
        errors.fare = 'not_calculated';
    }

    // Check dates are logical
    if (document.querySelector('input[name="tripType"]:checked')?.value === 'round') {
        const pickupDate = new Date(document.getElementById('pickupDate')?.value);
        const dropDate = new Date(document.getElementById('dropDate')?.value);

        if (dropDate <= pickupDate) {
            const dropDateField = document.getElementById('dropDate');
            if (dropDateField) dropDateField.classList.add('is-invalid');

            const dropDateError = document.getElementById('dropDateError');
            if (dropDateError) dropDateError.textContent = 'Return date must be after pickup date';

            isValid = false;
            errors.dates = 'invalid_range';
        }
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
    // Improved validation - at least 10 digits
    const phoneDigits = phone.replace(/\D/g, '');
    return phoneDigits.length >= 10;
}

// Calculate fare based on trip type, vehicle type and distance
function calculateFare() {
    const pickup = document.getElementById('pickup')?.value;
    const dropoff = document.getElementById('dropoff')?.value;

    // Clear any previous errors
    clearAllErrors();

    // Validate map is loaded
    if (!mapLoaded) {
        showErrorMessage('Map services are still loading. Please wait a moment and try again.');
        return;
    }

    // Validate inputs
    if (!pickup) {
        const pickupField = document.getElementById('pickup');
        if (pickupField) pickupField.classList.add('is-invalid');

        const pickupError = document.getElementById('pickupError');
        if (pickupError) pickupError.textContent = 'Pickup location is required';
        return;
    }

    if (!dropoff) {
        const dropoffField = document.getElementById('dropoff');
        if (dropoffField) dropoffField.classList.add('is-invalid');

        const dropoffError = document.getElementById('dropoffError');
        if (dropoffError) dropoffError.textContent = 'Drop location is required';
        return;
    }

    // Show loading state on the calculate button
    const calculateButton = document.getElementById('calculate');
    let originalButtonText = 'Calculate Fare';

    if (calculateButton) {
        originalButtonText = calculateButton.textContent;
        calculateButton.disabled = true;
        calculateButton.innerHTML = '<span class="loading-spinner"></span>Calculating...';
    }

    const request = {
        origin: pickup,
        destination: dropoff,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, function(response, status) {
        // Reset button state
        if (calculateButton) {
            calculateButton.disabled = false;
            calculateButton.textContent = originalButtonText;
        }

        if (status === 'OK') {
            // Get the route
            const route = response.routes[0];

            // Extract distance information
            distanceInKm = route.legs[0].distance.value / 1000;
            const durationMin = route.legs[0].duration.value / 60;

            // Get selected vehicle type and trip type
            const vehicleType = document.querySelector('input[name="vehicleType"]:checked')?.value || 'hatchback';
            const tripType = document.querySelector('input[name="tripType"]:checked')?.value || 'drop';

            // Calculate fare based on vehicle type
            let ratePerKm = BASE_RATES[vehicleType] || 13; // Default to hatchback rate if not found

            let estimatedFare = 0;
            let totalDays = 0;

            // Adjust fare based on trip type
            if (tripType === 'drop') {
                estimatedFare = distanceInKm * ratePerKm;
                const roundTripDetails = document.querySelector('.round-trip-details');
                if (roundTripDetails) {
                    roundTripDetails.style.display = 'none';
                }
            } else if (tripType === 'round') {
                estimatedFare = distanceInKm * 2 * ratePerKm;

                // Calculate days between pickup and drop dates
                totalDays = calculateTotalDays();

                // Update display of round trip details
                const roundTripDetails = document.querySelector('.round-trip-details');
                if (roundTripDetails) {
                    roundTripDetails.style.display = 'block';
                }
            }

            // Apply minimum fare if applicable (e.g., 500 rupees)
            const minimumFare = 500;
            if (estimatedFare < minimumFare) {
                estimatedFare = minimumFare;
            }

            // Display results
            const distanceResult = document.getElementById('distanceResult');
            if (distanceResult) distanceResult.textContent = distanceInKm.toFixed(2) + ' km';

            const durationResult = document.getElementById('durationResult');
            if (durationResult) durationResult.textContent = Math.round(durationMin) + ' minutes';

            const fareEstimation = document.getElementById('fareEstimation');
            if (fareEstimation) fareEstimation.textContent = '₹' + Math.round(estimatedFare);

            const resultsSection = document.getElementById('results');
            if (resultsSection) resultsSection.style.display = 'block';

            // Store for form submission
            const distanceKmField = document.getElementById('distanceKm');
            if (distanceKmField) distanceKmField.value = distanceInKm.toFixed(2);

            const estimatedFareField = document.getElementById('estimatedFare');
            if (estimatedFareField) estimatedFareField.value = Math.round(estimatedFare);

            // Mark that fare was calculated
            calculatedFare = true;

            // Scroll to results
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            // Handle specific error cases
            let errorMessage = 'Could not calculate route. Please check your locations and try again.';

            if (status === 'ZERO_RESULTS') {
                errorMessage = 'No route found between these locations. Please check and try again.';
            } else if (status === 'NOT_FOUND') {
                errorMessage = 'One or both locations could not be found. Please check the spelling.';
            } else if (status === 'OVER_QUERY_LIMIT') {
                errorMessage = 'Too many requests. Please try again later.';
            }

            showErrorMessage(errorMessage);
        }
    });
}

// Generate a unique booking reference
// Generate a booking reference with the new format
function generateBookingReference() {
    // Format: MT[YYYYMMDD]_[D/R][sequential number]
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // We'll use localStorage to track sequential numbers separately for drop and round trips
    // Initialize the counters if they don't exist
    if (!localStorage.getItem('dropTripCounter')) {
        localStorage.setItem('dropTripCounter', '0');
    }
    if (!localStorage.getItem('roundTripCounter')) {
        localStorage.setItem('roundTripCounter', '0');
    }

    // Get the trip type
    const tripType = document.querySelector('input[name="tripType"]:checked')?.value || 'drop';

    // Increment the appropriate counter
    let counter;
    let prefix;
    if (tripType === 'drop') {
        counter = parseInt(localStorage.getItem('dropTripCounter')) + 1;
        localStorage.setItem('dropTripCounter', counter.toString());
        prefix = 'D';
    } else {
        counter = parseInt(localStorage.getItem('roundTripCounter')) + 1;
        localStorage.setItem('roundTripCounter', counter.toString());
        prefix = 'R';
    }

    return `MT${year}${month}${day}_${prefix}${counter}`;
}

// Submit booking to backend - modified to stay on the same page
function submitBooking(e) {
    e.preventDefault();
    console.log("Submitting booking form...");

    // Prevent multiple submissions
    if (submissionInProgress) {
        console.log("Submission already in progress, ignoring duplicate submission");
        return;
    }

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

    // Get form data for submission
    const formData = new FormData(document.getElementById('bookingForm'));
    const jsonData = {};

    formData.forEach((value, key) => {
        jsonData[key] = value;
    });

    // Let the server handle generating the booking reference
    console.log("Form data collected:", jsonData);

    // Use the provided Google Apps Script URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyyaB_tRHlT2q-lSOYXqWaH5sRjMLSp10KO7LA-_x50umNRvDM_J2yQ-HpEmmNXIyg/exec';

    // Show loading state
    const submitButton = document.getElementById('submitButton');
    let originalButtonText = 'Submit Booking';

    if (submitButton) {
        originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    }

    submissionInProgress = true;

    console.log("Sending data to backend URL:", scriptURL);

    // Make a fetch request to the script URL instead of opening a new page
    fetch(scriptURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log("Booking successful:", data);

        // Display success message with booking reference
        if (successElement) {
            const bookingReferenceElement = document.getElementById('bookingReference');
            if (bookingReferenceElement && data.bookingRef) {
                bookingReferenceElement.textContent = data.bookingRef;
            }

            // Fill in booking details
            populateBookingDetails(jsonData, data.bookingRef);

            successElement.style.display = 'block';
            successElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        resetForm();
    })
    .catch(error => {
        console.error("Error submitting form:", error);
        showErrorMessage(error.message || 'Failed to submit booking');
    })
    .finally(() => {
        submissionInProgress = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}

// Function to populate booking details in the success message
function populateBookingDetails(formData, bookingRef) {
    const bookingDetails = document.getElementById('bookingDetails');
    if (!bookingDetails) return;

    // Generate a table with booking details
    bookingDetails.innerHTML = `
        <h4>Booking Details</h4>
        <table class="table table-striped">
            <tr>
                <td><strong>Name:</strong></td>
                <td>${formData.name || ''}</td>
            </tr>
            <tr>
                <td><strong>Phone:</strong></td>
                <td>${formData.phone || ''}</td>
            </tr>
            <tr>
                <td><strong>Email:</strong></td>
                <td>${formData.email || ''}</td>
            </tr>
            <tr>
                <td><strong>Pickup:</strong></td>
                <td>${formData.pickup || ''}</td>
            </tr>
            <tr>
                <td><strong>Destination:</strong></td>
                <td>${formData.dropoff || ''}</td>
            </tr>
            <tr>
                <td><strong>Date/Time:</strong></td>
                <td>${formData.pickupDate || ''}</td>
            </tr>
            <tr>
                <td><strong>Vehicle Type:</strong></td>
                <td>${formData.vehicleType || ''}</td>
            </tr>
            <tr>
                <td><strong>Trip Type:</strong></td>
                <td>${formData.tripType || ''}</td>
            </tr>
            <tr>
                <td><strong>Distance:</strong></td>
                <td>${formData.distanceKm || ''} km</td>
            </tr>
            <tr>
                <td><strong>Estimated Fare:</strong></td>
                <td>₹${formData.estimatedFare || ''}</td>
            </tr>
            ${formData.tripType === 'round' ? `
            <tr>
                <td><strong>Return Date:</strong></td>
                <td>${formData.dropDate || ''}</td>
            </tr>
            <tr>
                <td><strong>Total Days:</strong></td>
                <td>${formData.totalDays || ''}</td>
            </tr>` : ''}
        </table>
    `;

    // Also populate the booking reference again
    const bookingReferenceElement = document.getElementById('bookingReference');
    if (bookingReferenceElement) {
        bookingReferenceElement.textContent = bookingRef;
    }
}

// Submit booking to backend
/**
 * Mayil Taxi Booking System - Client Side Code
 * Modified to ensure booking reference consistency
 */

// Submit booking to backend
function submitBooking(e) {
    e.preventDefault();
    console.log("Submitting booking form...");

    // Prevent multiple submissions
    if (submissionInProgress) {
        console.log("Submission already in progress, ignoring duplicate submission");
        return;
    }

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

    // Get form data for submission
    const formData = new FormData(document.getElementById('bookingForm'));
    const jsonData = {};

    formData.forEach((value, key) => {
        jsonData[key] = value;
    });

    // IMPORTANT: Do not generate a booking reference client-side
    // Let the server generate it to avoid discrepancies
    // Remove this line: jsonData.bookingRef = generateBookingReference();

    console.log("Form data collected:", jsonData);

    // Use the provided Google Apps Script URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzDG_nUjxCShmYAcOZ4-PMRZ696PgOHnKpsm4JFGuitZgRqS5XbRpf07ZmTUW-ul4pP/exec';

    // Show loading state
    const submitButton = document.getElementById('submitButton');
    let originalButtonText = 'Submit Booking';

    if (submitButton) {
        originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    }

    submissionInProgress = true;

    console.log("Sending data to backend URL:", scriptURL);

    // Create a temporary form and submit it
    const tempForm = document.createElement('form');
    tempForm.method = 'POST';
    tempForm.action = scriptURL;
    tempForm.target = '_blank'; // Open response in new tab

    // Add form data as hidden fields
    for (const key in jsonData) {
        if (jsonData.hasOwnProperty(key)) {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = key;
            hiddenField.value = jsonData[key];
            tempForm.appendChild(hiddenField);
        }
    }

    // Add submission method field
    const methodField = document.createElement('input');
    methodField.type = 'hidden';
    methodField.name = 'submitMethod';
    methodField.value = 'formSubmit';
    tempForm.appendChild(methodField);

    // Append form to body and submit
    document.body.appendChild(tempForm);

    try {
        tempForm.submit();

        // Now we rely on the server response for the booking reference
        // The server will show the confirmation with the correct reference
        // in the new tab that opens

        setTimeout(() => {
            // Here we just show that the form was submitted
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }

            // Show a simple message without a reference
            if (successElement) {
                const bookingReferenceElement = document.getElementById('bookingReference');
                if (bookingReferenceElement) {
                    bookingReferenceElement.textContent = "(see confirmation page)";
                }
                successElement.style.display = 'block';
                successElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            resetForm();
        }, 1000);
    } catch (error) {
        console.error("Error submitting form:", error);
        showErrorMessage(error.message || 'Failed to submit booking');
    } finally {
        // Clean up the temporary form
        document.body.removeChild(tempForm);

        submissionInProgress = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }
}

// Load Google Maps API script securely
function loadGoogleMapsAPI() {
    // In a production environment, the API key should be loaded from server-side
    // or secured with proper restrictions (HTTP referrers, IP addresses, etc.)
    const apiKey = 'AIzaSyBTm8unNAZY-We3a05qozpJMPgPJFvKk-8'; // Replace on server-side before serving

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    // Add error handling
    script.onerror = function() {
        console.error('Failed to load Google Maps API');
        showErrorMessage('Failed to load maps service. Please refresh the page or try again later.');
    };
}

// Function to select vehicle
function selectVehicle(element, id) {
    if (!element || !id) return;

    // Remove selected class from all options
    document.querySelectorAll('.vehicle-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Add selected class to clicked option
    element.classList.add('selected');

    // Check the radio button
    const radioButton = document.getElementById(id);
    if (radioButton) radioButton.checked = true;

    // Recalculate fare if distance is available
    if (distanceInKm > 0) {
        calculateFare();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");

    // Initialize date fields
    initializeDateFields();

    // Set up form submission handler
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', submitBooking);
    }

    // Load Google Maps API
    loadGoogleMapsAPI();

    // Initialize vehicle selection click handlers
    document.querySelectorAll('.vehicle-option').forEach(option => {
        option.addEventListener('click', function() {
            const radioInput = this.querySelector('input[type="radio"]');
            if (radioInput) {
                selectVehicle(this, radioInput.id);
            }
        });
    });

    // Initialize trip type buttons
    document.querySelectorAll('.trip-type .btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.trip-type .btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // Add a "reset form" button if needed
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.addEventListener('click', resetForm);
    }
});
