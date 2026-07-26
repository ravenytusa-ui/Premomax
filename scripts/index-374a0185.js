const SUPABASE_URL = 'https://zwmgzepftzayzgvgwndp.supabase.co';
const SUPABASE_KEY = `sb_publishable_RFdnWIB4bMs1zz4qkXcdZQ__JL7YmIf`;
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let currentUser = null;
let currentBalance = 0.059;
let taskCount = 0;
let isSignUpMode = false;

document.addEventListener('DOMContentLoaded', async () => {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    checkStatus();
  }

  // Sign In / Sign Up Button
  const btnLogin = document.getElementById('btnLogin');
  if (btnLogin) btnLogin.addEventListener('click', handleAuth);

  // Toggle Toggle Form Mode
  const btnToggleAuth = document.getElementById('btnToggleAuth');
  if (btnToggleAuth) {
    btnToggleAuth.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;

      const heading = document.getElementById('authHeading');
      const subheading = document.getElementById('authSubheading');
      const btn = document.getElementById('btnLogin');
      const toggleText = document.getElementById('toggleText');
      const toggleBtn = document.getElementById('btnToggleAuth');
      const signupFields = document.getElementById('signupFields');
      const retypeField = document.getElementById('retypePassField');
      const msg = document.getElementById('authMsg');

      msg.innerText = "";

      if (isSignUpMode) {
        heading.innerText = "Create Account";
        subheading.innerText = "Fill in your details to get started";
        btn.innerText = "Sign up →";
        toggleText.innerText = "Already have an account?";
        toggleBtn.innerText = "Sign in";
        signupFields.style.display = "block";
        retypeField.style.display = "block";
      } else {
        heading.innerText = "Welcome back";
        subheading.innerText = "Sign in to continue";
        btn.innerText = "Sign in →";
        toggleText.innerText = "Don't have an account?";
        toggleBtn.innerText = "Sign up";
        signupFields.style.display = "none";
        retypeField.style.display = "none";
      }
    });
  }
});

// VALIDATE 3 DEPOSIT INPUT FIELDS
function validateDepositForm() {
  const name = document.getElementById('depName').value.trim();
  const num = document.getElementById('depNumber').value.trim();
  const trx = document.getElementById('depTrx').value.trim();
  const btn = document.getElementById('btnProceed');

  if (name !== "" && num !== "" && trx !== "") {
    btn.disabled = false;
  } else {
    btn.disabled = true;
  }
}

// SUBMIT DEPOSIT & SHOW PENDING
async function submitDeposit() {
  const name = document.getElementById('depName').value;
  const num = document.getElementById('depNumber').value;
  const trx = document.getElementById('depTrx').value;

  const { error } = await supabaseClient
    .from('deposits')
    .insert([{ 
      user_email: currentUser.email, 
      account_name: name,
      account_number: num,
      trx_id: trx, 
      status: 'Pending' 
    }]);

  if (!error) {
    document.getElementById('depositScreen').style.display = 'none';
    document.getElementById('pendingScreen').style.display = 'block';
  } else {
    alert("Error: " + error.message);
  }
}

// AUTH HANDLER
async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const msg = document.getElementById('authMsg');

  if (!email || !password) {
    msg.innerText = "Please enter both email and password.";
    return;
  }

  if (isSignUpMode) {
    const fullName = document.getElementById('authName').value.trim();
    const phone = document.getElementById('authPhone').value.trim();
    const city = document.getElementById('authCity').value.trim();
    const confirmPass = document.getElementById('authConfirmPassword').value.trim();

    if (!fullName || !phone || !city) {
      msg.innerText = "Please fill in all the details.";
      return;
    }

    if (password !== confirmPass) {
      msg.innerText = "Passwords do not match!";
      return;
    }

    msg.style.color = "#d97706";
    msg.innerText = "Creating account...";

    // Sign Up user with additional metadata (Name, Phone, City)
    const { data, error } = await supabaseClient.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phone,
          city: city
        }
      }
    });

    if (error) {
      msg.style.color = "#ef4444";
      msg.innerText = error.message;
    } else {
      currentUser = data.user;
      msg.style.color = "#10b981";
      msg.innerText = "Account created successfully!";
      checkStatus();
    }

  } else {
    // SIGN IN LOGIC
    msg.style.color = "#d97706";
    msg.innerText = "Signing in...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      msg.style.color = "#ef4444";
      msg.innerText = error.message;
    } else {
      currentUser = data.user;
      checkStatus();
    }
  }
}

// STATUS CHECK
async function checkStatus() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('profEmail').value = currentUser.email;

  if (currentUser.user_metadata && currentUser.user_metadata.full_name) {
    document.getElementById('userNameDisplay').innerText = currentUser.user_metadata.full_name;
    document.getElementById('profName').value = currentUser.user_metadata.full_name;
  }

  const { data: deposits } = await supabaseClient
    .from('deposits')
    .select('*')
    .eq('user_email', currentUser.email);

  if (!deposits || deposits.length === 0) {
    document.getElementById('depositScreen').style.display = 'block';
  } else {
    const approved = deposits.some(d => d.status === 'Approved');
    if (approved) {
      document.getElementById('pendingScreen').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
      checkReferrals();

    } else {
      document.getElementById('pendingScreen').style.display = 'block';
    }
 // COPY REFERRAL LINK FUNCTION (Fallback Method)
function copyReferralLink() {
  if (!currentUser) {
    alert("Please login first!");
    return;
  }
  
  const refLink = window.location.origin + window.location.pathname + "?ref=" + encodeURIComponent(currentUser.email);
  
  // Temporary input element banatay hain taake copy 100% kaam kare
  const tempInput = document.createElement("input");
  tempInput.value = refLink;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  
  alert("Referral link copied successfully!");
}
// CHECK REFERRAL COUNT
async function checkReferrals() {
  if (!currentUser) return;

  const { data } = await supabaseClient
    .from('referrals')
    .select('*')
    .eq('referrer_email', currentUser.email);

  if (data) {
    const count = data.length;
    const refText = document.getElementById('referralCountText');
    if (refText) {
      refText.innerText = `Referrals: ${count} Member${count === 1 ? '' : 's'} Added`;
    }
  }
}
}

// TAB NAVIGATION
function switchTab(tabName) {
  const tabs = ['tabHome', 'tabStats', 'tabWallet', 'tabProfile', 'tabTasks'];
  tabs.forEach(t => {
    const el = document.getElementById(t);
    if (el) el.style.display = 'none';
  });

  const activeTab = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  if (activeTab) activeTab.style.display = 'block';
}

// TASK LOGIC
function handleTaskSubmit() {
  const targetWords = "Apple Banana Orange Grape Mango Lemon Peach Cherry Berry Melon";
  const input = document.getElementById('taskInput').value.trim();
  const msg = document.getElementById('taskMsg');

  if (taskCount >= 3) {
    msg.innerText = "Daily task limit reached! (3/3 completed)";
    msg.style.color = "#ef4444";
    return;
  }

  if (input === targetWords) {
    taskCount++;
    currentBalance += 0.003;
    document.getElementById('userBalance').innerText = "$" + currentBalance.toFixed(3);
    document.getElementById('completedTasksCount').innerText = taskCount;
    document.getElementById('taskEarnings').innerText = "$" + (taskCount * 0.003).toFixed(3);
    document.getElementById('taskInput').value = "";
    msg.innerText = `Task ${taskCount} complete! $0.003 added.`;
    msg.style.color = "#10b981";
  } else {
    msg.innerText = "Words do not match! Please copy & paste exactly.";
    msg.style.color = "#ef4444";
  }
}

// WITHDRAW LOGIC (Saves to Supabase & Checks $0.50 Limit)
async function handleWithdraw() {
  const method = document.getElementById('withdrawMethod').value;
  const acc = document.getElementById('withdrawAccount').value;
  const amount = parseFloat(document.getElementById('withdrawAmount').value);

  if (!acc || isNaN(amount)) {
    alert("Please fill all withdrawal details.");
    return;
  }

  // Minimum limit check ($0.50)
  if (amount < 0.50) {
    alert("Minimum withdrawal limit is $0.50!");
    return;
  }

  if (amount > currentBalance) {
    alert("Insufficient balance!");
    return;
  }

  // Save withdrawal request to Supabase
  const { error } = await supabaseClient
    .from('withdrawals')
    .insert([{
      user_email: currentUser.email,
      method: method,
      account_number: acc,
      amount: amount,
      status: 'Pending'
    }]);

  if (error) {
    alert("Error: " + error.message);
  } else {
    currentBalance -= amount;
    document.getElementById('userBalance').innerText = "$" + currentBalance.toFixed(3);
    alert(`Withdrawal request of $${amount} via ${method} submitted successfully!`);
    
    // Clear inputs
    document.getElementById('withdrawAccount').value = "";
    document.getElementById('withdrawAmount').value = "";
  }
}}
  }
}
  }
}

// LOGOUT
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}
