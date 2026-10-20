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
  if (regData.idea_ppt_filename) {
    if (pptFilenameEl) pptFilenameEl.textContent = regData.idea_ppt_filename;
    if (pptDownloadLink) {
      pptDownloadLink.style.display = 'inline-block';
      pptDownloadLink.href = regData.idea_ppt_path || '#';
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

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('btn-close-dossier');
  if (closeBtn) closeBtn.addEventListener('click', closeDossier);

  const modal = document.getElementById('dossier-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeDossier();
    });
  }
});
