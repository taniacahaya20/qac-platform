import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { TestCase } from '~/stores/cases'

export function useCaseExport() {
  function formatSteps(steps: any): string {
    if (!steps || !Array.isArray(steps)) return '-'
    return steps
      .map((s, i) => `${i + 1}. ${s.content}${s.expected ? ` (Expected: ${s.expected})` : ''}`)
      .join('\n')
  }

  function getExportRows(caseList: TestCase[]) {
    return caseList.map((c, index) => ({
      No: index + 1,
      'TestCase ID': c.code,
      Modul: c.moduleName || c.moduleCode || '-',
      Actor: c.actor || '-',
      Condition: c.condition || '-',
      'Judul Kasus Uji': c.title,
      Deskripsi: c.description || '-',
      'Pre-Condition': c.preconditions || '-',
      'Scenario / Steps': formatSteps(c.steps),
      'Expected Result': c.expectedResult || '-',
      'Test Data': c.testData || '-',
      'Status Eksekusi': c.statusData || 'Untested',
      Notes: c.notes || '-',
    }))
  }

  // 1. Export Excel (.xlsx)
  function exportToExcel(moduleName: string, caseList: TestCase[]) {
    const data = getExportRows(caseList)
    const worksheet = XLSX.utils.json_to_sheet(data)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 14 }, // TestCase ID
      { wch: 20 }, // Modul
      { wch: 14 }, // Actor
      { wch: 16 }, // Condition
      { wch: 30 }, // Judul
      { wch: 25 }, // Deskripsi
      { wch: 25 }, // Pre-condition
      { wch: 40 }, // Steps
      { wch: 25 }, // Expected Result
      { wch: 20 }, // Test Data
      { wch: 16 }, // Status Eksekusi
      { wch: 25 }, // Notes
    ]

    const workbook = XLSX.utils.book_new()
    const sheetName = (moduleName.replace(/[\\/*?:[\]]/g, '').slice(0, 30)) || 'TestCases'
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    const filename = `TestCases_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  // 2. Export CSV (.csv)
  function exportToCsv(moduleName: string, caseList: TestCase[]) {
    const data = getExportRows(caseList)
    const worksheet = XLSX.utils.json_to_sheet(data)
    const csvContent = XLSX.utils.sheet_to_csv(worksheet)

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `TestCases_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 3. Export PDF (.pdf)
  function exportToPdf(moduleName: string, caseList: TestCase[]) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Header title
    doc.setFontSize(16)
    doc.setTextColor(30, 41, 59)
    doc.text(`Daftar Test Case — Modul: ${moduleName}`, 14, 15)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Total Kasus Uji: ${caseList.length} | Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, 14, 22)

    const tableHeaders = [
      ['ID', 'Actor', 'Condition', 'Judul Kasus Uji', 'Pre-Condition', 'Scenario / Steps', 'Expected Result', 'Status']
    ]

    const tableBody = caseList.map((c) => [
      c.code,
      c.actor || '-',
      c.condition || '-',
      c.title,
      c.preconditions || '-',
      formatSteps(c.steps),
      c.expectedResult || '-',
      c.statusData || 'Pass',
    ])

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 26,
      theme: 'grid',
      headStyles: {
        fillColor: [14, 116, 144], // primary cyan/teal
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' }, // ID
        1: { cellWidth: 18 },                    // Actor
        2: { cellWidth: 20 },                    // Condition
        3: { cellWidth: 50 },                    // Judul
        4: { cellWidth: 35 },                    // Pre-condition
        5: { cellWidth: 65 },                    // Steps
        6: { cellWidth: 40 },                    // Expected Result
        7: { cellWidth: 18 },                    // Status
      },
      margin: { left: 14, right: 14 },
    })

    const filename = `TestCases_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  }

  return {
    exportToExcel,
    exportToCsv,
    exportToPdf,
  }
}
