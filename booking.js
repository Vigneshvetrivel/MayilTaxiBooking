// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBf7vRtx_AzMLqPYtWb6kDUwdzBBOwRIV0",
  authDomain: "mayiltravelsbooking-216d3.firebaseapp.com",
  projectId: "mayiltravelsbooking-216d3",
  storageBucket: "mayiltravelsbooking-216d3.firebasestorage.app",
  messagingSenderId: "520917876941",
  appId: "1:520917876941:web:eed75ced739b72bb352984",
  measurementId: "G-C1Q8Y9DXKJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const bookingForm = document.getElementById("bookingForm");
const successMessage = document.getElementById("successMessage");
const vehicleOptions = document.querySelectorAll('.vehicle-option');
const vehicleTypeInput = document.getElementById('vehicleType');

// Vehicle type selection
vehicleOptions.forEach(option => {
  option.addEventListener('click', function() {
    // Remove selected class from all options
    vehicleOptions.forEach(opt => opt.classList.remove('selected'));
    // Add selected class to clicked option
    this.classList.add('selected');
    // Set the value in hidden input
    vehicleTypeInput.value = this.dataset.value;
  });
});

// Handle form submission
bookingForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  // Validate vehicle type
  if (!vehicleTypeInput.value) {
    alert("Please select a vehicle type");
    return;
  }

  // Get values from form
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const pickup = document.getElementById("pickup").value;
  const drop = document.getElementById("drop").value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const vehicleType = vehicleTypeInput.value;
  const passengers = document.getElementById("passengers").value;
  const specialNotes = document.getElementById("specialNotes").value;

  try {
    // Add document to "bookings" collection in Firestore
    const docRef = await addDoc(collection(db, "bookings"), {
      name: name,
      email: email,
      phone: phone,
      pickup: pickup,
      drop: drop,
      date: date,
      time: time,
      vehicleType: vehicleType,
      passengers: passengers,
      specialNotes: specialNotes,
      status: "pending", // Initial status - no driver assigned
      timestamp: serverTimestamp(), // Using server timestamp for consistency
      notificationSent: false // To track if notification has been sent
    });

    console.log("Booking added with ID: ", docRef.id);

    // Show success message
    successMessage.style.display = "block";
    bookingForm.reset();
    vehicleOptions.forEach(opt => opt.classList.remove('selected'));

    // Hide success message after 5 seconds
    setTimeout(() => {
      successMessage.style.display = "none";
    }, 5000);
  } catch (error) {
    console.error("Error adding booking: ", error);
    alert("Error submitting booking. Please try again.");
  }
});

// Initialize form on page load
document.addEventListener("DOMContentLoaded", () => {
  // Hide success message initially
  if (successMessage) {
    successMessage.style.display = "none";
  }
});
