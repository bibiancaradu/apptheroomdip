import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

interface TimeEntry {
  id: string;
  user_name: string;
  date: string;
  hours: number;
  location: string;
  entry_type: string;
  comments?: string;
  status: string;
}

interface EmployeeSummary {
  name: string;
  workHours: number;
  vacationDays: number;
  sickDays: number;
  permitHours: number;
  otherDays: number;
  byLocation: { [key: string]: number };
  entries: TimeEntry[];
}

function getTypeText(type: string): string {
  switch (type) {
    case 'work': return 'Lavoro';
    case 'vacation': return 'Ferie';
    case 'sick': return 'Malattia';
    case 'permit': return 'Permesso';
    case 'other': return 'Altro';
    default: return type;
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'approved': return 'Approvato';
    case 'pending': return 'In attesa';
    case 'rejected': return 'Rifiutato';
    default: return status;
  }
}

export function aggregateByEmployee(entries: TimeEntry[]): { [key: string]: EmployeeSummary } {
  const byEmployee: { [key: string]: EmployeeSummary } = {};

  entries.forEach((entry) => {
    if (!byEmployee[entry.user_name]) {
      byEmployee[entry.user_name] = {
        name: entry.user_name,
        workHours: 0,
        vacationDays: 0,
        sickDays: 0,
        permitHours: 0,
        otherDays: 0,
        byLocation: {},
        entries: [],
      };
    }

    byEmployee[entry.user_name].entries.push(entry);

    if (entry.status === 'approved') {
      if (entry.entry_type === 'work') {
        byEmployee[entry.user_name].workHours += entry.hours;
        byEmployee[entry.user_name].byLocation[entry.location] =
          (byEmployee[entry.user_name].byLocation[entry.location] || 0) + entry.hours;
      } else if (entry.entry_type === 'vacation') {
        byEmployee[entry.user_name].vacationDays += 1;
      } else if (entry.entry_type === 'sick') {
        byEmployee[entry.user_name].sickDays += 1;
      } else if (entry.entry_type === 'permit') {
        byEmployee[entry.user_name].permitHours += entry.hours;
      } else {
        byEmployee[entry.user_name].otherDays += 1;
      }
    }
  });

  return byEmployee;
}

function generateHTML(month: string, byEmployee: { [key: string]: EmployeeSummary }): string {
  const monthDate = new Date(`${month}-01`);
  const monthName = monthDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const generatedDate = new Date().toLocaleDateString('it-IT');

  let employeeSections = '';
  const employees = Object.values(byEmployee).sort((a, b) => a.name.localeCompare(b.name));

  employees.forEach((emp) => {
    const sortedEntries = [...emp.entries].sort((a, b) => a.date.localeCompare(b.date));
    
    let entriesRows = '';
    sortedEntries.forEach((entry) => {
      const statusColor = entry.status === 'approved' ? '#27ae60' : entry.status === 'pending' ? '#f39c12' : '#e74c3c';
      entriesRows += `
        <tr>
          <td>${entry.date}</td>
          <td>${getTypeText(entry.entry_type)}</td>
          <td>${entry.hours}</td>
          <td>${entry.location}</td>
          <td style="color: ${statusColor}; font-weight: 600;">${getStatusText(entry.status)}</td>
          <td>${entry.comments || '-'}</td>
        </tr>
      `;
    });

    let locationBreakdown = '';
    Object.entries(emp.byLocation).forEach(([loc, hrs]) => {
      locationBreakdown += `<div class="loc-item"><span>${loc}:</span> <strong>${hrs}h</strong></div>`;
    });

    employeeSections += `
      <div class="employee-section">
        <h2>${emp.name}</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Ore Lavorate</div>
            <div class="summary-value primary">${emp.workHours}h</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Giorni Ferie</div>
            <div class="summary-value">${emp.vacationDays}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Giorni Malattia</div>
            <div class="summary-value">${emp.sickDays}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Ore Permessi</div>
            <div class="summary-value">${emp.permitHours}h</div>
          </div>
        </div>
        
        ${locationBreakdown ? `
        <div class="location-section">
          <h3>Ore per Sede</h3>
          <div class="locations">${locationBreakdown}</div>
        </div>
        ` : ''}

        <h3>Dettaglio Voci</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Ore</th>
              <th>Sede</th>
              <th>Stato</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${entriesRows}
          </tbody>
        </table>
      </div>
    `;
  });

  const totalWorkHours = employees.reduce((sum, e) => sum + e.workHours, 0);
  const totalVacationDays = employees.reduce((sum, e) => sum + e.vacationDays, 0);
  const totalSickDays = employees.reduce((sum, e) => sum + e.sickDays, 0);
  const totalPermitHours = employees.reduce((sum, e) => sum + e.permitHours, 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 40px;
          color: #333;
          background: #fff;
        }
        .header {
          text-align: center;
          padding-bottom: 24px;
          border-bottom: 3px solid #000;
          margin-bottom: 32px;
        }
        .header h1 {
          font-size: 28px;
          margin: 0 0 8px 0;
          letter-spacing: 4px;
          font-weight: 900;
        }
        .header .subtitle {
          font-size: 12px;
          color: #666;
          letter-spacing: 2px;
          margin-bottom: 16px;
        }
        .header .report-title {
          font-size: 20px;
          color: #000;
          margin-top: 16px;
          font-weight: 600;
        }
        .header .meta {
          font-size: 12px;
          color: #999;
          margin-top: 8px;
        }
        .overall-summary {
          background: #f8f8f8;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 32px;
          border-left: 4px solid #e74c3c;
        }
        .overall-summary h2 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #000;
        }
        .overall-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .overall-item {
          text-align: center;
        }
        .overall-item .label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .overall-item .value {
          font-size: 24px;
          font-weight: 700;
          color: #000;
        }
        .employee-section {
          margin-bottom: 48px;
          page-break-inside: avoid;
        }
        .employee-section h2 {
          font-size: 22px;
          color: #000;
          padding-bottom: 8px;
          border-bottom: 2px solid #e74c3c;
          margin-bottom: 16px;
        }
        .employee-section h3 {
          font-size: 14px;
          color: #666;
          margin: 24px 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .summary-card {
          background: #f8f8f8;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }
        .summary-label {
          font-size: 11px;
          color: #666;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .summary-value {
          font-size: 20px;
          font-weight: 700;
          color: #000;
        }
        .summary-value.primary {
          color: #e74c3c;
        }
        .location-section {
          background: #f0f8ff;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 16px 0;
        }
        .locations {
          display: flex;
          gap: 24px;
        }
        .loc-item {
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        thead {
          background: #000;
        }
        thead th {
          color: #fff;
          padding: 10px 12px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 600;
        }
        tbody tr:nth-child(even) {
          background: #f8f8f8;
        }
        tbody td {
          padding: 8px 12px;
          font-size: 12px;
          border-bottom: 1px solid #eee;
        }
        .footer {
          margin-top: 48px;
          text-align: center;
          font-size: 10px;
          color: #999;
          padding-top: 24px;
          border-top: 1px solid #eee;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>THE ROOM</h1>
        <div class="subtitle">LA BARBERIA DEL GENTILUOMO</div>
        <div class="report-title">Consuntivo Orari Dipendenti</div>
        <div class="meta">Periodo: ${monthName} - Generato il ${generatedDate}</div>
      </div>

      <div class="overall-summary">
        <h2>RIEPILOGO GENERALE</h2>
        <div class="overall-grid">
          <div class="overall-item">
            <div class="label">Ore Totali</div>
            <div class="value">${totalWorkHours}h</div>
          </div>
          <div class="overall-item">
            <div class="label">Giorni Ferie</div>
            <div class="value">${totalVacationDays}</div>
          </div>
          <div class="overall-item">
            <div class="label">Giorni Malattia</div>
            <div class="value">${totalSickDays}</div>
          </div>
          <div class="overall-item">
            <div class="label">Ore Permessi</div>
            <div class="value">${totalPermitHours}h</div>
          </div>
        </div>
      </div>

      ${employeeSections}

      <div class="footer">
        Documento generato automaticamente da THE ROOM BARBERIA - Per uso interno
      </div>
    </body>
    </html>
  `;
}

export async function exportMonthlyReport(
  entries: TimeEntry[],
  month: string
): Promise<void> {
  try {
    const byEmployee = aggregateByEmployee(entries);
    const html = generateHTML(month, byEmployee);

    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
      return;
    }

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Consuntivo ${month}`,
      });
    } else {
      Alert.alert('PDF Generato', `Salvato in: ${uri}`);
    }
  } catch (error) {
    console.error('Error exporting PDF:', error);
    Alert.alert('Errore', 'Impossibile generare il PDF');
  }
}
