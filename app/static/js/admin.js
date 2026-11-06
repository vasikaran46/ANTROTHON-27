/**
 * ANTROTHON'27 - ADMIN DASHBOARD SCRIPT
 * Team Dossier Modal & Status Updates
 */

function openDossier(regData) {
  const modal = document.getElementById('dossier-modal');
  if (!modal) return;

  document.getElementById('dos-team-code').textContent = regData.team_code;
  document.getElementById('dos-team-name').textContent = regData.team_name;
  document.getElementById('dos-track').textContent = regData.track;
  document.getElementById('dos-project-title').textContent = regData.idea_title || regData.project_title || 'N/A';
  document.getElementById('dos-project-synopsis').textContent = regData.idea_summary || regData.project_synopsis || 'No summary provided.';
  
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
  document.getElementById('dos-leader-name').textContent = regData.leader_name;
  document.getElementById('dos-leader-email').textContent = regData.leader_email;
  document.getElementById('dos-leader-phone').textContent = regData.leader_phone;
  document.getElementById('dos-leader-college').textContent = regData.college_name || regData.leader_college;
  document.getElementById('dos-leader-dept').textContent = `${regData.leader_department} (${regData.leader_year})`;

  // Payment
  document.getElementById('dos-payment-status').textContent = (regData.payment_status || '').toUpperCase();
  document.getElementById('dos-payment-id').textContent = regData.razorpay_payment_id || 'N/A';
  document.getElementById('dos-order-id').textContent = regData.razorpay_order_id || 'N/A';

  // Members list
  const membersTbody = document.getElementById('dos-members-tbody');
  membersTbody.innerHTML = '';
  const members = regData.members || [];
  
  if (members.length === 0) {
    membersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--term-steel);">No additional members recorded</td></tr>';
  } else {
    members.forEach((m, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${idx + 2}</td>
        <td><strong>${m.name || '-'}</strong></td>
        <td>${m.email || '-'}<br><small style="color:var(--term-steel);">${m.phone || '-'}</small></td>
        <td>${m.college || '-'}<br><small style="color:var(--term-steel);">${m.department || ''} (${m.year || ''})</small></td>
      `;
      membersTbody.appendChild(tr);
    });
  }

  // Update Status selector
  const statusSelect = document.getElementById('dos-status-select');
  if (statusSelect) {
    statusSelect.value = regData.status || 'submitted';
  }

  // Hook save button
  const saveBtn = document.getElementById('btn-save-dossier-status');
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'COMMITTING...';
    try {
      const res = await fetch(`/api/admin/registration/${regData.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusSelect.value })
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

function openEditModal(regData) {
  currentEditingRegId = regData.id;
  const modal = document.getElementById('edit-modal');
  if (!modal) return;

  document.getElementById('edit-team-code-title').textContent = regData.team_code;
  document.getElementById('edit-team-name').value = regData.team_name || '';
  document.getElementById('edit-college-name').value = regData.college_name || regData.leader_college || '';
  document.getElementById('edit-track').value = regData.track || '';

  // Leader
  document.getElementById('edit-leader-name').value = regData.leader_name || '';
  document.getElementById('edit-leader-phone').value = regData.leader_phone || '';
  document.getElementById('edit-leader-email').value = regData.leader_email || '';
  document.getElementById('edit-leader-dept').value = regData.leader_department || '';
  document.getElementById('edit-leader-year').value = regData.leader_year || '3rd Year';
  document.getElementById('edit-leader-id').value = regData.leader_id_number || '';

  // Idea
  document.getElementById('edit-idea-title').value = regData.idea_title || regData.project_title || '';
  document.getElementById('edit-idea-summary').value = regData.idea_summary || regData.project_synopsis || '';
  document.getElementById('edit-idea-description').value = regData.idea_description || '';
  
  // PPT / Drive URL
  document.getElementById('edit-ppt-filename').value = regData.idea_ppt_filename || '';
  const pptPathInput = document.getElementById('edit-ppt-path');
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

  // Status & Payment
  document.getElementById('edit-status').value = regData.status || 'submitted';
  document.getElementById('edit-payment-status').value = regData.payment_status || 'paid';
  document.getElementById('edit-amount-paid').value = regData.amount_paid || 300;
  document.getElementById('edit-admin-notes').value = regData.admin_notes || '';

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
          <label style="font-size:10px; color:var(--term-steel); display:block; margin-bottom:3px;">Department</label>
          <input type="text" class="form-control" style="font-size:12px; padding:6px 10px; width:100%; box-sizing:border-box;" value="${escapeHtml(m.department || '')}" onchange="editMembersList[${idx}].department = this.value">
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
  saveBtn.disabled = true;
  saveBtn.textContent = 'COMMITTING CHANGES & LOGGING AUDIT...';

  const payload = {
    team_name: document.getElementById('edit-team-name').value.trim(),
    college_name: document.getElementById('edit-college-name').value.trim(),
    track: document.getElementById('edit-track').value,
    leader_name: document.getElementById('edit-leader-name').value.trim(),
    leader_phone: document.getElementById('edit-leader-phone').value.trim(),
    leader_email: document.getElementById('edit-leader-email').value.trim(),
    leader_department: document.getElementById('edit-leader-dept').value.trim(),
    leader_year: document.getElementById('edit-leader-year').value,
    leader_id_number: document.getElementById('edit-leader-id').value.trim(),
    idea_title: document.getElementById('edit-idea-title').value.trim(),
    idea_summary: document.getElementById('edit-idea-summary').value.trim(),
    idea_description: document.getElementById('edit-idea-description').value.trim(),
    idea_ppt_filename: document.getElementById('edit-ppt-filename').value.trim(),
    idea_ppt_path: document.getElementById('edit-ppt-path').value.trim(),
    status: document.getElementById('edit-status').value,
    payment_status: document.getElementById('edit-payment-status').value,
    amount_paid: parseInt(document.getElementById('edit-amount-paid').value || '300', 10),
    admin_notes: document.getElementById('edit-admin-notes').value.trim(),
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
      saveBtn.disabled = false;
      saveBtn.textContent = 'SAVE & RECORD CHANGES';
    }
  } catch (err) {
    console.error('Save error:', err);
    alert('Network error while committing participant changes.');
    saveBtn.disabled = false;
    saveBtn.textContent = 'SAVE & RECORD CHANGES';
  }
}

function closeEditModal() {
  document.getElementById('edit-modal')?.classList.remove('open');
}

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
