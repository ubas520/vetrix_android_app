// Display labels are separate from API status values used for permissions and filters.
export function getPetStatusLabel(status) {
  if (String(status).toLowerCase() === 'pending') return 'Waiting for clinic';
  if (String(status).toLowerCase().replaceAll('_', ' ') === 'in person confirmation') return 'Clinic visit needed';
  return status;
}

export function getVaccineStatus(nextDueDate, today = new Date()) {
  if (!nextDueDate) return 'No due date';
  const due = new Date(`${String(nextDueDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 'No due date';
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const soon = new Date(startOfToday);
  soon.setDate(soon.getDate() + 30);
  if (due < startOfToday) return 'Overdue';
  if (due <= soon) return 'Due soon';
  return 'Upcoming';
}
