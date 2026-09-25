firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const $ = (id) => document.getElementById(id);

// If already signed in, skip straight to the dashboard.
auth.onAuthStateChanged((user) => {
  if (user) window.location.href = "dashboard.html";
});

// Prefill with the shared email so people don't have to remember it.
$("email").value = SHARED_LOGIN_EMAIL;

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  const btn = $("login-btn");
  const errorEl = $("login-error");
  errorEl.hidden = true;
  btn.disabled = true;
  btn.textContent = "Opening…";
  try {
    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged above will redirect once this resolves.
  } catch (err) {
    errorEl.textContent = "That email or password didn't work. Try again.";
    errorEl.hidden = false;
    btn.disabled = false;
    btn.textContent = "Open ledger";
  }
});
