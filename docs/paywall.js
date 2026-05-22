/* =============================================
   PAYWALL LOGIC — paste into your project
   ============================================= */

// ── CONFIG ──────────────────────────────────
// Change this number to set how many FREE quizzes a student gets per exam
var FREE_QUIZ_LIMIT = 5;

// Prices shown to the user (display only — actual charge happens in Razorpay)
var PLANS = {
  upsc:    { name: "UPSC / State PSC",   emoji: "🏛️", monthly: "₹199", yearly: "₹999",   monthlyAmt: 19900, yearlyAmt: 99900 },
  banking: { name: "Banking / SSC",      emoji: "🏦", monthly: "₹149", yearly: "₹749",   monthlyAmt: 14900, yearlyAmt: 74900 },
  jee:     { name: "JEE",               emoji: "⚛️", monthly: "₹199", yearly: "₹999",   monthlyAmt: 19900, yearlyAmt: 99900 },
  neet:    { name: "NEET",              emoji: "🩺", monthly: "₹199", yearly: "₹999",   monthlyAmt: 19900, yearlyAmt: 99900 },
  defence: { name: "Defence",           emoji: "🛡️", monthly: "₹149", yearly: "₹749",   monthlyAmt: 14900, yearlyAmt: 74900 },
  all:     { name: "All Exams Bundle",  emoji: "🎯", monthly: "₹399", yearly: "₹1,999", monthlyAmt: 39900, yearlyAmt: 199900 }
};

// ── STATE ────────────────────────────────────
var selectedPlan = "all";   // which plan card is highlighted
var billingYearly = false;  // monthly vs yearly toggle

// ── QUIZ GATE ────────────────────────────────
// Call this BEFORE starting any quiz.
// Pass the exam type string: "upsc", "banking", "jee", "neet", "defence"
// Returns true = quiz can start. Returns false = paywall shown, stop quiz.
function canStartQuiz(examType) {
  // If the student already paid, let them through
  if (isPremiumUser(examType)) return true;

  // Read how many quizzes they've done so far
  var usage = JSON.parse(localStorage.getItem("quizUsage") || "{}");
  var count  = usage[examType] || 0;

  if (count >= FREE_QUIZ_LIMIT) {
    // They've hit the limit — show the paywall
    showPaywall(examType);
    return false;
  }

  // Still within the free limit — record this quiz and allow it
  usage[examType] = count + 1;
  localStorage.setItem("quizUsage", JSON.stringify(usage));
  return true;
}

// ── PREMIUM CHECK ────────────────────────────
// Returns true if the student has an active paid plan for this exam
function isPremiumUser(examType) {
  var subs = JSON.parse(localStorage.getItem("premiumSubs") || "[]");
  var now = Date.now();

  return subs.some(function(s) {
    if (now > s.expiresAt) return false;        // expired
    return s.plan === "all" || s.plan === examType; // right plan
  });
}

// ── SHOW PAYWALL ─────────────────────────────
// This opens the modal. examType = which exam triggered it.
function showPaywall(examType) {
  selectedPlan = examType;

  var usage   = JSON.parse(localStorage.getItem("quizUsage") || "{}");
  var used    = usage[examType] || FREE_QUIZ_LIMIT;
  var examName = PLANS[examType] ? PLANS[examType].name : "this exam";

  // Update header text
  document.getElementById("pw-title").textContent =
    "You've completed " + used + " free " + examName + " quizzes!";

  // Update the used-quizzes bar
  document.getElementById("pw-used-text").textContent =
    used + " of " + FREE_QUIZ_LIMIT + " free quizzes used · 0 remaining";

  // Highlight the relevant plan card automatically
  selectPlan(examType === "defence" ? "all" : examType);

  // Show the overlay
  document.getElementById("paywall-overlay").classList.add("active");
}

// ── HIDE PAYWALL ─────────────────────────────
function closePaywall() {
  document.getElementById("paywall-overlay").classList.remove("active");
}

// ── BILLING TOGGLE ───────────────────────────
function toggleBilling() {
  billingYearly = !billingYearly;
  var btn = document.getElementById("pw-toggle");
  btn.classList.toggle("yearly", billingYearly);

  // Update all price displays
  var suffix = billingYearly ? "/yr" : "/mo";
  Object.keys(PLANS).forEach(function(key) {
    var el = document.getElementById("pw-price-" + key);
    if (!el) return;
    var price = billingYearly ? PLANS[key].yearly : PLANS[key].monthly;
    el.innerHTML = price + '<span>' + suffix + '</span>';
  });
}

// ── SELECT A PLAN CARD ───────────────────────
function selectPlan(planKey) {
  selectedPlan = planKey;

  // Remove highlight from all cards
  document.querySelectorAll(".pw-plan-card, .pw-all-plan").forEach(function(el) {
    el.classList.remove("selected");
  });

  // Highlight the chosen card
  var chosen = document.getElementById("pw-card-" + planKey);
  if (chosen) chosen.classList.add("selected");
}

// ── PAY BUTTON ───────────────────────────────
// This runs when the student clicks "Unlock Now"
function initiatePayment() {
     // ── CHECK IF STUDENT IS LOGGED IN FIRST ──
  var session = JSON.parse(localStorage.getItem('sb-iugqkcvnzcvyvvbeistr-auth-token') || 'null');
  if (!session) {
    alert("⚠️ Please log in first to purchase a plan!\n\nClick OK to go to the login page.");
    window.location.href = "login.html";
    return;
  }
  var plan   = PLANS[selectedPlan];
  var amount = billingYearly ? plan.yearlyAmt : plan.monthlyAmt;
  var period = billingYearly ? "yearly" : "monthly";

  // ── STEP A: Remove this alert and replace with Razorpay code (Step 3) ──
  var options = {
  key: "rzp_live_SsOyiuRGPrjAc5",
  amount: amount,
  currency: "INR",
  name: "Competitive Exams",
  description: plan.name + " (" + period + ")",
  image: "https://competitive-exams.github.io/examprep/favicon.ico",
  handler: function(response) {
  unlockPremium(selectedPlan, period, response.razorpay_payment_id);
    alert("🎉 Payment successful! Welcome to " + plan.name + " Pro!\nPayment ID: " + response.razorpay_payment_id);
  },
  prefill: {
    name: "",
    email: "",
    contact: ""
  },
  notes: {
    plan: selectedPlan,
    period: period
  },
  theme: {
    color: "#7c3aed"
  },
  modal: {
    ondismiss: function() {
      console.log("Payment cancelled by user");
    }
  }
};
var rzp = new Razorpay(options);
rzp.open();
  // ── STEP B: After Razorpay confirms payment, call this: ──
  // unlockPremium(selectedPlan, period);
}

// ── UNLOCK AFTER PAYMENT ─────────────────────
// Call this ONLY after your backend confirms the payment is real
function unlockPremium(planKey, period, paymentId) {
  var days    = period === "yearly" ? 365 : 30;
  var expires = Date.now() + days * 24 * 60 * 60 * 1000;

  // Load existing subscriptions (array)
  var subs = JSON.parse(localStorage.getItem("premiumSubs") || "[]");

  // Remove old entry for same plan if exists
  subs = subs.filter(function(s) { return s.plan !== planKey; });

  // Add new subscription
  subs.push({
    plan: planKey,
    period: period,
    expiresAt: expires,
    purchasedAt: Date.now(),
    paymentId: paymentId || 'N/A'
  });

  localStorage.setItem("premiumSubs", JSON.stringify(subs));
  closePaywall();
  alert("🎉 Welcome to " + PLANS[planKey].name + " Pro! You now have unlimited access.");

  // Optional: reload the page so UI updates
  // window.location.reload();
}

// ── CLOSE ON BACKGROUND CLICK ────────────────
document.addEventListener("DOMContentLoaded", function() {
  var overlay = document.getElementById("paywall-overlay");
  if (overlay) {
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) closePaywall();
    });
  }
});
