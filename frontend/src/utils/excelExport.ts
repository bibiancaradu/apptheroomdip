import * as XLSX from 'xlsx';
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

function getTypeText(type: string): string {
  switch (type) {
    case 'work': return 'Lavoro';
    case 'vacation': return 'Ferie';
    case 'sick': return 'Malattia';
    case 'permit': return 'Permesso';
    case 'holiday': return 'Festivita';
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

interface EmployeeSummary {
  name: string;
  workHours: number;
  vacationDays: number;
  sickDays: number;
  permitHours: number;
  holidayDays: number;
  otherDays: number;
  costabissaraHours: number;
  vicenzaEstHours: number;
}

export async function exportMonthlyExcel(
  entries: TimeEntry[],
  month: string
): Promise<void> {
  try {
    // Aggregate by employee
    const summaryMap: { [key: string]: EmployeeSummary } = {};

    entries.forEach((entry) => {
      if (!summaryMap[entry.user_name]) {
        summaryMap[entry.user_name] = {
          name: entry.user_name,
          workHours: 0,
          vacationDays: 0,
          sickDays: 0,
          permitHours: 0,
          holidayDays: 0,
          otherDays: 0,
          costabissaraHours: 0,
          vicenzaEstHours: 0,
        };
      }

      if (entry.status === 'approved') {
        const s = summaryMap[entry.user_name];
        if (entry.entry_type === 'work') {
          s.workHours += entry.hours;
          if (entry.location === 'Costabissara') s.costabissaraHours += entry.hours;
          else if (entry.location === 'Vicenza Est') s.vicenzaEstHours += entry.hours;
        } else if (entry.entry_type === 'vacation') {
          s.vacationDays += 1;
        } else if (entry.entry_type === 'sick') {
          s.sickDays += 1;
        } else if (entry.entry_type === 'permit') {
          s.permitHours += entry.hours;
        } else if (entry.entry_type === 'holiday') {
          s.holidayDays += 1;
        } else {
          s.otherDays += 1;
        }
      }
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // ============ SHEET 1: RIEPILOGO ============
    const summaryData: any[][] = [
      ['THE ROOM BARBERIA - Consuntivo Orari'],
      [`Periodo: ${month}`],
      [`Generato il: ${new Date().toLocaleDateString('it-IT')}`],
      [],
      [
        'Dipendente',
        'Ore Lavorate',
        'Ore Costabissara',
        'Ore Vicenza Est',
        'Giorni Ferie',
        'Giorni Malattia',
        'Ore Permessi',
        'Giorni Festivita',
        'Altro',
      ],
    ];

    const employees = Object.values(summaryMap).sort((a, b) => a.name.localeCompare(b.name));
    let totalWork = 0, totalCB = 0, totalVE = 0, totalVac = 0, totalSick = 0, totalPermit = 0, totalHoliday = 0, totalOther = 0;

    employees.forEach((emp) => {
      summaryData.push([
        emp.name,
        emp.workHours,
        emp.costabissaraHours,
        emp.vicenzaEstHours,
        emp.vacationDays,
        emp.sickDays,
        emp.permitHours,
        emp.holidayDays,
        emp.otherDays,
      ]);
      totalWork += emp.workHours;
      totalCB += emp.costabissaraHours;
      totalVE += emp.vicenzaEstHours;
      totalVac += emp.vacationDays;
      totalSick += emp.sickDays;
      totalPermit += emp.permitHours;
      totalHoliday += emp.holidayDays;
      totalOther += emp.otherDays;
    });

    summaryData.push([]);
    summaryData.push([
      'TOTALE',
      totalWork,
      totalCB,
      totalVE,
      totalVac,
      totalSick,
      totalPermit,
      totalHoliday,
      totalOther,
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    ws1['!cols'] = [
      { wch: 20 }, // Dipendente
      { wch: 14 }, // Ore Lavorate
      { wch: 18 }, // Costabissara
      { wch: 18 }, // Vicenza Est
      { wch: 12 }, // Ferie
      { wch: 14 }, // Malattia
      { wch: 14 }, // Permessi
      { wch: 16 }, // Festivita
      { wch: 10 }, // Altro
    ];

    XLSX.utils.book_append_sheet(wb, ws1, 'Riepilogo');

    // ============ SHEET 2: DETTAGLIO ============
    const detailData: any[][] = [
      ['Data', 'Dipendente', 'Tipo', 'Ore', 'Sede', 'Stato', 'Note'],
    ];

    const sortedEntries = [...entries].sort((a, b) => {
      if (a.user_name !== b.user_name) return a.user_name.localeCompare(b.user_name);
      return a.date.localeCompare(b.date);
    });

    sortedEntries.forEach((entry) => {
      detailData.push([
        entry.date,
        entry.user_name,
        getTypeText(entry.entry_type),
        entry.hours,
        entry.location,
        getStatusText(entry.status),
        entry.comments || '',
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(detailData);
    ws2['!cols'] = [
      { wch: 12 }, // Data
      { wch: 18 }, // Dipendente
      { wch: 12 }, // Tipo
      { wch: 8 },  // Ore
      { wch: 16 }, // Sede
      { wch: 14 }, // Stato
      { wch: 30 }, // Note
    ];

    XLSX.utils.book_append_sheet(wb, ws2, 'Dettaglio');

    // ============ SHEET 3: PER SEDE ============
    const locationData: any[][] = [
      ['Dipendente', 'Costabissara', 'Vicenza Est', 'Totale'],
    ];
    employees.forEach((emp) => {
      locationData.push([
        emp.name,
        emp.costabissaraHours,
        emp.vicenzaEstHours,
        emp.costabissaraHours + emp.vicenzaEstHours,
      ]);
    });
    locationData.push([]);
    locationData.push(['TOTALE', totalCB, totalVE, totalCB + totalVE]);

    const ws3 = XLSX.utils.aoa_to_sheet(locationData);
    ws3['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Per Sede');

    // Generate Excel file
    const fileName = `consuntivo_${month}.xlsx`;

    if (Platform.OS === 'web') {
      // Generate and trigger download
      XLSX.writeFile(wb, fileName);
    } else {
      // Mobile: not implemented, but works on web (main use case)
      Alert.alert('Info', 'Export Excel disponibile solo da browser web');
    }
  } catch (error) {
    console.error('Error exporting Excel:', error);
    if (Platform.OS === 'web') {
      window.alert('Errore durante la generazione del file Excel');
    } else {
      Alert.alert('Errore', 'Impossibile generare il file Excel');
    }
  }
}
