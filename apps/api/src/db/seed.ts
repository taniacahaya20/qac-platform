import { db } from './index'
import {
  users, projects, projectMembers, suites, sections, statuses,
  cases, milestones, testRuns, tests, results, apiKeys,
} from './schema'
import { sql } from 'drizzle-orm'

async function nextCaseCode(): Promise<string> {
  const result: any = await db.execute(sql`SELECT nextval('cases_code_seq') as val`)
  const rows = Array.isArray(result) ? result : (result?.rows ?? [])
  return `C${String(rows[0]?.val ?? 1).padStart(4, '0')}`
}

async function hashApiKey(key: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

console.log('🌱 Starting seed...')

// Statuses
await db.insert(statuses).values([
  { id: 1, name: 'Passed', label: 'Lulus', color: '#22c55e', isFinal: true, isDefault: false, isSystem: true, sortOrder: 1 },
  { id: 2, name: 'Failed', label: 'Gagal', color: '#ef4444', isFinal: true, isDefault: false, isSystem: true, sortOrder: 2 },
  { id: 3, name: 'Blocked', label: 'Diblokir', color: '#6b7280', isFinal: false, isDefault: false, isSystem: true, sortOrder: 3 },
  { id: 4, name: 'Retest', label: 'Perlu Diulang', color: '#eab308', isFinal: false, isDefault: false, isSystem: true, sortOrder: 4 },
  { id: 5, name: 'Untested', label: 'Belum Diuji', color: '#d1d5db', isFinal: false, isDefault: true, isSystem: true, sortOrder: 5 },
  { id: 6, name: 'Skipped', label: 'Dilewati', color: '#a855f7', isFinal: false, isDefault: false, isSystem: true, sortOrder: 6 },
]).onConflictDoNothing()

// Users
const adminPass = await Bun.password.hash('admin123')
const testerPass = await Bun.password.hash('tester123')
const leadPass = await Bun.password.hash('lead123')

const [adminUser] = await db.insert(users).values({ name: 'Admin QAC', email: 'admin@qac.local', passwordHash: adminPass, role: 'admin', isActive: true }).returning()
const [tester1] = await db.insert(users).values({ name: 'Budi Santoso', email: 'tester1@qac.local', passwordHash: testerPass, role: 'tester', isActive: true }).returning()
const [tester2] = await db.insert(users).values({ name: 'Siti Rahma', email: 'tester2@qac.local', passwordHash: testerPass, role: 'tester', isActive: true }).returning()
const [leadUser] = await db.insert(users).values({ name: 'Ari Wibowo', email: 'lead@qac.local', passwordHash: leadPass, role: 'lead', isActive: true }).returning()

// API Key
const demoApiKey = 'qac_demo_key_12345678901234567890'
await db.insert(apiKeys).values({ userId: adminUser.id, name: 'Demo CI Key', hashedKey: await hashApiKey(demoApiKey) })
console.log(`🔑 Demo API Key: ${demoApiKey}`)

// Project
const [project] = await db.insert(projects).values({
  name: 'TMS Karlo',
  description: 'Automation Testing E2E untuk aplikasi TMS Karlo (approval.gondowangi.com)',
  announcement: 'Selamat datang di proyek QA untuk TMS Karlo. Pastikan semua test case critical sudah diverifikasi sebelum setiap release.',
  createdBy: adminUser.id,
}).returning()

await db.insert(projectMembers).values([
  { projectId: project.id, userId: leadUser.id, role: 'lead' },
  { projectId: project.id, userId: tester1.id, role: 'tester' },
  { projectId: project.id, userId: tester2.id, role: 'tester' },
])

// Suite
const [suite] = await db.insert(suites).values({ projectId: project.id, name: 'Master Suite', description: 'Suite utama TMS Karlo', isDefault: true }).returning()

// Sections
const [secLogin] = await db.insert(sections).values({ suiteId: suite.id, name: 'Login & Autentikasi', sortOrder: 1, depth: 0 }).returning()
const [secOrder] = await db.insert(sections).values({ suiteId: suite.id, name: 'Order Management', sortOrder: 2, depth: 0 }).returning()
const [secShipment] = await db.insert(sections).values({ suiteId: suite.id, name: 'Shipment & Pengiriman', sortOrder: 3, depth: 0 }).returning()
const [secFleet] = await db.insert(sections).values({ suiteId: suite.id, name: 'Fleet Management', sortOrder: 4, depth: 0 }).returning()
const [secDriver] = await db.insert(sections).values({ suiteId: suite.id, name: 'Driver & Pengemudi', sortOrder: 5, depth: 0 }).returning()
const [secInvoice] = await db.insert(sections).values({ suiteId: suite.id, name: 'Invoice & Tagihan', sortOrder: 6, depth: 0 }).returning()

const [secLoginBasic] = await db.insert(sections).values({ suiteId: suite.id, parentId: secLogin.id, name: 'Login Dasar', sortOrder: 1, depth: 1 }).returning()
const [secLoginSSO] = await db.insert(sections).values({ suiteId: suite.id, parentId: secLogin.id, name: 'SSO & Integrasi', sortOrder: 2, depth: 1 }).returning()
const [secOrderCreate] = await db.insert(sections).values({ suiteId: suite.id, parentId: secOrder.id, name: 'Pembuatan Order', sortOrder: 1, depth: 1 }).returning()
const [secOrderEdit] = await db.insert(sections).values({ suiteId: suite.id, parentId: secOrder.id, name: 'Edit & Pembatalan', sortOrder: 2, depth: 1 }).returning()

// Cases helper
type CaseInput = {
  sectionId: string
  title: string
  type?: 'Functional' | 'Regression' | 'Smoke' | 'Security' | 'Performance' | 'Usability' | 'Other'
  priority?: 'Critical' | 'High' | 'Medium' | 'Low'
  template?: 'text' | 'steps' | 'exploratory'
  preconditions?: string
  steps?: Array<{ content: string; expected: string }>
  expectedResult?: string
  automationStatus?: 'manual' | 'automated' | 'to_be_automated'
  automationKey?: string
  estimate?: number
  refs?: string
}

async function createCase(input: CaseInput) {
  const code = await nextCaseCode()
  const [c] = await db.insert(cases).values({
    code,
    sectionId: input.sectionId,
    title: input.title,
    type: input.type ?? 'Functional',
    priority: input.priority ?? 'Medium',
    template: input.template ?? 'steps',
    preconditions: input.preconditions,
    steps: input.steps,
    expectedResult: input.expectedResult,
    automationStatus: input.automationStatus ?? 'manual',
    automationKey: input.automationKey,
    estimate: input.estimate,
    refs: input.refs,
    createdBy: adminUser.id,
    updatedBy: adminUser.id,
  }).returning()
  return c
}

// Login cases
const caseLogin1 = await createCase({ sectionId: secLoginBasic.id, title: 'Login berhasil dengan kredensial valid', type: 'Smoke', priority: 'Critical', automationStatus: 'automated', automationKey: 'TC-001', estimate: 60, preconditions: 'User terdaftar dan aktif di sistem', steps: [{ content: 'Buka halaman login approval.gondowangi.com/login', expected: 'Halaman login tampil dengan form email dan password' }, { content: 'Masukkan email dan password yang valid', expected: 'Field terisi dengan benar' }, { content: 'Klik tombol Login', expected: 'User berhasil masuk ke dashboard' }] })
const caseLogin2 = await createCase({ sectionId: secLoginBasic.id, title: 'Login gagal dengan password salah', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-002', estimate: 45, steps: [{ content: 'Buka halaman login', expected: 'Halaman login tampil' }, { content: 'Masukkan email valid dan password salah', expected: 'Field terisi' }, { content: 'Klik tombol Login', expected: 'Muncul pesan error: "Password tidak valid"' }] })
const caseLogin3 = await createCase({ sectionId: secLoginBasic.id, title: 'Login gagal dengan email tidak terdaftar', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-003', estimate: 45 })
const caseLogin4 = await createCase({ sectionId: secLoginBasic.id, title: 'Validasi field email wajib diisi', type: 'Functional', priority: 'Medium', automationStatus: 'to_be_automated', estimate: 30 })
const caseLogin5 = await createCase({ sectionId: secLoginBasic.id, title: 'Session tetap valid setelah refresh browser', type: 'Functional', priority: 'Medium', automationStatus: 'manual', estimate: 60 })
const caseLogin6 = await createCase({ sectionId: secLoginBasic.id, title: 'Logout berhasil dan redirect ke halaman login', type: 'Smoke', priority: 'High', automationStatus: 'automated', automationKey: 'TC-004', estimate: 30 })
await createCase({ sectionId: secLoginSSO.id, title: 'Login via Google SSO berhasil', type: 'Functional', priority: 'Low', automationStatus: 'manual', estimate: 120 })

// Order cases
const caseOrder1 = await createCase({ sectionId: secOrderCreate.id, title: 'Buat order baru dengan semua field wajib', type: 'Smoke', priority: 'Critical', automationStatus: 'automated', automationKey: 'TC-010', estimate: 180, steps: [{ content: 'Login sebagai dispatcher', expected: 'Berhasil login' }, { content: 'Navigasi ke menu Order → Buat Baru', expected: 'Form buat order tampil' }, { content: 'Isi semua field wajib', expected: 'Field terisi' }, { content: 'Klik Simpan', expected: 'Order berhasil dibuat' }] })
const caseOrder2 = await createCase({ sectionId: secOrderCreate.id, title: 'Validasi field wajib pada form order', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-011', estimate: 90 })
await createCase({ sectionId: secOrderCreate.id, title: 'Upload dokumen pendukung saat buat order', type: 'Functional', priority: 'Medium', automationStatus: 'to_be_automated', estimate: 120 })
await createCase({ sectionId: secOrderCreate.id, title: 'Duplikat order dari order yang sudah ada', type: 'Functional', priority: 'Low', automationStatus: 'manual', estimate: 90 })
const caseOrder5 = await createCase({ sectionId: secOrderEdit.id, title: 'Edit order yang masih berstatus Draft', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-012', estimate: 120 })
const caseOrder6 = await createCase({ sectionId: secOrderEdit.id, title: 'Batalkan order yang berstatus Pending', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-013', estimate: 90, refs: 'JIRA-101' })
await createCase({ sectionId: secOrderEdit.id, title: 'Tidak bisa edit order yang sudah Dikirim', type: 'Functional', priority: 'Medium', automationStatus: 'manual', estimate: 60 })

// Shipment cases
const caseShip1 = await createCase({ sectionId: secShipment.id, title: 'Assign driver ke shipment baru', type: 'Functional', priority: 'Critical', automationStatus: 'automated', automationKey: 'TC-020', estimate: 150 })
const caseShip2 = await createCase({ sectionId: secShipment.id, title: 'Update status shipment ke In Transit', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-021', estimate: 90 })
await createCase({ sectionId: secShipment.id, title: 'Konfirmasi pengiriman dengan upload POD', type: 'Functional', priority: 'High', automationStatus: 'to_be_automated', estimate: 180, refs: 'JIRA-205' })
await createCase({ sectionId: secShipment.id, title: 'Filter shipment berdasarkan status', type: 'Functional', priority: 'Medium', automationStatus: 'manual', estimate: 60 })
await createCase({ sectionId: secShipment.id, title: 'Export daftar shipment ke Excel', type: 'Functional', priority: 'Low', automationStatus: 'manual', estimate: 60 })
await createCase({ sectionId: secShipment.id, title: 'Tracking real-time posisi driver', type: 'Performance', priority: 'Medium', automationStatus: 'manual', estimate: 300 })
await createCase({ sectionId: secShipment.id, title: 'Notifikasi email saat shipment delivered', type: 'Functional', priority: 'Medium', automationStatus: 'to_be_automated', estimate: 120 })

// Fleet cases
const caseFleet1 = await createCase({ sectionId: secFleet.id, title: 'Tambah kendaraan baru ke armada', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-030', estimate: 120 })
await createCase({ sectionId: secFleet.id, title: 'Edit informasi kendaraan (plat nomor, kapasitas)', type: 'Functional', priority: 'Medium', automationStatus: 'manual', estimate: 90 })
await createCase({ sectionId: secFleet.id, title: 'Non-aktifkan kendaraan yang rusak', type: 'Functional', priority: 'Medium', automationStatus: 'manual', estimate: 60 })
const caseFleet4 = await createCase({ sectionId: secFleet.id, title: 'Validasi kendaraan tidak bisa diassign jika tidak aktif', type: 'Regression', priority: 'High', automationStatus: 'automated', automationKey: 'TC-031', estimate: 90 })
await createCase({ sectionId: secFleet.id, title: 'Riwayat perawatan kendaraan tercatat', type: 'Functional', priority: 'Low', automationStatus: 'manual', estimate: 120 })

// Driver cases
const caseDriver1 = await createCase({ sectionId: secDriver.id, title: 'Tambah driver baru dengan dokumen lengkap', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-040', estimate: 180 })
await createCase({ sectionId: secDriver.id, title: 'Driver menerima notifikasi penugasan', type: 'Functional', priority: 'High', automationStatus: 'to_be_automated', estimate: 120 })
const caseDriver3 = await createCase({ sectionId: secDriver.id, title: 'Validasi SIM driver harus masih berlaku', type: 'Regression', priority: 'Critical', automationStatus: 'automated', automationKey: 'TC-041', estimate: 90, refs: 'JIRA-310' })
await createCase({ sectionId: secDriver.id, title: 'Dashboard performa driver (jumlah trip, rating)', type: 'Functional', priority: 'Medium', automationStatus: 'manual', estimate: 180 })
const caseDriver5 = await createCase({ sectionId: secDriver.id, title: 'Driver tidak bisa login jika dinonaktifkan', type: 'Security', priority: 'High', automationStatus: 'automated', automationKey: 'TC-042', estimate: 60 })

// Invoice cases
const caseInv1 = await createCase({ sectionId: secInvoice.id, title: 'Generate invoice otomatis setelah shipment selesai', type: 'Functional', priority: 'Critical', automationStatus: 'automated', automationKey: 'TC-050', estimate: 180, refs: 'JIRA-401' })
const caseInv2 = await createCase({ sectionId: secInvoice.id, title: 'Invoice berisi detail biaya yang benar', type: 'Functional', priority: 'High', automationStatus: 'automated', automationKey: 'TC-051', estimate: 120 })
await createCase({ sectionId: secInvoice.id, title: 'Download invoice dalam format PDF', type: 'Functional', priority: 'Medium', automationStatus: 'to_be_automated', estimate: 90 })
await createCase({ sectionId: secInvoice.id, title: 'Tandai invoice sebagai Lunas', type: 'Functional', priority: 'High', automationStatus: 'manual', estimate: 60 })
await createCase({ sectionId: secInvoice.id, title: 'Filter invoice berdasarkan status pembayaran', type: 'Functional', priority: 'Medium', automationStatus: 'manual', estimate: 60 })
await createCase({ sectionId: secInvoice.id, title: 'Kalkulasi PPN pada invoice otomatis', type: 'Functional', priority: 'High', automationStatus: 'to_be_automated', estimate: 120, refs: 'JIRA-402' })
const caseInv7 = await createCase({ sectionId: secInvoice.id, title: 'Invoice tidak bisa dihapus jika sudah Lunas', type: 'Regression', priority: 'Critical', automationStatus: 'automated', automationKey: 'TC-052', estimate: 60 })

// Milestones
const [milestone1] = await db.insert(milestones).values({ projectId: project.id, name: 'Sprint 1 - Core Flow', description: 'Mencakup fitur dasar: Login, Order, Shipment', startDate: '2024-11-01', dueDate: '2024-11-30', isCompleted: true, completedAt: new Date('2024-11-28') }).returning()
const [milestone2] = await db.insert(milestones).values({ projectId: project.id, name: 'Sprint 2 - Finance & Fleet', description: 'Invoice, Fleet Management, Driver Management', startDate: '2024-12-01', dueDate: '2024-12-31', isCompleted: false }).returning()

// Test Runs
const [run1] = await db.insert(testRuns).values({ projectId: project.id, milestoneId: milestone1.id, name: 'Smoke Test - Sprint 1', description: 'Verifikasi fitur critical sebelum release Sprint 1', assignedTo: tester1.id, includeAll: false, isCompleted: true, completedAt: new Date('2024-11-25'), source: 'manual', createdBy: leadUser.id }).returning()
const [run2] = await db.insert(testRuns).values({ projectId: project.id, milestoneId: milestone2.id, name: 'Regression Test - Sprint 2', description: 'Full regression untuk Sprint 2', assignedTo: tester2.id, includeAll: false, isCompleted: false, source: 'manual', createdBy: leadUser.id }).returning()
const [run3] = await db.insert(testRuns).values({ projectId: project.id, name: 'Automation Run - CI/CD #42', description: 'Automated E2E dari pipeline CI/CD', includeAll: false, isCompleted: true, completedAt: new Date('2024-12-01'), source: 'automation', ciInfo: { branch: 'main', commit: 'abc123def456', buildNo: '42', pipelineUrl: 'https://github.com/karlo/tms/actions/runs/42', environment: 'staging' }, createdBy: adminUser.id }).returning()

// Tests and Results for Run 1 (Smoke)
const smokePairs = [
  [caseLogin1, 1], [caseLogin2, 1], [caseLogin3, 1], [caseLogin6, 1],
  [caseOrder1, 1], [caseOrder2, 2], [caseShip1, 1], [caseShip2, 1],
] as const
for (let i = 0; i < smokePairs.length; i++) {
  const [c, statusId] = smokePairs[i]
  const [t] = await db.insert(tests).values({ runId: run1.id, caseId: c.id, caseSnapshot: c as unknown as Record<string, unknown>, sortOrder: i }).returning()
  await db.insert(results).values({ testId: t.id, statusId, comment: statusId === 1 ? 'Berhasil dieksekusi tanpa masalah.' : 'Validasi field gagal di environment staging.', elapsed: Math.floor(Math.random() * 180) + 30, createdBy: tester1.id })
}

// Tests and Results for Run 2 (Regression)
const regressionPairs = [
  [caseLogin1, 1], [caseLogin2, 1], [caseLogin4, 1], [caseLogin5, 3],
  [caseOrder1, 1], [caseOrder5, 1], [caseOrder6, 2], [caseShip1, 4],
  [caseShip2, 1], [caseFleet1, 1], [caseFleet4, 2], [caseDriver3, 5],
] as const
for (let i = 0; i < regressionPairs.length; i++) {
  const [c, statusId] = regressionPairs[i]
  const [t] = await db.insert(tests).values({ runId: run2.id, caseId: c.id, assignedTo: i % 2 === 0 ? tester1.id : tester2.id, caseSnapshot: c as unknown as Record<string, unknown>, sortOrder: i }).returning()
  if (statusId !== 5) {
    await db.insert(results).values({ testId: t.id, statusId, comment: statusId === 1 ? 'OK' : statusId === 2 ? 'Bug ditemukan, raised ke JIRA-500' : statusId === 3 ? 'Menunggu fix dari dev' : 'Perlu diuji ulang', elapsed: Math.floor(Math.random() * 300) + 60, defects: statusId === 2 ? 'JIRA-500' : undefined, createdBy: i % 2 === 0 ? tester1.id : tester2.id })
  }
}

// Tests and Results for Run 3 (Automation)
const autoPairs = [
  [caseLogin1, 1], [caseLogin2, 1], [caseLogin3, 1], [caseLogin6, 1],
  [caseOrder1, 1], [caseOrder2, 1], [caseOrder5, 2], [caseOrder6, 1],
  [caseShip1, 1], [caseShip2, 1], [caseFleet1, 1], [caseFleet4, 1],
  [caseDriver3, 1], [caseDriver5, 1], [caseInv1, 2], [caseInv2, 1], [caseInv7, 1],
] as const
for (let i = 0; i < autoPairs.length; i++) {
  const [c, statusId] = autoPairs[i]
  const [t] = await db.insert(tests).values({ runId: run3.id, caseId: c.id, caseSnapshot: c as unknown as Record<string, unknown>, sortOrder: i }).returning()
  await db.insert(results).values({ testId: t.id, statusId, isAutomated: true, elapsed: Math.floor(Math.random() * 15000) + 1000, errorMessage: statusId === 2 ? 'TimeoutError: Waiting for locator("[data-testid=submit-btn]") to be visible' : undefined, stackTrace: statusId === 2 ? 'TimeoutError: Waiting for locator...\n    at /app/tests/order.spec.ts:45:24\n    at async Page.evaluate' : undefined, version: 'v1.2.3-staging', createdBy: adminUser.id })
}

console.log('✅ Seed selesai!')
console.log('📧 Admin: admin@qac.local / admin123')
console.log('📧 Lead: lead@qac.local / lead123')
console.log('📧 Tester 1: tester1@qac.local / tester123')
console.log('📧 Tester 2: tester2@qac.local / tester123')

// suppress unused variable warnings for caseDriver1 and milestone2
void caseDriver1
void milestone2
