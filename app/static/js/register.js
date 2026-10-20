/**
 * ANTROTHON'27 - REGISTRATION WIZARD & RAZORPAY INTEGRATION
 * 3-Step Tactical Flow:
 * Step 1: Team & Crew Assembly (Team Name, College Name, Track, Leader Details & Notice, Crew Members 4-6)
 * Step 2: Idea Submission Dossier (Idea Title <=100, Summary <=10,000, Description <=50,000, PPT <=10MB)
 * Step 3: Review Manifest & Payment Authorization (Rs. 300)
 */

let currentStep = 1;
const totalSteps = 3;

// Crew Member Management (Min 3 crew + 1 leader = 4 units minimum; max 5 crew + 1 leader = 6 units)
let membersList = [
  { id: 2, name: '', phone: '', email: '', department: '', year: '3rd Year' },
  { id: 3, name: '', phone: '', email: '', department: '', year: '3rd Year' },
  { id: 4, name: '', phone: '', email: '', department: '', year: '3rd Year' }
];

let selectedPptFile = null;

function renderMembersContainer() {
  const container = document.getElementById('members-container');
  if (!container) return;

  container.innerHTML = '';

  membersList.forEach((m, idx) => {
    const memberNum = idx + 2;
    const isOptional = memberNum > 4; // Member 5 and 6 are optional additions
    const card = document.createElement('div');
    card.className = 'member-card';
    card.id = `member-card-${memberNum}`;
    
    card.innerHTML = `
      <div class="member-card-header">
        <span class="member-badge-title">CREW MEMBER #${memberNum} ${isOptional ? '(OPTIONAL UNIT)' : '(REQUIRED UNIT)'}</span>
        ${membersList.length > 3 ? `
          <button type="button" class="btn-remove-member" onclick="removeMember(${idx})">
            ✕ REMOVE
          </button>
        ` : ''}
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Member Full Name <span class="required">*</span></label>
          <input type="text" class="form-control" data-idx="${idx}" data-field="name" value="${escapeHtml(m.name || '')}" placeholder="e.g. Sarah Connor" required>
        </div>
        <div class="form-group">
          <label class="form-label">Member Mobile Number <span class="required">*</span></label>
          <input type="tel" class="form-control" data-idx="${idx}" data-field="phone" value="${escapeHtml(m.phone || '')}" placeholder="10-digit mobile" required>
        </div>
        <div class="form-group">
          <label class="form-label">Member Email ID <span class="required">*</span></label>
          <input type="email" class="form-control" data-idx="${idx}" data-field="email" value="${escapeHtml(m.email || '')}" placeholder="crew@college.edu" required>
        </div>
        <div class="form-group">
          <label class="form-label">Department / Branch</label>
          <input type="text" class="form-control" data-idx="${idx}" data-field="department" value="${escapeHtml(m.department || '')}" placeholder="e.g. Computer Science / IT">
        </div>
        <div class="form-group">
          <label class="form-label">Year of Study</label>
          <select class="form-control" data-idx="${idx}" data-field="year">
            <option value="1st Year" ${m.year === '1st Year' ? 'selected' : ''}>1st Year</option>
            <option value="2nd Year" ${m.year === '2nd Year' ? 'selected' : ''}>2nd Year</option>
            <option value="3rd Year" ${m.year === '3rd Year' ? 'selected' : ''}>3rd Year</option>
            <option value="4th Year" ${m.year === '4th Year' ? 'selected' : ''}>4th Year</option>
            <option value="Postgraduate" ${m.year === 'Postgraduate' ? 'selected' : ''}>Postgraduate</option>
          </select>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach change listeners to update membersList in memory
  container.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const field = e.target.dataset.field;
      if (membersList[idx]) {
        membersList[idx][field] = e.target.value.trim();
      }
    });
  });

  // Update counter badges
  const totalCrew = 1 + membersList.length;
  const countEl = document.getElementById('total-crew-count');
  if (countEl) countEl.textContent = `${totalCrew} / 6 UNITS`;

  const dynamicCountEl = document.getElementById('members-dynamic-count');
  if (dynamicCountEl) dynamicCountEl.textContent = membersList.length;

  const totalUnitsEl = document.getElementById('total-units-badge');
  if (totalUnitsEl) totalUnitsEl.textContent = `${totalCrew} Units`;

  const addBtn = document.getElementById('btn-add-member');
  if (addBtn) {
    if (membersList.length >= 5) {
      addBtn.disabled = true;
      addBtn.textContent = 'MAX TEAM CAPACITY REACHED (6)';
    } else {
      addBtn.disabled = false;
      addBtn.textContent = '+ ADD TEAM MEMBER (UP TO 6)';
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function addMember() {
  if (membersList.length >= 5) {
    alert('Maximum team size is 6 members (1 Leader + 5 Crew Members).');
    return;
  }
  membersList.push({
    id: membersList.length + 2,
    name: '',
    phone: '',
    email: '',
    department: '',
    year: '3rd Year'
  });
  renderMembersContainer();
  if (window.cyberAudio) window.cyberAudio.playTargetLock();
}

function removeMember(idx) {
  if (membersList.length <= 3) {
    alert('Minimum team size is 4 members (1 Leader + 3 Members).');
    return;
  }
  membersList.splice(idx, 1);
  renderMembersContainer();
}

// Step navigation & Team Name validation
let teamNameAvailability = {
  checkedName: '',
  isChecking: false,
  isAvailable: false,
  message: ''
};
let teamNameDebounceTimer = null;

async function verifyTeamName(name, silent = false) {
  const cleanName = (name || '').trim();
  const badgeEl = document.getElementById('team-name-badge');
  const iconEl = document.getElementById('team-name-icon');
  const feedbackEl = document.getElementById('team-name-feedback');
  const defaultHintEl = document.getElementById('team-name-default-hint');
  const inputEl = document.getElementById('team_name');

  if (!cleanName) {
    teamNameAvailability = { checkedName: '', isChecking: false, isAvailable: false, message: '' };
    if (badgeEl) badgeEl.style.display = 'none';
    if (iconEl) iconEl.style.display = 'none';
    if (feedbackEl) feedbackEl.style.display = 'none';
    if (defaultHintEl) defaultHintEl.style.display = 'block';
    if (inputEl) {
      inputEl.style.borderColor = '';
      inputEl.style.boxShadow = '';
    }
    return false;
  }

  // If already checked this exact name (case-insensitively)
  if (teamNameAvailability.checkedName.toLowerCase() === cleanName.toLowerCase() && !teamNameAvailability.isChecking) {
    return teamNameAvailability.isAvailable;
  }

  teamNameAvailability.isChecking = true;
  if (!silent) {
    if (badgeEl) {
      badgeEl.style.display = 'inline-block';
      badgeEl.style.color = 'var(--term-amber)';
      badgeEl.textContent = '[CHECKING CALLSIGN...]';
    }
    if (iconEl) {
      iconEl.style.display = 'block';
      iconEl.style.color = 'var(--term-amber)';
      iconEl.innerHTML = '&#9881;';
    }
  }

  try {
    const res = await fetch(`/api/check-team-name?name=${encodeURIComponent(cleanName)}`);
    const data = await res.json();
    teamNameAvailability.checkedName = cleanName;
    teamNameAvailability.isChecking = false;
    teamNameAvailability.isAvailable = !!data.available;
    teamNameAvailability.message = data.message || '';

    if (defaultHintEl) defaultHintEl.style.display = 'none';
    if (feedbackEl) feedbackEl.style.display = 'block';
    if (badgeEl) badgeEl.style.display = 'inline-block';
    if (iconEl) iconEl.style.display = 'block';

    if (data.available) {
      // Available
      if (badgeEl) {
        badgeEl.style.color = '#00ff66';
        badgeEl.textContent = '[CALLSIGN AVAILABLE]';
      }
      if (iconEl) {
        iconEl.style.color = '#00ff66';
        iconEl.innerHTML = '&#10004;';
      }
      if (feedbackEl) {
        feedbackEl.style.color = '#00ff66';
        feedbackEl.innerHTML = `&#10004; <strong>${escapeHtml(cleanName)}</strong> is available for deployment.`;
      }
      if (inputEl) {
        inputEl.style.borderColor = '#00ff66';
        inputEl.style.boxShadow = '0 0 10px rgba(0, 255, 102, 0.2)';
      }
      return true;
    } else {
      // Taken / Reserved
      if (badgeEl) {
        badgeEl.style.color = 'var(--term-red)';
        badgeEl.textContent = '[CALLSIGN TAKEN]';
      }
      if (iconEl) {
        iconEl.style.color = 'var(--term-red)';
        iconEl.innerHTML = '&#10006;';
      }
      if (feedbackEl) {
        feedbackEl.style.color = 'var(--term-red)';
        feedbackEl.innerHTML = `&#10006; <strong>${escapeHtml(cleanName)}</strong> is already taken by another team (team names are unique & case-insensitive). Please choose a different team name.`;
      }
      if (inputEl) {
        inputEl.style.borderColor = 'var(--term-red)';
        inputEl.style.boxShadow = '0 0 10px rgba(255, 208, 0, 0.3)';
      }
      return false;
    }
  } catch (err) {
    console.error('Error verifying team name:', err);
    teamNameAvailability.isChecking = false;
    return true; // Fall back to server-side validation
  }
}

function setupTeamNameValidator() {
  const teamNameInput = document.getElementById('team_name');
  if (!teamNameInput) return;

  teamNameInput.addEventListener('input', (e) => {
    clearTimeout(teamNameDebounceTimer);
    const val = e.target.value.trim();
    if (!val) {
      verifyTeamName('');
      return;
    }
    teamNameDebounceTimer = setTimeout(() => {
      verifyTeamName(val);
    }, 350);
  });

  teamNameInput.addEventListener('blur', (e) => {
    clearTimeout(teamNameDebounceTimer);
    const val = e.target.value.trim();
    if (val) {
      verifyTeamName(val);
    }
  });
}

// Step navigation
async function goToStep(step) {
  if (step > currentStep) {
    const isValid = await validateCurrentStep(currentStep);
    if (!isValid) return;
  }

  currentStep = step;
  document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`form-step-${step}`)?.classList.add('active');

  // Update wizard progress bar
  const progressPercent = ((step - 1) / (totalSteps - 1)) * 100;
  const progressBar = document.getElementById('wizard-progress-bar');
  if (progressBar) progressBar.style.width = `${progressPercent}%`;

  document.querySelectorAll('.step-node').forEach((node, idx) => {
    const nodeStep = idx + 1;
    node.classList.remove('active', 'completed');
    if (nodeStep === step) {
      node.classList.add('active');
    } else if (nodeStep < step) {
      node.classList.add('completed');
    }
  });

  if (step === 3) {
    populateReviewSummary();
  }

  window.scrollTo({ top: 140, behavior: 'smooth' });
}

async function validateCurrentStep(step) {
  if (step === 1) {
    const teamNameInput = document.getElementById('team_name');
    const teamName = teamNameInput?.value.trim();
    const collegeName = document.getElementById('college_name')?.value.trim();
    const track = document.getElementById('track')?.value;
    const leaderName = document.getElementById('leader_name')?.value.trim();
    const leaderPhone = document.getElementById('leader_phone')?.value.trim();
    const leaderEmail = document.getElementById('leader_email')?.value.trim();

    if (!teamName) {
      alert('Please enter your Team Name.');
      teamNameInput?.focus();
      return false;
    }

    // Verify team name uniqueness (case-insensitive)
    const isAvailable = await verifyTeamName(teamName);
    if (!isAvailable) {
      alert(`Team name "${teamName}" is already taken by another team.\n\nTeam names must be strictly unique (case-insensitive) so that any miscommunication will not occur. Please enter a different team name.`);
      teamNameInput?.focus();
      return false;
    }

    if (!collegeName) {
      alert('Please enter your College / Institution Name.');
      document.getElementById('college_name')?.focus();
      return false;
    }
    if (!track) {
      alert('Please select an Operational Hackathon Track.');
      document.getElementById('track')?.focus();
      return false;
    }
    if (!leaderName) {
      alert('Please enter the Team Leader Name.');
      document.getElementById('leader_name')?.focus();
      return false;
    }
    if (!leaderPhone || leaderPhone.length < 10) {
      alert('Please provide a valid 10-digit Mobile Number for the Team Leader.');
      document.getElementById('leader_phone')?.focus();
      return false;
    }
    if (!leaderEmail || !leaderEmail.includes('@')) {
      alert('Please provide a valid Email Address for the Team Leader.');
      document.getElementById('leader_email')?.focus();
      return false;
    }

    // Validate mandatory crew members
    for (let i = 0; i < membersList.length; i++) {
      const m = membersList[i];
      const memberNum = i + 2;
      if (!m.name) {
        alert(`Please enter the Full Name for Crew Member #${memberNum}.`);
        return false;
      }
      if (!m.phone || m.phone.length < 10) {
        alert(`Please enter a valid 10-digit Mobile Number for Crew Member #${memberNum}.`);
        return false;
      }
      if (!m.email || !m.email.includes('@')) {
        alert(`Please enter a valid Email ID for Crew Member #${memberNum}.`);
        return false;
      }
    }
  } else if (step === 2) {
    const ideaTitle = document.getElementById('idea_title')?.value.trim();
    const ideaSummary = document.getElementById('idea_summary')?.value.trim();
    const ideaDesc = document.getElementById('idea_description')?.value.trim();

    if (!ideaTitle) {
      alert('Please provide an Idea Title.');
      document.getElementById('idea_title')?.focus();
      return false;
    }
    if (ideaTitle.length > 100) {
      alert(`Idea Title exceeds 100 characters limit (Current: ${ideaTitle.length}). Please shorten it.`);
      document.getElementById('idea_title')?.focus();
      return false;
    }

    if (!ideaSummary) {
      alert('Please provide an Abstract / Summary of your proposal.');
      document.getElementById('idea_summary')?.focus();
      return false;
    }
    if (ideaSummary.length > 10000) {
      alert(`Abstract exceeds 10,000 characters limit (Current: ${ideaSummary.length}).`);
      document.getElementById('idea_summary')?.focus();
      return false;
    }

    if (!ideaDesc) {
      alert('Please provide an Idea Description.');
      document.getElementById('idea_description')?.focus();
      return false;
    }
    if (ideaDesc.length > 50000) {
      alert(`Idea Description exceeds 50,000 characters limit (Current: ${ideaDesc.length}).`);
      document.getElementById('idea_description')?.focus();
      return false;
    }

    const pptInput = document.getElementById('idea_ppt');
    if (!selectedPptFile && (!pptInput || !pptInput.files || pptInput.files.length === 0)) {
      alert('Please upload your Idea Presentation PPT (.pptx, .ppt, or .pdf up to 10MB).');
      return false;
    }
  }
  return true;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function handleFileSelection(file) {
  const errorEl = document.getElementById('file-error-msg');
  const labelEl = document.getElementById('file-upload-label');
  const infoEl = document.getElementById('file-upload-info');
  const dropZone = document.getElementById('file-drop-zone');

  if (!file) return;

  const validExtensions = ['.ppt', '.pptx', '.pdf'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();

  if (!validExtensions.includes(ext)) {
    if (errorEl) {
      errorEl.textContent = 'Invalid file format. Please upload a .pptx, .ppt, or .pdf presentation.';
      errorEl.style.display = 'block';
    }
    dropZone?.classList.remove('has-file');
    selectedPptFile = null;
    return;
  }

  // 10MB limit
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    if (errorEl) {
      errorEl.textContent = `File size (${formatBytes(file.size)}) exceeds the maximum allowed limit of 10MB.`;
      errorEl.style.display = 'block';
    }
    dropZone?.classList.remove('has-file');
    selectedPptFile = null;
    return;
  }

  if (errorEl) errorEl.style.display = 'none';
  selectedPptFile = file;

  if (labelEl) labelEl.textContent = `Attached: ${file.name}`;
  if (infoEl) infoEl.textContent = `Size: ${formatBytes(file.size)} &bull; Ready for upload`;
  dropZone?.classList.add('has-file');

  if (window.cyberAudio) window.cyberAudio.playClick();
}

function setupCharacterCounters() {
  const counters = [
    { inputId: 'idea_title', counterId: 'char-count-title', max: 100 },
    { inputId: 'idea_summary', counterId: 'char-count-summary', max: 10000 },
    { inputId: 'idea_description', counterId: 'char-count-desc', max: 50000 }
  ];

  counters.forEach(({ inputId, counterId, max }) => {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;

    const updateCount = () => {
      const len = input.value.length;
      counter.textContent = `${len.toLocaleString()} / ${max.toLocaleString()} characters`;
      counter.classList.remove('limit-near', 'limit-reached');
      if (len >= max) {
        counter.classList.add('limit-reached');
      } else if (len >= max * 0.9) {
        counter.classList.add('limit-near');
      }
    };

    input.addEventListener('input', updateCount);
    updateCount();
  });
}

function setupFileUpload() {
  const dropZone = document.getElementById('file-drop-zone');
  const fileInput = document.getElementById('idea_ppt');
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
      fileInput.files = e.dataTransfer.files;
    }
  });
}

function populateReviewSummary() {
  document.getElementById('sum-team-name').textContent = document.getElementById('team_name')?.value || '-';
  document.getElementById('sum-college').textContent = document.getElementById('college_name')?.value || '-';
  document.getElementById('sum-track').textContent = document.getElementById('track')?.value || '-';
  
  const leaderName = document.getElementById('leader_name')?.value || '-';
  const leaderPhone = document.getElementById('leader_phone')?.value || '';
  const leaderEmail = document.getElementById('leader_email')?.value || '';
  document.getElementById('sum-leader').textContent = `${leaderName} (${leaderPhone} | ${leaderEmail})`;

  document.getElementById('sum-crew-size').textContent = `${1 + membersList.length} Units (Leader + ${membersList.length} Crew)`;
  document.getElementById('sum-idea-title').textContent = document.getElementById('idea_title')?.value || '-';
  
  const pptEl = document.getElementById('sum-ppt-file');
  if (selectedPptFile) {
    pptEl.textContent = `${selectedPptFile.name} (${formatBytes(selectedPptFile.size)})`;
  } else {
    pptEl.textContent = 'None attached';
  }
}

// Submitting Registration & Initiating Payment
async function initiateRegistrationAndPayment() {
  const payBtn = document.getElementById('btn-proceed-pay');
  payBtn.disabled = true;
  payBtn.textContent = 'TRANSMITTING CREDENTIALS...';

  const formData = new FormData();
  formData.append('team_name', document.getElementById('team_name').value.trim());
  formData.append('college_name', document.getElementById('college_name').value.trim());
  formData.append('track', document.getElementById('track').value);

  formData.append('leader_name', document.getElementById('leader_name').value.trim());
  formData.append('leader_phone', document.getElementById('leader_phone').value.trim());
  formData.append('leader_email', document.getElementById('leader_email').value.trim());
  formData.append('leader_college', document.getElementById('college_name').value.trim());
  formData.append('leader_department', document.getElementById('leader_department')?.value.trim() || 'General');
  formData.append('leader_year', document.getElementById('leader_year')?.value || '3rd Year');
  formData.append('leader_gender', document.getElementById('leader_gender')?.value || '');

  formData.append('idea_title', document.getElementById('idea_title').value.trim());
  formData.append('idea_summary', document.getElementById('idea_summary').value.trim());
  formData.append('idea_description', document.getElementById('idea_description').value.trim());

  // Members as JSON string
  formData.append('members', JSON.stringify(membersList));
  formData.append('preview_mode', window.IS_PREVIEW_MODE ? 'true' : 'false');

  // File upload
  const fileInput = document.getElementById('idea_ppt');
  const fileToUpload = selectedPptFile || (fileInput && fileInput.files ? fileInput.files[0] : null);
  if (fileToUpload) {
    formData.append('idea_ppt', fileToUpload);
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.message || 'Registration failed. Please check form data.');
      payBtn.disabled = false;
      payBtn.textContent = 'AUTHORIZE REGISTRATION FEE (₹300)';
      if (data.message && data.message.toLowerCase().includes('team name')) {
        goToStep(1);
        const nameInput = document.getElementById('team_name');
        if (nameInput) {
          nameInput.focus();
          verifyTeamName(nameInput.value);
        }
      }
      return;
    }

    const order = data.order;
    const teamCode = data.team_code;

    function launchRazorpayCheckout() {
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "ANTROTHON'27",
        description: order.description || "Team Registration Fee (₹300)",
        order_id: order.order_id,
        handler: async function (response) {
          verifyPaymentOnServer({
            team_code: teamCode,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
        },
        prefill: {
          name: document.getElementById('leader_name').value.trim(),
          email: document.getElementById('leader_email').value.trim(),
          contact: document.getElementById('leader_phone').value.trim()
        },
        theme: {
          color: "#ffd000"
        },
        modal: {
          ondismiss: function() {
            payBtn.disabled = false;
            payBtn.textContent = 'AUTHORIZE REGISTRATION FEE (₹300)';
          }
        }
      };
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert('Payment Failed: ' + (response.error.description || 'Transaction declined.'));
        payBtn.disabled = false;
        payBtn.textContent = 'AUTHORIZE REGISTRATION FEE (₹300)';
      });
      rzp.open();
    }

    if (typeof Razorpay !== 'undefined') {
      launchRazorpayCheckout();
    } else {
      payBtn.textContent = 'CONNECTING TO SECURE GATEWAY...';
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        launchRazorpayCheckout();
      };
      script.onerror = () => {
        alert('Could not load secure Razorpay gateway. Please check your internet connection or disable ad-blockers and try again.');
        payBtn.disabled = false;
        payBtn.textContent = 'AUTHORIZE REGISTRATION FEE (₹300)';
      };
      document.head.appendChild(script);
    }
  } catch (err) {
    console.error(err);
    alert('Network error connecting to payment gateway.');
    payBtn.disabled = false;
    payBtn.textContent = 'AUTHORIZE REGISTRATION FEE (₹300)';
  }
}

async function verifyPaymentOnServer(payload) {
  try {
    const res = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok && result.success) {
      window.location.href = result.redirect_url;
    } else {
      alert(result.message || 'Payment verification failed.');
    }
  } catch (e) {
    alert('Error verifying payment.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderMembersContainer();
  setupCharacterCounters();
  setupFileUpload();
  setupTeamNameValidator();

  const addBtn = document.getElementById('btn-add-member');
  if (addBtn) {
    addBtn.addEventListener('click', addMember);
  }

  const payBtn = document.getElementById('btn-proceed-pay');
  if (payBtn) {
    payBtn.addEventListener('click', initiateRegistrationAndPayment);
  }
});
