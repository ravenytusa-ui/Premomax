const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let currentUser = null;
let currentBalance = 0.059;
let taskCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    checkStatus();
  }

  const btnLogin = document.getElementById('btnLogin');
  if (btnLogin) btnLogin.addEventListener('click', handleAuth);
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
  }
}

// AUTH HANDLER
async function handleAuth() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const msg = document.getElementById('authMsg');
  
  msg.innerText = "Processing...";
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  
  if (error) {
    const signup = await supabaseClient.auth.signUp({ email, password });
    if (signup.error) {
      msg.innerText = signup.error.message;
    } else {
      currentUser = signup.data.user;
      checkStatus();
    }
  } else {
    currentUser = data.user;
    checkStatus();
  }
}

// STATUS CHECK
async function checkStatus() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('profEmail').value = currentUser.email;

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
    } else {
      document.getElementById('pendingScreen').style.display = 'block';
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

// TASK LOGIC ($0.003 x 3 = $0.009)
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

// WITHDRAW LOGIC
function handleWithdraw() {
  const method = document.getElementById('withdrawMethod').value;
  const acc = document.getElementById('withdrawAccount').value;
  const amount = parseFloat(document.getElementById('withdrawAmount').value);

  if (!acc || isNaN(amount)) {
    alert("Please fill all withdrawal details.");
    return;
  }

  if (amount > currentBalance) {
    alert("Insufficient balance!");
  } else {
    currentBalance -= amount;
    document.getElementById('userBalance').innerText = "$" + currentBalance.toFixed(3);
    alert(`Withdrawal request of $${amount} via ${method} submitted!`);
  }
}

// LOGOUT
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}
