// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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
const loadBookingsBtn = document.getElementById("loadBookingsBtn");
const pendingBookingsBtn = document.getElementById("pendingBookingsBtn");
const assignedBookingsBtn = document.getElementById("assignedBookingsBtn");
const bookingsTableBody = document.getElementById("bookingsTableBody");
const assignDriverModal = document.getElementById("assignDriverModal");
const notificationModal = document.getElementById("notificationModal");
const closeModalButtons = document.querySelectorAll(".close");
const assignDriverForm = document.getElementById("assignDriverForm");
const sendNotificationForm = document.getElementById("sendNotificationForm");
const bookingDetailsElement = document.getElementById("bookingDetails");
const notificationBookingDetailsElement = document.getElementById("notificationBookingDetails");
const bookingIdInput = document.getElementById("bookingId");
const notificationBookingIdInput = document.getElementById("notificationBookingId");
const customerEmailBody = document.getElementById("customerEmailBody");
const driverEmailBody = document.getElementById("driverEmailBody");
const customerEmailPreview = document.getElementById("customerEmailPreview");
const driverEmailPreview = document.getElementById("driverEmailPreview");
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

// Tab functionality
tabs.forEach(tab => {
  tab.addEventListener("click", function() {
    // Remove active class from all tabs and contents
    tabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(tc => tc.classList.remove("active"));

    // Add active class to clicked tab and corresponding content
    this.classList.add("active");
    document.getElementById(this.dataset.tab + "Tab").classList.add("active");
  });
});

// Preview email functionality
customerEmailBody.addEventListener("input", function() {
  customerEmailPreview.innerHTML = this.value.replace(/\n/g, '<br>');
});

driverEmailBody.addEventListener("input", function() {
  driverEmailPreview.innerHTML = this.value.replace(/\n/g, '<br>');
});

// Load all bookings
async function loadBookings(filter = null) {
  try {
    bookingsTableBody.innerHTML = "<tr><td colspan='8' style='text-align: center;'>Loading bookings...</td></tr>";

    // Create query to get bookings ordered by timestamp
    const bookingsRef = collection(db, "bookings");
    let q;

    if (filter === "pending") {
      q = query(bookingsRef, where("status", "==", "pending"), orderBy("timestamp", "desc"));
    } else if (filter === "assigned") {
      q = query(bookingsRef, where("status", "==", "assigned"), orderBy("timestamp", "desc"));
    } else {
      q = query(bookingsRef, orderBy("timestamp", "desc"));
    }

    const querySnapshot = await getDocs(q);

    // Clear table
    bookingsTableBody.innerHTML = "";

    if (querySnapshot.empty) {
      bookingsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center;">No bookings found</td>
        </tr>
      `;
      return;
    }

    // Add each booking to the table
    querySnapshot.forEach((doc) => {
      const booking = doc.data();
      const bookingId = doc.id;

      const row = document.createElement("tr");

      // Format date and time
      const dateTime = booking.date && booking.time ?
        `${booking.date} at ${booking.time}` :
        (booking.timestamp ?
          new Date(booking.timestamp.toDate()).toLocaleString() :
          'No date available');

      // Status class
      const statusClass = `status-${booking.status || 'pending'}`;

      row.innerHTML = `
        <td>${booking.name || 'N/A'}</td>
        <td>${booking.phone || 'N/A'}</td>
        <td>
          <strong>From:</strong> ${booking.pickup || 'N/A'}<br>
          <strong>To:</strong> ${booking.drop || 'N/A'}
        </td>
        <td>${dateTime}</td>
        <td>${booking.vehicleType || 'N/A'}</td>
        <td class="${statusClass}">${booking.status || 'pending'}</td>
        <td>${booking.driver ? booking.driver.name : 'Not assigned'}</td>
        <td>
          ${booking.status === 'pending' ?
            `<button class="assign-btn" data-id="${bookingId}">Assign Driver</button>` : ''}
          ${booking.status === 'assigned' ?
            `<button class="notify-btn" data-id="${bookingId}">Send Notifications</button>` : ''}
        </td>
      `;

      bookingsTableBody.appendChild(row);
    });

    // Add event listeners to the assign driver buttons
    document.querySelectorAll('.assign-btn').forEach(button => {
      button.addEventListener('click', () => openAssignDriverModal(button.dataset.id));
    });

    // Add event listeners to the notify buttons
    document.querySelectorAll('.notify-btn').forEach(button => {
      button.addEventListener('click', () => openNotificationModal(button.dataset.id));
    });

  } catch (error) {
    console.error("Error loading bookings:", error);
    bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center;">Error loading bookings: ${error.message}</td>
      </tr>
    `;
  }
}

// Open the assign driver modal
async function openAssignDriverModal(bookingId) {
  try {
    // Get the booking details
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      alert("Booking not found!");
      return;
    }

    const booking = bookingSnap.data();

    // Set the booking ID in the hidden input
    bookingIdInput.value = bookingId;

    // Display booking details in the modal
    bookingDetailsElement.innerHTML = `
      <p><strong>Customer:</strong> ${booking.name}</p>
      <p><strong>Phone:</strong> ${booking.phone}</p>
      <p><strong>Pickup:</strong> ${booking.pickup}</p>
      <p><strong>Drop:</strong> ${booking.drop}</p>
      <p><strong>Date & Time:</strong> ${booking.date} at ${booking.time}</p>
      <p><strong>Vehicle Type:</strong> ${booking.vehicleType}</p>
    `;

    // Show the modal
    assignDriverModal.style.display = "block";
  } catch (error) {
    console.error("Error opening assign driver modal:", error);
    alert("Error loading booking details: " + error.message);
  }
}

// Open the notification modal
async function openNotificationModal(bookingId) {
  try {
    // Get the booking details
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      alert("Booking not found!");
      return;
    }

    const booking = bookingSnap.data();

    // Set the booking ID in the hidden input
    notificationBookingIdInput.value = bookingId;

    // Display booking details in the modal
    notificationBookingDetailsElement.innerHTML = `
      <p><strong>Customer:</strong> ${booking.name}</p>
      <p><strong>Phone:</strong> ${booking.phone}</p>
      <p><strong>Pickup:</strong> ${booking.pickup}</p>
      <p><strong>Drop:</strong> ${booking.drop}</p>
      <p><strong>Date & Time:</strong> ${booking.date} at ${booking.time}</p>
      <p><strong>Vehicle Type:</strong> ${booking.vehicleType}</p>
      <p><strong>Driver:</strong> ${booking.driver ? booking.driver.name : 'Not assigned'}</p>
      <p><strong>Driver Phone:</strong> ${booking.driver ? booking.driver.phone : 'N/A'}</p>
    `;

    // Pre-populate email templates
    const customerEmailTemplate = `Dear ${booking.name},

Your booking with Mayil Travels has been confirmed with the following details:

Pickup: ${booking.pickup}
Drop: ${booking.drop}
Date: ${booking.date}
Time: ${booking.time}
Vehicle: ${booking.vehicleType}

Your driver details:
Name: ${booking.driver ? booking.driver.name : '[Driver name will be updated soon]'}
Phone: ${booking.driver ? booking.driver.phone : '[Driver phone will be updated soon]'}
Vehicle: ${booking.driver ? booking.driver.vehicleDetails : '[Vehicle details will be updated soon]'}

For any queries, please contact our customer support at +91 98765 43210.

Thank you for choosing Mayil Travels!

Best regards,
Mayil Travels Team`;

    const driverEmailTemplate = `Dear ${booking.driver ? booking.driver.name : '[Driver]'},

You have been assigned a new ride with the following details:

Customer: ${booking.name}
Customer Phone: ${booking.phone}
Pickup Location: ${booking.pickup}
Drop Location: ${booking.drop}
Date: ${booking.date}
Time: ${booking.time}
Vehicle Type: ${booking.vehicleType}

Please ensure timely arrival and maintain our service standards.

For any assistance, contact the dispatch team at +91 98765 43210.

Thank you,
Mayil Travels Management`;

    customerEmailBody.value = customerEmailTemplate;
    driverEmailBody.value = driverEmailTemplate;

    // Update the preview
    customerEmailPreview.innerHTML = customerEmailTemplate.replace(/\n/g, '<br>');
    driverEmailPreview.innerHTML = driverEmailTemplate.replace(/\n/g, '<br>');

    // Show the modal
    notificationModal.style.display = "block";
  } catch (error) {
    console.error("Error opening notification modal:", error);
    alert("Error loading booking details: " + error.message);
  }
}

// Form submissions
assignDriverForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  const bookingId = bookingIdInput.value;
  const driverName = document.getElementById("driverName").value;
  const driverPhone = document.getElementById("driverPhone").value;
  const driverEmail = document.getElementById("driverEmail").value;
  const vehicleDetails = document.getElementById("vehicleDetails").value;

  try {
    // Update the booking document
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
      status: "assigned",
      driver: {
        name: driverName,
        phone: driverPhone,
        email: driverEmail,
        vehicleDetails: vehicleDetails
      },
      updatedAt: serverTimestamp()
    });

    alert("Driver assigned successfully!");
    assignDriverModal.style.display = "none";

    // Reset form
    assignDriverForm.reset();

    // Reload bookings
    await loadBookings();
  } catch (error) {
    console.error("Error assigning driver:", error);
    alert("Error assigning driver: " + error.message);
  }
});

// Send notifications form
sendNotificationForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const bookingId = notificationBookingIdInput.value;

  try {
    // In a real application, you would send emails here
    // For this demo, we'll simulate email sending

    // Update the booking document to mark notifications as sent
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, {
      notificationsSent: true,
      notificationTimestamp: serverTimestamp()
    });

    alert("Notifications sent successfully!");
    notificationModal.style.display = "none";

    // Reset form
    sendNotificationForm.reset();
  } catch (error) {
    console.error("Error sending notifications:", error);
    alert("Error sending notifications: " + error.message);
  }
});

// Close modal functionality
closeModalButtons.forEach(button => {
  button.addEventListener("click", function() {
    assignDriverModal.style.display = "none";
    notificationModal.style.display = "none";
  });
});

// Close modals when clicking outside
window.addEventListener("click", function(event) {
  if (event.target === assignDriverModal) {
    assignDriverModal.style.display = "none";
  }
  if (event.target === notificationModal) {
    notificationModal.style.display = "none";
  }
});

// Button event listeners
loadBookingsBtn.addEventListener("click", () => loadBookings());
pendingBookingsBtn.addEventListener("click", () => loadBookings("pending"));
assignedBookingsBtn.addEventListener("click", () => loadBookings("assigned"));

// Load bookings when the page loads
document.addEventListener("DOMContentLoaded", () => {
  loadBookings();
});
