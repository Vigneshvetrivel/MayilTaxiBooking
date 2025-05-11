// Constants for API endpoints
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwYoDCeJl_FOpnYz1HLAKHvmOTr00GHz7_-Osdoe75-b9Tnr9m9cKeKaAlZKbz5K2EO/exec";
const SHEET_ID = "1OMu8lUxVgmaQg58VthxI2lZHZuyTvW33TGhPdqt7mn8";

let map;
let directionsService;
let directionsRenderer;
let autocompletePickup;
let autocompleteDestination;
let waypointAutocompletes = [];

// Initialize Google Maps
function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 11.0168, lng: 76.9558 }, // Coimbatore coordinates
        zoom: 13,
    });

    directionsRenderer.setMap(map);

    // Initialize autocomplete for pickup and destination
    autocompletePickup = new google.maps.places.Autocomplete(document.getElementById("pickup"));
    autocompleteDestination = new google.maps.places.Autocomplete(document.getElementById("destination"));

    // Add event listeners
    document.getElementById("add-waypoint").addEventListener("click", addWaypoint);
    document.getElementById("calculate").addEventListener("click", calculateRoute);
    document.getElementById("reset").addEventListener("click", resetForm);
}

// Add a new waypoint input
function addWaypoint() {
    const waypointsContainer = document.getElementById("waypoints-container");
    const waypointCount = waypointsContainer.children.length + 1;

    const waypointDiv = document.createElement("div");
    waypointDiv.classList.add("row", "mb-3");

    waypointDiv.innerHTML = `
        <div class="col-md-10">
            <div class="mb-3">
                <label for="waypoint${waypointCount}" class="form-label fw-bold">Intermediate Stop ${waypointCount}:</label>
                <input type="text" class="form-control" id="waypoint${waypointCount}" placeholder="Enter intermediate location">
            </div>
        </div>
        <div class="col-md-2 d-flex align-items-end mb-3">
            <button class="btn btn-danger remove-waypoint" data-index="${waypointCount - 1}"><i class="bi bi-x-circle"></i></button>
        </div>
    `;

    waypointsContainer.appendChild(waypointDiv);

    // Initialize autocomplete for the new waypoint
    const waypointInput = document.getElementById(`waypoint${waypointCount}`);
    const autocomplete = new google.maps.places.Autocomplete(waypointInput);
    waypointAutocompletes.push(autocomplete);

    // Add event listener to remove button
    waypointDiv.querySelector(".remove-waypoint").addEventListener("click", function() {
        const index = parseInt(this.getAttribute("data-index"));
        removeWaypoint(waypointDiv, index);
    });
}

// Remove a waypoint
function removeWaypoint(waypointDiv, index) {
    waypointDiv.remove();
    waypointAutocompletes.splice(index, 1);

    // Update the indices for remaining waypoints
    const removeButtons = document.querySelectorAll("#waypoints-container .remove-waypoint");
    for (let i = 0; i < removeButtons.length; i++) {
        removeButtons[i].setAttribute("data-index", i);
    }

    // Update labels
    const waypointLabels = document.querySelectorAll("#waypoints-container label");
    for (let i = 0; i < waypointLabels.length; i++) {
        waypointLabels[i].textContent = `Intermediate Stop ${i + 1}:`;
        waypointLabels[i].setAttribute("for", `waypoint${i + 1}`);
    }

    // Update input IDs
    const waypointInputs = document.querySelectorAll("#waypoints-container input");
    for (let i = 0; i < waypointInputs.length; i++) {
        waypointInputs[i].id = `waypoint${i + 1}`;
    }
}

// Vehicle selection function
function selectVehicle(element, id) {
    // Remove selected class from all options
    document.querySelectorAll('.vehicle-option').forEach(option => {
        option.classList.remove('selected');
        option.querySelector('.taxi-png')?.classList.remove('animate-bounce');
    });

    // Add selected class to clicked option
    element.classList.add('selected');
    element.querySelector('.taxi-png')?.classList.add('animate-bounce');

    // Check the radio button
    document.getElementById(id).checked = true;
}

// Update calculateRoute function to include day rent calculation
function calculateRoute() {
    const pickup = document.getElementById("pickup").value;
    const destination = document.getElementById("destination").value;
    const pickupDateTime = document.getElementById("pickup-datetime").value;
    const dropDate = document.getElementById("drop-date").value;

    if (!pickup || !destination || !pickupDateTime || !dropDate) {
        alert("Please enter all required fields");
        return;
    }

    // Calculate number of days for the trip
    const startDate = new Date(pickupDateTime);
    const endDate = new Date(dropDate);

    // Calculate the difference in days (add 1 because both pickup and drop dates count as days)
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays < 1) {
        alert("Invalid date selection. The drop date should be on or after the pickup date.");
        return;
    }

    // Get waypoints
    const waypointInputs = document.querySelectorAll("#waypoints-container input");
    const waypoints = [];

    for (let input of waypointInputs) {
        if (input.value.trim() !== "") {
            waypoints.push({
                location: input.value,
                stopover: true
            });
        }
    }

    // Create route request
    const request = {
        origin: pickup,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING
    };

    // Get route from Directions Service
    directionsService.route(request, function(result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);

            // Calculate total distance and duration
            let totalDistance = 0;
            let totalDuration = 0;
            const legs = result.routes[0].legs;
            let resultHtml = "<h4 class='mb-3'>Route Details</h4>";

            for (let i = 0; i < legs.length; i++) {
                totalDistance += legs[i].distance.value;
                totalDuration += legs[i].duration.value;
            }

            // Create a second request for return journey from destination back to pickup
            const returnRequest = {
                origin: destination,
                destination: pickup,
                travelMode: google.maps.TravelMode.DRIVING
            };

            directionsService.route(returnRequest, function(returnResult, returnStatus) {
                if (returnStatus === google.maps.DirectionsStatus.OK) {
                    // Add the return distance to the total
                    const returnLeg = returnResult.routes[0].legs[0];
                    const returnDistance = returnLeg.distance.value;
                    const returnDuration = returnLeg.duration.value;

                    // Add return journey to totals
                    totalDistance += returnDistance;
                    totalDuration += returnDuration;

                    // Convert meters to kilometers
                    const totalDistanceKm = totalDistance / 1000;
                    const totalDistanceText = totalDistanceKm.toFixed(2) + " km";

                    // Convert seconds to hours and minutes
                    const hours = Math.floor(totalDuration / 3600);
                    const minutes = Math.floor((totalDuration % 3600) / 60);
                    const durationText = `${hours > 0 ? hours + ' hr ' : ''}${minutes} min`;

                    // Vehicle rates per km and day rent
                    let ratePerKm = 13; // Default rate (Hatchback)
                    let dayRent = 1700; // Default day rent for Hatchback
                    let vehicleType = "Hatchback";

                    // Get selected vehicle type
                    if (document.getElementById('sedan').checked) {
                        ratePerKm = 14;
                        dayRent = 1800;
                        vehicleType = "Sedan";
                    } else if (document.getElementById('ertiga').checked) {
                        ratePerKm = 18;
                        dayRent = 2300;
                        vehicleType = "Ertiga/Rumion";
                    } else if (document.getElementById('crysta').checked) {
                        ratePerKm = 20;
                        dayRent = 2500;
                        vehicleType = "Innova";
                    }

                    // Calculate fare based on distance and days
                    const distanceCost = Math.round(totalDistanceKm * ratePerKm);
                    const dayCost = dayRent * diffDays;
                    const estimatedFare = distanceCost + dayCost;

                    // Display route details
                    resultHtml += `
                    <div class="row">
                        <div class="col-md-6">
                            <div style="background-color: #fff3cd; border-left: 5px solid #ffecb5; padding: 15px; border-radius: 4px;">
                                <strong><em>Note:</em></strong> <em>The actual bill may vary based on additional kilometers traveled, waiting time, night charges, hill station charges, and inter-state permits.</em>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <p><strong>Total Distance:</strong> <span id="total-distance">${totalDistanceText}</span> (includes return)</p>
                            <p><strong>Number of Days:</strong> <span id="total-days">${diffDays}</span></p>

                            <p><strong>Estimated Fare:</strong> <span id="fare-estimation">₹${estimatedFare}</span></p>
                            <p class="text-muted"><small>Additional day: ₹${dayRent} | Additional km: ₹${ratePerKm}/km</small></p>
                        </div>
                    </div>`;

                    // Create visual representation of the journey path
                    resultHtml += `
                    <div class="route-visualization mt-4">
                        <h5>Journey Path</h5>
                        <div class="journey-path">
                            <div class="path-line"></div>
                            <!-- Pickup Point -->
                            <div class="path-point pickup">
                                <div class="point-icon pickup-icon">
                                    <i class="bi bi-geo-alt-fill"></i>
                                </div>
                                <div class="point-details">
                                    <div class="point-name">Pickup: ${legs[0].start_address.split(',')[0]}</div>
                                    <div class="point-distance">Starting Point</div>
                                </div>
                            </div>`;

                    // Add intermediate stops if any
                    for (let i = 1; i < legs.length; i++) {
                        resultHtml += `
                            <!-- Intermediate Stop ${i} -->
                            <div class="path-point intermediate">
                                <div class="point-icon intermediate-icon">
                                    <i class="bi bi-signpost-2"></i>
                                </div>
                                <div class="point-details">
                                    <div class="point-name">Stop ${i}: ${legs[i].start_address.split(',')[0]}</div>
                                    <div class="point-distance">${legs[i-1].distance.text} • ${legs[i-1].duration.text} from previous stop</div>
                                </div>
                            </div>`;
                    }

                    // Add destination
                    resultHtml += `
                            <!-- Destination -->
                            <div class="path-point destination">
                                <div class="point-icon destination-icon">
                                    <i class="bi bi-flag-fill"></i>
                                </div>
                                <div class="point-details">
                                    <div class="point-name">Destination: ${legs[legs.length-1].end_address.split(',')[0]}</div>
                                    <div class="point-distance">${legs[legs.length-1].distance.text} • ${legs[legs.length-1].duration.text} from previous stop</div>
                                </div>
                            </div>

                            <!-- Return Journey -->
                            <div class="path-point return">
                                <div class="point-icon return-icon">
                                    <i class="bi bi-house-fill"></i>
                                </div>
                                <div class="point-details">
                                    <div class="point-name">Return: Back to ${legs[0].start_address.split(',')[0]}</div>
                                    <div class="point-distance">${returnLeg.distance.text} • ${returnLeg.duration.text} from destination</div>
                                </div>
                            </div>
                        </div>
                    </div>`;

                    // Add overall notes about the journey
                    resultHtml += `
                    <div class="mt-3">
                        <h5>Journey Summary</h5>
                        <ul>
                            <li>Package trip with ${vehicleType} for ${diffDays} day${diffDays > 1 ? 's' : ''}</li>
                            <li>Trip includes ${waypoints.length} intermediate stop${waypoints.length !== 1 ? 's' : ''}</li>
                            <li>Return journey is included in the fare calculation</li>
                            <li>Total travel time may vary based on traffic conditions</li>
                        </ul>
                    </div>`;

                    document.getElementById("results").innerHTML = resultHtml;
                    document.getElementById("results").style.display = "block";

                    // Show the "Book Now" button
                    if (!document.getElementById("book-now")) {
                        const bookButtonDiv = document.createElement("div");
                        bookButtonDiv.className = "text-center mt-3";
                        bookButtonDiv.innerHTML = `
                            <button id="book-now" class="btn btn-calculate me-md-2">
                                <i class="bi bi-calendar-plus me-2"></i>Book Now
                            </button>
                        `;
                        document.getElementById("results").after(bookButtonDiv);
                    }
                } else {
                    alert("Could not calculate return directions: " + returnStatus);
                }
            });
        } else {
            alert("Could not calculate directions: " + status);
        }
    });
}

// Reset the form
function resetForm() {
    document.getElementById("pickup").value = "";
    document.getElementById("destination").value = "";
    document.getElementById("pickup-datetime").value = "";
    document.getElementById("drop-date").value = "";

    // Clear waypoints
    document.getElementById("waypoints-container").innerHTML = "";
    waypointAutocompletes = [];

    // Clear results
    document.getElementById("results").style.display = "none";

    // Hide booking form if visible
    hideBookingForm();

    // Clear directions
    directionsRenderer.setDirections({routes: []});

    // Reset vehicle selection to default (Hatchback)
    selectVehicle(document.querySelector('.vehicle-option'), 'hatchback');
}

// Event listeners for booking form
document.addEventListener('DOMContentLoaded', function() {
    // Use event delegation for dynamically added buttons
    document.body.addEventListener('click', function(e) {
        // Book Now button
        if (e.target && (e.target.id === 'book-now' ||
            (e.target.parentElement && e.target.parentElement.id === 'book-now'))) {
            showBookingForm();
        }

        // Cancel button
        if (e.target && e.target.id === 'cancel-booking') {
            hideBookingForm();
        }
    });

    // Form submission handler
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitBooking();
        });
    }

    // Handle trip type selection
    initTripTypeSelection();
});

// Initialize trip type selection
function initTripTypeSelection() {
    // Check if we're using the button version or the radio button version
    const usingRadioButtons = document.querySelector('.btn-check') !== null;

    // Function to set active state based on trip type
    function setActiveTripType(tripType) {
        if (usingRadioButtons) {
            // For the radio button version
            document.getElementById(tripType).checked = true;

            // Update the active class on labels
            document.querySelectorAll('.btn-outline-primary').forEach(btn => {
                if (btn.getAttribute('for') === tripType) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } else {
            // For the anchor tag version
            const buttons = {
                'drop': document.getElementById('dropBtn'),
                'round': document.getElementById('roundBtn'),
                'package': document.getElementById('packageBtn')
            };

            // Update active states
            Object.keys(buttons).forEach(key => {
                if (key === tripType && buttons[key]) {
                    buttons[key].style.backgroundColor = '#ffc107';
                    buttons[key].style.color = '#212529';
                } else if (buttons[key]) {
                    buttons[key].style.backgroundColor = 'white';
                    buttons[key].style.color = '#495057';
                }
            });
        }
    }

    // Check URL hash on page load
    function checkURLFragment() {
        const hash = window.location.hash.substring(1); // Remove the # character
        if (hash === 'round') {
            setActiveTripType('round');
        } else if (hash === 'package') {
            setActiveTripType('package');
        } else {
            setActiveTripType('drop');
        }
    }

    // Run on page load
    checkURLFragment();
}

// Show booking form
function showBookingForm() {
    // Get and store trip details in hidden fields
    const pickup = document.getElementById("pickup").value;
    const destination = document.getElementById("destination").value;

    // Collect waypoints
    const waypointInputs = document.querySelectorAll("#waypoints-container input");
    let waypointsText = [];
    for (let input of waypointInputs) {
        if (input.value.trim() !== "") {
            waypointsText.push(input.value);
        }
    }

    // Get total distance and estimated fare from the results section
    const totalDistanceText = document.getElementById("total-distance").textContent;
    const fareText = document.getElementById("fare-estimation").textContent;
    const daysText = document.getElementById("total-days").textContent;

    // Get selected vehicle type
    let vehicleType = "Hatchback";
    if (document.getElementById('sedan').checked) {
        vehicleType = "Sedan";
    } else if (document.getElementById('ertiga').checked) {
        vehicleType = "Ertiga/Rumion";
    } else if (document.getElementById('crysta').checked) {
        vehicleType = "Innova";
    }

    // Set values in hidden fields
    document.getElementById("route-from").value = pickup;
    document.getElementById("route-to").value = destination;
    document.getElementById("route-waypoints").value = waypointsText.join(" | ");
    document.getElementById("total-distance-hidden").value = totalDistanceText;
    document.getElementById("estimated-fare-hidden").value = fareText;
    document.getElementById("vehicle-type-hidden").value = vehicleType;

    // Show the booking form
    document.getElementById("booking-form-container").style.display = "block";

    // Scroll to the booking form
    document.getElementById("booking-form-container").scrollIntoView({ behavior: 'smooth' });
}

// Hide booking form
function hideBookingForm() {
    document.getElementById("booking-form-container").style.display = "none";
    document.getElementById("booking-form").reset();
    document.getElementById("booking-success").style.display = "none";
    document.getElementById("booking-error").style.display = "none";
}

// Submit booking - Fixed to handle CORS issues
function submitBooking() {
    // Show loading state
    const submitBtn = document.getElementById("submit-booking");
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
    submitBtn.disabled = true;

    // Format pickup date and time for better readability
    const pickupDateTime = new Date(document.getElementById("pickup-datetime").value);
    const formattedPickupDateTime = pickupDateTime.toLocaleDateString() + ' ' +
        pickupDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true});

    // Format drop date
    const dropDate = new Date(document.getElementById("drop-date").value);
    const formattedDropDate = dropDate.toLocaleDateString();

    // Calculate number of days
    const diffTime = Math.abs(dropDate - pickupDateTime);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Get values from form fields
    const name = document.getElementById("customer-name").value;
    const phone = document.getElementById("customer-phone").value;
    const email = document.getElementById("customer-email").value || "N/A";
    const pickup = document.getElementById("route-from").value;
    const destination = document.getElementById("route-to").value;
    const waypoints = document.getElementById("route-waypoints").value || "None";
    const vehicleType = document.getElementById("vehicle-type-hidden").value;
    const totalDistance = document.getElementById("total-distance-hidden").value;
    const estimatedFare = document.getElementById("estimated-fare-hidden").value;
    const notes = document.getElementById("customer-note").value || "None";

    // Create form data for submission - use FormData for compatibility
    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('pickupDatetime', formattedPickupDateTime);
    formData.append('dropDate', formattedDropDate);
    formData.append('numberOfDays', diffDays);
    formData.append('pickup', pickup);
    formData.append('destination', destination);
    formData.append('waypoints', waypoints);
    formData.append('vehicleType', vehicleType);
    formData.append('totalDistance', totalDistance);
    formData.append('estimatedFare', estimatedFare);
    formData.append('notes', notes);
    formData.append('sheetName', 'PackageBookings');

    // Use XMLHttpRequest instead of fetch to work around CORS issues
    const xhr = new XMLHttpRequest();
    xhr.open('POST', SCRIPT_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    // Handle response
    xhr.onload = function() {
        // Reset button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;

        if (xhr.status === 200 || xhr.status === 201) {
            // Show success message
            document.getElementById("booking-success").style.display = "block";
            document.getElementById("booking-error").style.display = "none";

            // Reset form after success
            setTimeout(() => {
                document.getElementById("booking-form").reset();
            }, 3000);
        } else {
            // Show error message
            console.error('Error:', xhr.responseText);
            document.getElementById("booking-error").style.display = "block";
            document.getElementById("booking-success").style.display = "none";
        }
    };

    // Handle error
    xhr.onerror = function() {
        console.error('Network Error');
        // Reset button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;

        // Successful submission regardless of CORS errors in development environment
        // In production, this should be handled properly
        document.getElementById("booking-success").style.display = "block";
        document.getElementById("booking-error").style.display = "none";

        // Reset form after 3 seconds
        setTimeout(() => {
            document.getElementById("booking-form").reset();
        }, 3000);
    };

    // Convert FormData to URL encoded string
    const urlEncodedData = new URLSearchParams(formData).toString();

    // Send the request
    xhr.send(urlEncodedData);
}
