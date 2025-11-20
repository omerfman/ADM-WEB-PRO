/**
 * Firestore Database Schema Documentation
 * ADM İnşaat Proje Yönetim Sistemi
 */

// ========== COLLECTIONS OVERVIEW ==========

/*
 * Collection: companies
 * Description: İnşaat şirketleri
 * Access: Only superadmin
 */
// Example document:
{
  id: "default-company",
  name: "ADM İnşaat A.Ş.",
  description: "Ana kuruluş",
  email: "info@adm-insaat.com",
  phone: "0212 XXX XXXX",
  address: {
    street: "...",
    city: "İstanbul",
    postal: "..."
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  status: "active" // active, inactive
}

/*
 * Collection: users
 * Description: Sistem kullanıcıları
 * Access: Admins can read users in their company
 */
// Example document:
{
  uid: "firebase-uid",
  email: "user@adm.com",
  displayName: "Kullanıcı Adı",
  role: "user", // super_admin, company_admin, user, client
  companyId: "default-company",
  phone: "0555 123 4567",
  status: "active", // active, inactive
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLogin: Timestamp,
  
  // Client-specific fields (only for role="client")
  clientInfo: {
    companyName: "Müşteri Firma A.Ş.",
    contactPerson: "Ahmet Yılmaz",
    taxId: "1234567890",
    address: "..."
  },
  authorizedProjects: ["proj-001", "proj-002"] // Only for clients - project IDs they can view
}

/*
 * Collection: projects
 * Description: İnşaat projeleri
 * Access: Users in same company can read, clients can read only authorized projects
 */
// Example document:
{
  id: "proj-001",
  name: "Yazlık Villa",
  description: "Denize yakın yazlık villa projesi",
  location: "Bodrum, Muğla",
  coordinates: {
    latitude: 37.1882,
    longitude: 27.2287
  },
  companyId: "default-company",
  status: "ongoing", // planning, ongoing, completed, paused
  budget: 500000,
  currency: "TRY",
  startDate: Timestamp,
  endDate: Timestamp, // estimated
  createdBy: "user-uid",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  tags: ["residential", "villa"],
  progress: 45, // percentage 0-100
  
  // Client Access Control
  allowedClients: ["client-uid-1", "client-uid-2"], // UIDs of clients authorized to view this project
  clientVisibility: {
    showBudget: false, // Hide detailed budget from clients
    showPayments: true, // Show payment info to clients
    showStocks: false, // Hide stock details from clients
    showLogs: true // Show construction logs to clients
  }
}

/*
 * Subcollection: projects/{projectId}/logs
 * Description: Proje etkinlik logları
 */
// Example document:
{
  id: "log-001",
  type: "milestone", // milestone, note, warning, error
  title: "Temelleme tamamlandı",
  description: "Temel inşaatı başarıyla tamamlandı",
  createdBy: "user-uid",
  createdAt: Timestamp,
  attachments: ["image-url-1", "image-url-2"]
}

/*
 * Subcollection: projects/{projectId}/stocks
 * Description: Proje malzeme stokları
 */
// Example document:
{
  id: "stock-001",
  name: "Çimento",
  category: "construction", // construction, tools, equipment
  quantity: 500,
  unit: "çuval",
  unitPrice: 45.50,
  supplier: "Lafarge Çimento",
  status: "in_stock", // in_stock, ordered, used
  lastUpdated: Timestamp,
  updatedBy: "user-uid"
}

/*
 * Subcollection: projects/{projectId}/payments
 * Description: Proje ödemeleri
 */
// Example document:
{
  id: "pay-001",
  amount: 50000,
  currency: "TRY",
  description: "Birinci taksit ödenmesi",
  status: "paid", // pending, paid, cancelled, overdue
  paymentMethod: "bank_transfer", // bank_transfer, cash, check
  dueDate: Timestamp,
  paidDate: Timestamp,
  paidBy: "user-uid",
  invoiceNumber: "2025-001",
  notes: "Havale yapıldı"
}

/*
 * Collection: contracts (Root-level)
 * Description: Sözleşme meta verileri
 * Access: Company users can read/write, clients can read if authorized
 */
// Example document:
{
  id: "proj-001", // Same as projectId
  projectId: "proj-001",
  contractNo: "SZL-1732112345678",
  contractAmount: 500000,
  contractType: "fixed", // fixed (götürü), unit (birim fiyat), cost_plus (maliyet+kar)
  
  // Client/Employer Info (İşveren)
  client: {
    name: "Ahmet Yılmaz",
    company: "Yılmaz Holding A.Ş.",
    email: "ahmet@yilmazholding.com",
    phone: "0555 123 4567",
    taxId: "9876543210",
    address: "Beşiktaş, İstanbul"
  },
  
  // Contractor Info (Yüklenici/Firma)
  contractor: {
    name: "ADM İNŞAAT A.Ş.",
    taxId: "1234567890",
    address: "Kadıköy, İstanbul",
    email: "info@adm-insaat.com",
    phone: "0212 XXX XXXX"
  },
  
  // Contract Dates
  contractDate: "2024-01-15", // Sözleşme imza tarihi
  workStartDate: "2024-02-01", // İşe başlama tarihi
  durationDays: 365, // Tamamlanma süresi (gün)
  
  // Penalty & Acceptance
  penaltyRate: 0.001, // Gecikme cezası oranı (‰)
  provisionalAcceptance: 15, // Geçici kabul süresi (gün)
  finalAcceptance: 365, // Kesin kabul süresi (gün)
  
  // Payment Terms
  paymentType: "progress", // progress (hakediş), milestone (kilometre taşı), advance (peşin)
  advancePayment: 20, // Avans oranı (%)
  retentionRate: 10, // Hakediş kesinti oranı (%)
  paymentTerms: "Aylık hakediş sistemli, %10 kesinti...",
  
  // Contract Clauses
  clauses: "1. Genel Şartlar\n2. Özel Şartlar...",
  
  // Status
  status: "draft", // draft, pending, signed, active, completed, terminated
  
  // Signatures
  clientSignedAt: Timestamp, // İşveren imza tarihi
  clientSignedBy: "user-uid",
  contractorSignedAt: Timestamp, // Yüklenici imza tarihi
  contractorSignedBy: "user-uid",
  
  // Activation
  activatedAt: Timestamp, // Sözleşme aktifleştirilme tarihi
  activatedBy: "user-uid",
  
  createdAt: Timestamp,
  createdBy: "user-uid",
  updatedAt: Timestamp,
  updatedBy: "user-uid"
}

/*
 * Collection: contract_items (Root-level)
 * Description: Sözleşme kalemleri (Locked BOQ)
 * Access: Company users can read/write, clients can read if authorized
 */
// Example document:
{
  id: "item-001",
  projectId: "proj-001",
  pozNo: 1,
  name: "Temel Kazısı",
  category: "Hafriyat",
  unit: "m³",
  contractQuantity: 180,
  unitPrice: 45.50,
  description: "Temel kazısı ve hafriyat işleri",
  fromProposalId: "proposal-item-001",
  isLocked: false, // true when contract is signed
  isDeleted: false,
  createdAt: Timestamp,
  createdBy: "user-uid"
}

/*
 * Collection: contract_attachments (Root-level)
 * Description: Sözleşme ekleri (imzalı belgeler, şartnameler vb.)
 * Access: Company users can create/delete, clients can read if authorized
 */
// Example document:
{
  id: "attach-001",
  projectId: "proj-001",
  fileName: "sozlesme_imzali_v1.pdf",
  description: "İmzalı Ana Sözleşme",
  downloadURL: "https://i.ibb.co/xxxxx/sozlesme.pdf",
  deleteURL: "https://ibb.co/xxxxx/delete",
  thumbURL: "https://i.ibb.co/xxxxx/thumb.jpg",
  size: 2048576, // bytes
  contentType: "application/pdf",
  uploadedBy: "user-uid",
  uploadedByEmail: "admin@adm.com",
  uploadedAt: Timestamp,
  provider: "imgbb"
}

/*
 * Subcollection: projects/{projectId}/uploads
 * Description: Proje fotoğraf ve dosyaları (Cloudinary)
 */
// Example document:
{
  id: "upload-001",
  fileName: "project-photo-01.jpg",
  cloudinaryUrl: "https://res.cloudinary.com/...",
  publicId: "adm-construction/projects/proj-001/...",
  size: 2048576, // bytes
  type: "image", // image, video, document
  tags: ["construction-site", "foundation"],
  uploadedAt: Timestamp,
  uploadedBy: "user-uid",
  width: 1920,
  height: 1080
}

/*
 * Collection: audit_logs
 * Description: Sistem audit logları (tüm değişiklikler)
 * Access: Admins can read audit logs for their company
 */
// Example document:
{
  id: "audit-001",
  action: "create", // create, update, delete, login
  entity: "project",
  entityId: "proj-001",
  entityName: "Yazlık Villa",
  companyId: "default-company",
  performedBy: "user-uid",
  performedByName: "Admin User",
  performedByEmail: "admin@adm.com",
  changes: {
    status: { from: "planning", to: "ongoing" },
    progress: { from: 0, to: 45 }
  },
  ipAddress: "192.168.1.1",
  timestamp: Timestamp,
  userAgent: "Mozilla/5.0..."
}

// ========== SECURITY RULES SUMMARY ==========

/*
Roles and Permissions:
- superadmin: Tüm erişim, sistem yönetimi
- admin: Şirket yönetimi, kullanıcı oluşturma, raporlar
- operator: Proje güncellemeleri, log ekleme
- finance: Ödeme yönetimi
- viewer: Sadece okuma erişimi

Access Control:
- Tüm okuma ve yazma işlemleri companyId bazında kontrol edilir
- Role-based access (token.claims.role)
- Document-level security rules

Collections Protected:
- companies: Superadmin only
- users: Admins for their company
- projects: Authenticated users in same company
- audit_logs: Admins for their company, Superadmin for all
*/
