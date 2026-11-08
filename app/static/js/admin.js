/**
 * ANTROTHON'27 - ADMIN DASHBOARD SCRIPT
 * Team Dossier Modal, Participant Edit & Status Updates
 */

// Local in-memory registrations cache initialized from dashboard script block
let registrationsData = {};

function initRegistrationsData() {
  try {
    const regJsonEl = document.getElementById('registrations-data');
    if (regJsonEl && regJsonEl.textContent) {
      registrationsData = JSON.parse(regJsonEl.textContent);
    }
  } catch (e) {
    console.warn('Could not parse registrations-data JSON', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRegistrationsData);
} else {
  initRegistrationsData();
}

async function resolveRegistrationData(regIdOrData) {
  if (regIdOrData && typeof regIdOrData === 'object') {
    return regIdOrData;
  }
  const regId = parseInt(regIdOrData, 10);
  if (!regId) return null;

  if (!registrationsData || Object.keys(registrationsData).length === 0) {
    initRegistrationsData();
  }

  if (registrationsData[regId]) {
    return registrationsData[regId];
  }

  // Fallback: fetch directly from API
  try {
    const res = await fetch(`/api/admin/registration/${regId}`);
    const data = await res.json();
    if (res.ok && data.success && data.registration) {
      registrationsData[regId] = data.registration;
      return data.registration;
    }
  } catch (err) {
    console.error('Failed to fetch registration data:', err);
  }

  return null;
}

async function openDossier(regIdOrData) {
  const modal = document.getElementById('dossier-modal');
  if (!modal) return;

  const regData = await resolveRegistrationData(regIdOrData);
  if (!regData) {
    alert('Unable to load registration record for review.');
    return;
  }

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined && val !== null ? val : '-';
  };

  setText('dos-team-code', regData.team_code);
  setText('dos-team-name', regData.team_name);
  setText('dos-track', regData.track);
  setText('dos-project-title', regData.idea_title || regData.project_title || 'N/A');
  setText('dos-project-synopsis', regData.idea_summary || regData.project_synopsis || 'No summary provided.');
  
  const descEl = document.getElementById('dos-idea-description');
  if (descEl) {
    descEl.textContent = regData.idea_description || 'No detailed description provided.';
  }

  const pptFilenameEl = document.getElementById('dos-ppt-filename');
  const pptDownloadLink = document.getElementById('dos-ppt-download');
  if (regData.idea_ppt_filename || regData.idea_ppt_path) {
    if (pptFilenameEl) pptFilenameEl.textContent = regData.idea_ppt_filename || 'Cloud Presentation';
    if (pptDownloadLink) {
      pptDownloadLink.style.display = 'inline-block';
      pptDownloadLink.href = regData.idea_ppt_path || '#';
      pptDownloadLink.target = '_blank';
    }
  } else {
    if (pptFilenameEl) pptFilenameEl.textContent = 'None attached';
    if (pptDownloadLink) pptDownloadLink.style.display = 'none';
  }

  // Leader
  setText('dos-leader-name', regData.leader_name);
  setText('dos-leader-email', regData.leader_email);
  setText('dos-leader-phone', regData.leader_phone);
  setText('dos-leader-college', regData.college_name || regData.leader_college);
  const leaderTags = [];
  if (regData.leader_degree) leaderTags.push(regData.leader_degree);
  if (regData.leader_department) leaderTags.push(regData.leader_department);
  let deptText = leaderTags.join(' - ');
  if (regData.leader_year || regData.leader_gender) {
    deptText += ` (${[regData.leader_year, regData.leader_gender].filter(Boolean).join(' • ')})`;
  }
  setText('dos-leader-dept', deptText || '-');

  // Payment
  setText('dos-payment-status', (regData.payment_status || '').toUpperCase());
  setText('dos-payment-id', regData.razorpay_payment_id || 'N/A');
  setText('dos-order-id', regData.razorpay_order_id || 'N/A');

  // Members list
  const membersTbody = document.getElementById('dos-members-tbody');
  if (membersTbody) {
    membersTbody.innerHTML = '';
    const members = regData.members || [];
    
    if (members.length === 0) {
      membersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--term-steel);">No additional members recorded</td></tr>';
    } else {
      members.forEach((m, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight:600; color:var(--term-cyan); font-family:var(--font-tactical);">Unit 0${idx + 2}</td>
          <td><strong>${escapeHtml(m.name || '-')}</strong></td>
          <td>${escapeHtml(m.email || '-')}<br><small style="color:var(--term-steel);">${escapeHtml(m.phone || '-')}</small></td>
          <td>${escapeHtml(m.degree || '')}${m.degree && m.department ? ' - ' : ''}${escapeHtml(m.department || '')}<br><small style="color:var(--term-steel);">${escapeHtml(m.year || '')}${m.gender ? ' • ' + escapeHtml(m.gender) : ''}</small></td>
        `;
        membersTbody.appendChild(tr);
      });
    }
  }

  // Update Status selector
  const statusSelect = document.getElementById('dos-status-select');
  if (statusSelect) {
    statusSelect.value = regData.status || 'submitted';
  }

  // Hook save button
  const saveBtn = document.getElementById('btn-save-dossier-status');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = 'COMMITTING...';
      try {
        const res = await fetch(`/api/admin/registration/${regData.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusSelect ? statusSelect.value : 'submitted' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Status updated successfully.');
          window.location.reload();
        } else {
          alert('Failed to update status.');
          saveBtn.disabled = false;
          saveBtn.textContent = 'UPDATE PROTOCOL STATUS';
        }
      } catch (e) {
        alert('Network error.');
        saveBtn.disabled = false;
        saveBtn.textContent = 'UPDATE PROTOCOL STATUS';
      }
    };
  }

  // Hook delete button in modal
  const deleteBtn = document.getElementById('btn-delete-dossier');
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      deleteRegistration(regData.id, regData.team_name, regData.team_code);
    };
  }

  modal.classList.add('open');
}

async function deleteRegistration(regId, teamName, teamCode) {
  if (!teamName || !teamCode) {
    const regData = await resolveRegistrationData(regId);
    if (regData) {
      teamName = regData.team_name;
      teamCode = regData.team_code;
    }
  }
  teamName = teamName || 'Team';
  teamCode = teamCode || `ID #${regId}`;

  const confirmMsg = `PERMANENT PURGE CONFIRMATION:\n\nAre you sure you want to delete registration for:\nTeam: ${teamName} (${teamCode})\n\nThis will permanently delete team details, leader and crew members, and uploaded dossiers. This action cannot be undone.\n\nProceed?`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/admin/registration/${regId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(data.message || 'Registration successfully purged.');
      window.location.reload();
    } else {
      alert(data.detail || data.message || 'Failed to delete registration.');
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Network error while attempting to delete registration.');
  }
}

function closeDossier() {
  document.getElementById('dossier-modal')?.classList.remove('open');
}

/* =====================================================================
   EDIT PARTICIPANT DOSSIER LOGIC
   ===================================================================== */
let editMembersList = [];
let currentEditingRegId = null;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function openEditModal(regIdOrData) {
  const modal = document.getElementById('edit-modal');
  if (!modal) return;

  const regData = await resolveRegistrationData(regIdOrData);
  if (!regData) {
    alert('Unable to load registration record for editing.');
    return;
  }

  currentEditingRegId = regData.id;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : '';
  };
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined && val !== null ? val : '-';
  };

  setText('edit-team-code-title', regData.team_code);
  setVal('edit-team-name', regData.team_name);
  setVal('edit-college-name', regData.college_name || regData.leader_college);
  setVal('edit-track', regData.track);

  // Leader
  setVal('edit-leader-name', regData.leader_name);
  setVal('edit-leader-phone', regData.leader_phone);
  setVal('edit-leader-email', regData.leader_email);
  setVal('edit-leader-degree', regData.leader_degree);
  setVal('edit-leader-year', regData.leader_year || '3rd Year');
  setVal('edit-leader-gender', regData.leader_gender);
  setVal('edit-leader-dept', regData.leader_department);
  setVal('edit-leader-id', regData.leader_id_number);

  // Idea
  setVal('edit-idea-title', regData.idea_title || regData.project_title);
  setVal('edit-idea-summary', regData.idea_summary || regData.project_synopsis);
  setVal('edit-idea-description', regData.idea_description);
  
  // PPT / Drive URL
  setVal('edit-ppt-filename', regData.idea_ppt_filename);
  const pptPathInput = document.getElementById('edit-ppt-path');
  if (pptPathInput) {
    pptPathInput.value = regData.idea_ppt_path || '';
    
    const testPptLink = document.getElementById('edit-ppt-test-link');
    if (testPptLink) {
      if (regData.idea_ppt_path) {
        testPptLink.href = regData.idea_ppt_path;
        testPptLink.style.display = 'inline-block';
      } else {
        testPptLink.style.display = 'none';
      }
    }

    // Auto-update test link as input changes
    pptPathInput.oninput = () => {
      if (testPptLink) {
        if (pptPathInput.value.trim()) {
          testPptLink.href = pptPathInput.value.trim();
          testPptLink.style.display = 'inline-block';
        } else {
          testPptLink.style.display = 'none';
        }
      }
    };
  }

  // Status & Payment
  setVal('edit-status', regData.status || 'submitted');
  setVal('edit-payment-status', regData.payment_status || 'paid');
  setVal('edit-amount-paid', regData.amount_paid !== undefined ? regData.amount_paid : 300);
  setVal('edit-admin-notes', regData.admin_notes);

  // Members
  editMembersList = Array.isArray(regData.members) ? JSON.parse(JSON.stringify(regData.members)) : [];
  renderEditMembers();

  modal.classList.add('open');
}

function renderEditMembers() {
  const container = document.getElementById('edit-members-container');
  if (!container) return;
  container.innerHTML = '';

  if (editMembersList.length === 0) {
    container.innerHTML = '<p style="color:var(--term-steel); font-size:12px; margin:4px 0;">No additional crew members recorded.</p>';
    return;
  }

  editMembersList.forEach((m, idx) => {
    const card = document.createElement('div');
    card.className = 'hud-panel';
    card.style.cssText = 'padding:12px; margin-bottom:12px; background:rgba(0,0,0,0.35); border-color:var(--term-border); border-radius:3px;';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-family:var(--font-tactical); font-size:11px; color:var(--term-red); font-weight:700;">
          CREW MEMBER #${idx + 2} ${idx >= 3 ? '(OPTIONAL UNIT)' : '(REQUIRED UNIT)'}
        </span>
        <button type="button" onclick="removeEditMember(${idx})" style="background:none; border:none; color:#ff6b6b; cursor:pointer; font-size:11px; font-family:var(--font-tactical);">
          ✕ REMOVE
        </button>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:10px;">
        <div>
          <label style="font-size:10px; color:var(--term-steel); display:block; margin-bottom:3px;">Full Name *</label>
          <input type="text" class="form-control" style="font-size:12px; padding:6px 10px; width:100%; box-sizing:border-box;" value="${escapeHtml(m.name || '')}" onchange="editMembersList[${idx}].name = this.value">
        </div>
        <div>
          <label style="font-size:10px; color:var(--term-steel); display:block; margin-bottom:3px;">Mobile *</label>
          <input type="tel" class="form-control" style="font-size:12px; padding:6px 10px; width:100%; box-sizing:border-box;" value="${escapeHtml(m.phone || '')}" onchange="editMembersList[${idx}].phone = this.value">
        </div>
        <div>
          <label style="font-size:10px; color:var(--term-steel); display:block; margin-bottom:3px;">Email *</label>
          <input type="email" class="form-control" style="font-size:12px; padding:6px 10px; width:100%; box-sizing:border-box;" value="${escapeHtml(m.email || '')}" onchange="editMembersList[${idx}].email = this.value">
        </div>
        <div>
          <label style="font-size:10px; color:var(--term-steel); display:block; margin-bottom:3px;">Gender</label>
          <select class="form-control" style="font-size:12px; padding:6px 10px; width:100%; box-sizing:border-box;" onchange="editMembersList[${idx}].gender = this.value">
            <option value="">-- Gender --</option>
            <option value="Male" ${m.gender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${m.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other" ${m.gender === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px; color:var(--term-steel); display:block; margin-bottom:3px;">Degree</label>
          <select class="form-control" style="font-size:12px; padding:6px 10px; width:100%; box-sizing:border-box;" onchange="editMembersList[${idx}].degree = this.value">
            <option value="">-- Degree --</option>
            <option value="B.E / B.Tech" ${m.degree === 'B.E / B.Tech' ? 'selected' : ''}>B.E / B.Tech</option>
            <option value="B.Sc" ${m.degree === 'B.Sc' ? 'selected' : ''}>B.Sc</option>
            <option value="BCA" ${m.degree === 'BCA' ? 'selected' : ''}>BCA</option>
            <option value="B.Com" ${m.degree === 'B.Com' ? 'selected' : ''}>B.Com</option>
            <option value="BBA" ${m.degree === 'BBA' ? 'selected' : ''}>BBA</option>
            <option value="B.A" ${m.degree === 'B.A' ? 'selected' : ''}>B.A</option>
            <option value="M.E / M.Tech" ${m.degree === 'M.E / M.Tech' ? 'selected' : ''}>M.E / M.Tech</option>
            <option value="MCA" ${m.degree === 'MCA' ? 'selected' : ''}>MCA</option>
            <option value="M.Sc" ${m.degree === 'M.Sc' ? 'selected' : ''}>M.Sc</option>
            <option value="MBA" ${m.degree === 'MBA' ? 'selected' : ''}>MBA</option>
            <option value="Other" ${m.degree === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px; color:var(--term-steel); display:block; margin-bottom:3px;">Year</label>
          <select class="form-control" style="font-size:12px; padding:6px 10px; width:100%; box-sizing:border-box;" onchange="editMembersList[${idx}].year = this.value">
            <option value="1st Year" ${m.year === '1st Year' ? 'selected' : ''}>1st Year</option>
            <option value="2nd Year" ${m.year === '2nd Year' ? 'selected' : ''}>2nd Year</option>
            <option value="3rd Year" ${m.year === '3rd Year' || !m.year ? 'selected' : ''}>3rd Year</option>
            <option value="4th Year" ${m.year === '4th Year' ? 'selected' : ''}>4th Year</option>
            <option value="PG / Masters" ${m.year === 'PG / Masters' ? 'selected' : ''}>PG / Masters</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px; color:var(--term-steel); display:block; margin-bottom:3px;">Department</label>
          <input type="text" class="form-control" style="font-size:12px; padding:6px 10px; width:100%; box-sizing:border-box;" value="${escapeHtml(m.department || '')}" onchange="editMembersList[${idx}].department = this.value">
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function addEditMember() {
  if (editMembersList.length >= 5) {
    alert('Maximum 6 total units allowed (1 Leader + 5 Crew Members).');
    return;
  }
  editMembersList.push({
    id: editMembersList.length + 2,
    name: '',
    phone: '',
    email: '',
    gender: '',
    degree: '',
    department: '',
    year: '3rd Year'
  });
  renderEditMembers();
}

function removeEditMember(idx) {
  editMembersList.splice(idx, 1);
  renderEditMembers();
}

async function saveParticipantEdit() {
  if (!currentEditingRegId) return;
  const saveBtn = document.getElementById('btn-save-edit');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'COMMITTING CHANGES & LOGGING AUDIT...';
  }

  const getVal = (id, fallback = '') => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : fallback;
  };

  const payload = {
    team_name: getVal('edit-team-name'),
    college_name: getVal('edit-college-name'),
    track: getVal('edit-track'),
    leader_name: getVal('edit-leader-name'),
    leader_phone: getVal('edit-leader-phone'),
    leader_email: getVal('edit-leader-email'),
    leader_degree: getVal('edit-leader-degree'),
    leader_year: getVal('edit-leader-year', '3rd Year'),
    leader_gender: getVal('edit-leader-gender'),
    leader_department: getVal('edit-leader-dept'),
    leader_id_number: getVal('edit-leader-id'),
    idea_title: getVal('edit-idea-title'),
    idea_summary: getVal('edit-idea-summary'),
    idea_description: getVal('edit-idea-description'),
    idea_ppt_filename: getVal('edit-ppt-filename'),
    idea_ppt_path: getVal('edit-ppt-path'),
    status: getVal('edit-status', 'submitted'),
    payment_status: getVal('edit-payment-status', 'paid'),
    amount_paid: parseInt(getVal('edit-amount-paid', '300'), 10),
    admin_notes: getVal('edit-admin-notes'),
    members: editMembersList
  };

  try {
    const res = await fetch(`/api/admin/registration/${currentEditingRegId}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`[+] SUCCESS: Changes recorded into Supabase!\nAudit Log #${data.log_id || 'N/A'} registered.`);
      window.location.reload();
    } else {
      alert(data.message || 'Failed to save participant changes.');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'SAVE & RECORD CHANGES';
      }
    }
  } catch (err) {
    console.error('Save error:', err);
    alert('Network error while committing participant changes.');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'SAVE & RECORD CHANGES';
    }
  }
}

function closeEditModal() {
  document.getElementById('edit-modal')?.classList.remove('open');
}

// Close modals on clicking background backdrop or pressing Escape
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
  }
});

/* =====================================================================
   AUDIT HISTORY & ROLLBACK (UNDO) LOGIC
   ===================================================================== */
async function openAuditHistoryModal() {
  const modal = document.getElementById('audit-modal');
  if (!modal) return;
  modal.classList.add('open');

  const tbody = document.getElementById('audit-logs-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--term-steel); font-family:var(--font-tactical);">SCANNING AUDIT RECORDS...</td></tr>';
  }

  try {
    const res = await fetch('/api/admin/audit-logs');
    const data = await res.json();
    if (res.ok && data.success) {
      renderAuditLogs(data.logs || []);
    } else {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--term-red);">Failed to load audit logs.</td></tr>';
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--term-red);">Network error loading audit trail.</td></tr>';
  }
}

function renderAuditLogs(logs) {
  const tbody = document.getElementById('audit-logs-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--term-steel);">NO AUDIT HISTORY RECORDED YET.<br><small style="margin-top:6px; display:block;">Edits made from the admin panel are logged here with exact timestamp, diffs, and instant rollback capability.</small></td></tr>';
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.06)';

    // Diff rendering
    const changesObj = log.changes || {};
    const changeKeys = Object.keys(changesObj);
    let diffHtml = '';
    if (changeKeys.length === 0) {
      diffHtml = `<span style="color:var(--term-steel); font-size:11px;">${escapeHtml(log.summary || 'No detailed diff.')}</span>`;
    } else {
      diffHtml = '<div style="display:flex; flex-direction:column; gap:6px; max-width:360px; font-size:11px;">';
      changeKeys.forEach(k => {
        const item = changesObj[k];
        const oldVal = item ? (typeof item.old === 'object' ? JSON.stringify(item.old) : String(item.old || '(empty)')) : '';
        const newVal = item ? (typeof item.new === 'object' ? JSON.stringify(item.new) : String(item.new || '(empty)')) : '';
        const fieldName = k.replace(/_/g, ' ').toUpperCase();
        diffHtml += `
          <div>
            <strong style="color:var(--term-cyan); font-family:var(--font-tactical); font-size:10px;">${fieldName}:</strong><br>
            <span style="color:#ff6b6b; text-decoration:line-through; word-break:break-all;">${escapeHtml(oldVal.substring(0, 50))}${oldVal.length > 50 ? '...' : ''}</span>
            &rarr;
            <span style="color:#00e676; font-weight:600; word-break:break-all;">${escapeHtml(newVal.substring(0, 50))}${newVal.length > 50 ? '...' : ''}</span>
          </div>
        `;
      });
      diffHtml += '</div>';
    }

    const actionBadge = log.action === 'undo'
      ? '<span class="status-badge" style="background:rgba(0,210,255,0.15); color:var(--term-cyan); border:1px solid var(--term-cyan); font-size:10px;">ROLLBACK</span>'
      : '<span class="status-badge" style="background:rgba(255,208,0,0.15); color:var(--term-red); border:1px solid var(--term-red); font-size:10px;">EDIT</span>';

    const undoButtonHtml = log.is_undone
      ? '<span style="color:var(--term-steel); font-size:11px; font-family:var(--font-tactical);">[ROLLED BACK]</span>'
      : log.action === 'undo'
      ? '<span style="color:var(--term-steel); font-size:11px;">-</span>'
      : `<button type="button" class="btn-cyber-outline" style="padding:4px 10px; font-size:11px; color:#ff9f0a; border-color:rgba(255,159,10,0.4);" onclick="undoAuditLog(${log.id}, '${escapeHtml(log.team_name || '')}')">
          &#8630; UNDO
        </button>`;

    tr.innerHTML = `
      <td>#${log.id}</td>
      <td style="white-space:nowrap; font-family:var(--font-tactical); font-size:11px; color:var(--term-steel);">
        ${log.created_at_ist}
      </td>
      <td>
        <strong style="color:#fff;">${escapeHtml(log.team_name)}</strong><br>
        <code style="color:var(--term-red); font-size:11px;">${log.team_code}</code>
      </td>
      <td>${actionBadge}</td>
      <td>${diffHtml}</td>
      <td style="text-align:center;">${undoButtonHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function undoAuditLog(logId, teamName) {
  const confirmMsg = `CONFIRM UNDO / ROLLBACK:\n\nAre you sure you want to rollback edit #${logId} for Team "${teamName}"?\n\nThis will restore all modified fields to their exact state before this edit.\n\nProceed?`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/admin/audit-log/${logId}/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`[+] ${data.message || 'Operation rolled back successfully!'}`);
      window.location.reload();
    } else {
      alert(data.message || 'Failed to rollback edit.');
    }
  } catch (err) {
    console.error('Undo error:', err);
    alert('Network error while processing undo rollback.');
  }
}

function closeAuditModal() {
  document.getElementById('audit-modal')?.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('btn-close-dossier');
  if (closeBtn) closeBtn.addEventListener('click', closeDossier);

  const modal = document.getElementById('dossier-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDossier();
    });
  }

  const editModal = document.getElementById('edit-modal');
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  const auditModal = document.getElementById('audit-modal');
  if (auditModal) {
    auditModal.addEventListener('click', (e) => {
      if (e.target === auditModal) closeAuditModal();
    });
  }
});
